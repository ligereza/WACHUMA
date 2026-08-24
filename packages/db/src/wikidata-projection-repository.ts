import type { Sql } from "postgres";

export interface WikidataProjectionSourceRecord {
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: string;
}

export interface WikidataProjectionInput {
  taxon: {
    sourceRecordId: string;
    sourceUrl: string;
    scientificName: string;
    rank: string;
    taxonomicStatus: string;
    externalIdentifiers: Array<{
      property: string;
      namespace: string;
      identifier: string;
      canonicalUrl: string;
    }>;
  };
  itemRecord: WikidataProjectionSourceRecord;
  sourceRecordIds: Record<string, string>;
}

export interface WikidataProjectionResult {
  taxonPublicId: string;
  biologicalEntityPublicId: string;
  identifiers: number;
  linkedExistingTaxon: boolean;
}

function entityTypeForRank(rank: string): string {
  if (rank === "subspecies") return "subspecies";
  if (rank === "variety" || rank === "form") return "variety";
  if (rank === "hybrid") return "hybrid";
  return "species";
}

export function createWikidataProjectionRepository(sql: Sql) {
  return {
    async persistSnapshot(
      input: WikidataProjectionInput,
    ): Promise<WikidataProjectionResult> {
      return sql.begin(async (transaction) => {
        const itemSourceRecordId =
          input.sourceRecordIds[input.itemRecord.sourceRecordId];
        if (!itemSourceRecordId) {
          throw new Error("Wikidata item source record was not persisted");
        }

        const [source] = await transaction<{ id: string }[]>`
          INSERT INTO sources (
            public_id, source_type, title, citation, url, license_uri, attribution,
            accessed_at
          ) VALUES (
            'source-wikidata',
            'external_dataset',
            'Wikidata · claims estructurados e identificadores',
            'Wikidata API; claims estructurados CC0; revisión taxonómica pendiente',
            'https://www.wikidata.org',
            'https://creativecommons.org/publicdomain/zero/1.0/',
            'Wikidata; identificadores, URL y fecha conservados por source_record',
            ${input.itemRecord.retrievedAt}
          )
          ON CONFLICT (public_id) DO UPDATE SET
            title = EXCLUDED.title,
            citation = EXCLUDED.citation,
            url = EXCLUDED.url,
            license_uri = EXCLUDED.license_uri,
            attribution = EXCLUDED.attribution,
            accessed_at = EXCLUDED.accessed_at
          RETURNING id
        `;
        if (!source) throw new Error("Wikidata source was not created");

        const [existingProjection] = await transaction<
          Array<{
            taxon_id: string;
            taxon_public_id: string;
            biological_entity_id: string | null;
            biological_entity_public_id: string | null;
          }>
        >`
          SELECT
            taxon.id AS taxon_id,
            taxon.public_id AS taxon_public_id,
            biological_entity.id AS biological_entity_id,
            biological_entity.public_id AS biological_entity_public_id
          FROM taxa AS taxon
          LEFT JOIN external_identifiers AS wikidata_identifier
            ON wikidata_identifier.taxon_id = taxon.id
           AND wikidata_identifier.namespace = 'wikidata'
           AND wikidata_identifier.identifier = ${input.taxon.externalIdentifiers.find((identifier) => identifier.namespace === "wikidata")?.identifier ?? ""}
          LEFT JOIN biological_entities AS biological_entity
            ON biological_entity.taxon_id = taxon.id
          WHERE wikidata_identifier.id IS NOT NULL
             OR lower(taxon.scientific_name) = lower(${input.taxon.scientificName})
          ORDER BY
            (wikidata_identifier.id IS NOT NULL) DESC,
            (biological_entity.visibility = 'public') DESC,
            biological_entity.id ASC
          LIMIT 1
        `;

        let taxon: { id: string; public_id: string };
        if (existingProjection) {
          taxon = {
            id: existingProjection.taxon_id,
            public_id: existingProjection.taxon_public_id,
          };
        } else {
          const [createdTaxon] = await transaction<
            Array<{ id: string; public_id: string }>
          >`
            INSERT INTO taxa (
              public_id, scientific_name, rank, taxonomic_status, description
            ) VALUES (
              ${`taxon-wikidata-${input.taxon.externalIdentifiers.find((identifier) => identifier.namespace === "wikidata")?.identifier ?? "unresolved"}`},
              ${input.taxon.scientificName},
              ${input.taxon.rank},
              ${input.taxon.taxonomicStatus},
              'Proyección Wikidata en revisión; el payload estructurado y sus claims seleccionados permanecen en source_records.'
            )
            ON CONFLICT (public_id) DO UPDATE SET
              scientific_name = EXCLUDED.scientific_name,
              rank = EXCLUDED.rank,
              taxonomic_status = EXCLUDED.taxonomic_status,
              description = EXCLUDED.description,
              updated_at = now()
            RETURNING id, public_id
          `;
          if (!createdTaxon) throw new Error("Wikidata taxon was not created");
          taxon = createdTaxon;
        }

        let biologicalEntity: { id: string; public_id: string };
        if (
          existingProjection?.biological_entity_id &&
          existingProjection.biological_entity_public_id
        ) {
          biologicalEntity = {
            id: existingProjection.biological_entity_id,
            public_id: existingProjection.biological_entity_public_id,
          };
        } else {
          const wikidataId =
            input.taxon.externalIdentifiers.find(
              (identifier) => identifier.namespace === "wikidata",
            )?.identifier ?? "unresolved";
          const [createdEntity] = await transaction<
            Array<{ id: string; public_id: string }>
          >`
            INSERT INTO biological_entities (
              public_id, entity_type, display_name, taxon_id,
              authority_note, visibility
            ) VALUES (
              ${`biological-entity-wikidata-${wikidataId}`},
              ${entityTypeForRank(input.taxon.rank)},
              ${input.taxon.scientificName},
              ${taxon.id},
              'Entidad anclada a Wikidata; permanece restringida hasta revisión de fuente y taxonomía.',
              'restricted'
            )
            ON CONFLICT (public_id) DO UPDATE SET
              display_name = EXCLUDED.display_name,
              taxon_id = EXCLUDED.taxon_id,
              authority_note = EXCLUDED.authority_note,
              updated_at = now()
            RETURNING id, public_id
          `;
          if (!createdEntity)
            throw new Error("Wikidata biological entity was not created");
          biologicalEntity = createdEntity;
        }

        await transaction`
          INSERT INTO record_provenance (
            source_record_id, taxon_id, source_id, assertion_type
          ) VALUES (
            ${itemSourceRecordId}, ${taxon.id}, ${source.id}, ${input.itemRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;
        await transaction`
          INSERT INTO record_provenance (
            source_record_id, biological_entity_id, source_id, assertion_type
          ) VALUES (
            ${itemSourceRecordId}, ${biologicalEntity.id}, ${source.id}, ${input.itemRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;

        let identifiers = 0;
        for (const identifier of input.taxon.externalIdentifiers) {
          const [existingIdentifier] = await transaction<
            Array<{
              id: string;
              taxon_id: string | null;
              biological_entity_id: string | null;
              specimen_id: string | null;
              place_id: string | null;
            }>
          >`
            SELECT id, taxon_id, biological_entity_id, specimen_id, place_id
            FROM external_identifiers
            WHERE namespace = ${identifier.namespace}
              AND identifier = ${identifier.identifier}
            LIMIT 1
          `;

          let externalIdentifierId: string;
          if (existingIdentifier) {
            externalIdentifierId = existingIdentifier.id;
            await transaction`
            UPDATE external_identifiers
            SET canonical_url = ${identifier.canonicalUrl},
                  retrieved_at = ${input.itemRecord.retrievedAt}
            WHERE id = ${externalIdentifierId}
            `;
          } else {
            const [createdIdentifier] = await transaction<{ id: string }[]>`
              INSERT INTO external_identifiers (
                namespace, identifier, canonical_url, retrieved_at,
                license_uri, taxon_id
              ) VALUES (
                ${identifier.namespace},
                ${identifier.identifier},
                ${identifier.canonicalUrl},
                ${input.itemRecord.retrievedAt},
                ${input.itemRecord.license},
                ${taxon.id}
              )
              RETURNING id
            `;
            if (!createdIdentifier)
              throw new Error("Wikidata external identifier was not created");
            externalIdentifierId = createdIdentifier.id;
          }

          await transaction`
            INSERT INTO record_provenance (
              source_record_id, external_identifier_id, source_id, assertion_type
            ) VALUES (
              ${itemSourceRecordId}, ${externalIdentifierId}, ${source.id}, ${input.itemRecord.assertionType}
            )
            ON CONFLICT DO NOTHING
          `;
          identifiers += 1;
        }

        return {
          taxonPublicId: taxon.public_id,
          biologicalEntityPublicId: biologicalEntity.public_id,
          identifiers,
          linkedExistingTaxon: Boolean(existingProjection),
        };
      });
    },
  };
}
