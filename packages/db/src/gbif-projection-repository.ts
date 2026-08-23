import type { Sql } from "postgres";

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

export interface GbifProjectionSourceRecord {
  sourceRecordId: string;
  sourceUrl: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: string;
  rawPayload: Record<string, unknown>;
}

export interface GbifProjectionInput {
  taxon: {
    sourceRecordId: string;
    sourceUrl: string;
    scientificName: string;
    canonicalName?: string;
    rank: string;
    taxonomicStatus: string;
    acceptedName?: string;
    externalIdentifier: {
      identifier: string;
      canonicalUrl: string;
    };
  };
  speciesRecord: GbifProjectionSourceRecord;
  occurrenceRecords: GbifProjectionSourceRecord[];
  mediaRecords: GbifProjectionSourceRecord[];
  sourceRecordIds: Record<string, string>;
}

export interface GbifProjectionResult {
  taxonPublicId: string;
  biologicalEntityPublicId: string;
  observations: number;
  media: number;
  publicObservations: number;
  restrictedMedia: number;
}

function stringField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function safeDate(value: string | undefined, fallback: string): string {
  if (value && !Number.isNaN(Date.parse(value)))
    return new Date(value).toISOString();
  return fallback;
}

export function isPublicGbifRecordLicense(license: string): boolean {
  const normalized = license.toLowerCase();
  return (
    normalized === "cc0" ||
    normalized.includes("creativecommons.org/publicdomain/zero") ||
    normalized.includes("creativecommons.org/licenses/by/4.0") ||
    normalized === "cc by 4.0"
  );
}

export function roundGbifPublicCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function mediaType(
  payload: Record<string, unknown>,
): "image" | "audio" | "video" | "document" {
  const format =
    `${stringField(payload, "format") ?? ""} ${stringField(payload, "type") ?? ""}`.toLowerCase();
  if (format.includes("audio") || format.includes("sound")) return "audio";
  if (format.includes("video")) return "video";
  if (format.includes("image") || format.includes("still")) return "image";
  return "document";
}

export function createGbifProjectionRepository(sql: Sql) {
  return {
    async persistSnapshot(
      input: GbifProjectionInput,
    ): Promise<GbifProjectionResult> {
      return sql.begin(async (transaction) => {
        const json = (value: unknown) => transaction.json(value as JsonValue);
        const sourceRecordId =
          input.sourceRecordIds[input.speciesRecord.sourceRecordId];
        if (!sourceRecordId) {
          throw new Error("GBIF species source record was not persisted");
        }

        const [source] = await transaction<{ id: string }[]>`
          INSERT INTO sources (
            public_id, source_type, title, citation, url, license_uri, attribution,
            accessed_at
          ) VALUES (
            'source-gbif',
            'external_dataset',
            'GBIF · snapshot de ocurrencias',
            'GBIF API record-level attribution; revisar dataset y multimedia individualmente',
            'https://api.gbif.org/v1',
            'per-record-review',
            'GBIF; atribución conservada por source_record',
            ${input.speciesRecord.retrievedAt}
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
        if (!source) throw new Error("GBIF source was not created");

        const taxonPublicId = `taxon-gbif-${input.taxon.externalIdentifier.identifier}`;
        const [taxon] = await transaction<{ id: string }[]>`
          INSERT INTO taxa (
            public_id, scientific_name, rank, taxonomic_status, accepted_name,
            description
          ) VALUES (
            ${taxonPublicId},
            ${input.taxon.scientificName},
            ${input.taxon.rank},
            ${input.taxon.taxonomicStatus},
            ${input.taxon.acceptedName ?? input.taxon.canonicalName ?? null},
            'Proyección GBIF en revisión; conservar el source_record como fuente de verdad del payload.'
          )
          ON CONFLICT (public_id) DO UPDATE SET
            scientific_name = EXCLUDED.scientific_name,
            rank = EXCLUDED.rank,
            taxonomic_status = EXCLUDED.taxonomic_status,
            accepted_name = EXCLUDED.accepted_name,
            description = EXCLUDED.description,
            updated_at = now()
          RETURNING id
        `;
        if (!taxon) throw new Error("GBIF taxon was not created");

        const biologicalEntityPublicId = `biological-entity-gbif-${input.taxon.externalIdentifier.identifier}`;
        const [biologicalEntity] = await transaction<{ id: string }[]>`
          INSERT INTO biological_entities (
            public_id, entity_type, display_name, taxon_id,
            authority_note, visibility
          ) VALUES (
            ${biologicalEntityPublicId},
            'species',
            ${input.taxon.scientificName},
            ${taxon.id},
            'Entidad local anclada a GBIF; permanece restringida hasta revisar licencia, taxonomía y atribución.',
            'restricted'
          )
          ON CONFLICT (public_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            taxon_id = EXCLUDED.taxon_id,
            authority_note = EXCLUDED.authority_note,
            visibility = EXCLUDED.visibility,
            updated_at = now()
          RETURNING id
        `;
        if (!biologicalEntity) {
          throw new Error("GBIF biological entity was not created");
        }

        await transaction`
          INSERT INTO external_identifiers (
            namespace, identifier, canonical_url, retrieved_at,
            license_uri, taxon_id
          ) VALUES (
            'gbif',
            ${input.taxon.externalIdentifier.identifier},
            ${input.taxon.externalIdentifier.canonicalUrl},
            ${input.speciesRecord.retrievedAt},
            ${input.speciesRecord.license},
            ${taxon.id}
          )
          ON CONFLICT (namespace, identifier) DO UPDATE SET
            canonical_url = EXCLUDED.canonical_url,
            retrieved_at = EXCLUDED.retrieved_at,
            license_uri = EXCLUDED.license_uri,
            taxon_id = EXCLUDED.taxon_id
        `;

        await transaction`
          INSERT INTO record_provenance (
            source_record_id, taxon_id, assertion_type
          ) VALUES (
            ${sourceRecordId}, ${taxon.id}, ${input.speciesRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;
        await transaction`
          INSERT INTO record_provenance (
            source_record_id, biological_entity_id, assertion_type
          ) VALUES (
            ${sourceRecordId}, ${biologicalEntity.id}, ${input.speciesRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;

        const observationIds = new Map<string, string>();
        let observations = 0;
        let publicObservations = 0;
        for (const record of input.occurrenceRecords) {
          const payload = record.rawPayload;
          const occurrenceId =
            stringField(payload, "gbifID") ??
            stringField(payload, "key") ??
            record.sourceRecordId.replace(/^occurrence:/, "");
          const publicId = `observation-gbif-${occurrenceId}`;
          const latitude = numberField(payload, "decimalLatitude");
          const longitude = numberField(payload, "decimalLongitude");
          const publicLatitude =
            latitude === undefined ? null : roundGbifPublicCoordinate(latitude);
          const publicLongitude =
            longitude === undefined
              ? null
              : roundGbifPublicCoordinate(longitude);
          const publicLicense = isPublicGbifRecordLicense(record.license);
          const visibility = publicLicense ? "public" : "restricted";
          const eventDate =
            stringField(payload, "eventDate") ??
            stringField(payload, "lastInterpreted") ??
            record.retrievedAt;
          const sourceRecord = input.sourceRecordIds[record.sourceRecordId];
          if (!sourceRecord) continue;
          const [observation] = await transaction<{ id: string }[]>`
            INSERT INTO observations (
              public_id, taxon_id, observed_at, observation_basis,
              geometry_public, environment, notes, visibility
            ) VALUES (
              ${publicId},
              ${taxon.id},
              ${safeDate(eventDate, record.retrievedAt)},
              'external',
              ST_SetSRID(ST_MakePoint(${publicLongitude}, ${publicLatitude}), 4326),
              ${json({ provider: "gbif", sourceRecordId: record.sourceRecordId })},
              'Importado como ocurrencia externa; la geometría pública se redondea y el payload exacto queda en source_records.',
              ${visibility}
            )
            ON CONFLICT (public_id) DO UPDATE SET
              taxon_id = EXCLUDED.taxon_id,
              observed_at = EXCLUDED.observed_at,
              observation_basis = EXCLUDED.observation_basis,
              geometry_public = EXCLUDED.geometry_public,
              environment = EXCLUDED.environment,
              notes = EXCLUDED.notes,
              visibility = EXCLUDED.visibility
            RETURNING id
          `;
          if (!observation) continue;
          observationIds.set(occurrenceId, observation.id);
          observations += 1;
          if (visibility === "public") publicObservations += 1;
          await transaction`
            INSERT INTO record_provenance (
              source_record_id, observation_id, assertion_type
            ) VALUES (
              ${sourceRecord}, ${observation.id}, ${record.assertionType}
            )
            ON CONFLICT DO NOTHING
          `;
        }

        let media = 0;
        let restrictedMedia = 0;
        for (const record of input.mediaRecords) {
          const payload = record.rawPayload;
          const mediaPayload = payload.media;
          if (!mediaPayload || typeof mediaPayload !== "object") continue;
          const mediaObject = mediaPayload as Record<string, unknown>;
          const identifier = stringField(mediaObject, "identifier");
          const occurrenceId = stringField(payload, "occurrenceId");
          const sourceRecord = input.sourceRecordIds[record.sourceRecordId];
          if (!identifier || !sourceRecord) continue;
          const visibility = isPublicGbifRecordLicense(record.license)
            ? "public"
            : "restricted";
          const [mediaRow] = await transaction<{ id: string }[]>`
            INSERT INTO media (
              media_type, uri, title, license_uri, attribution, source_id, visibility
            ) VALUES (
              ${mediaType(mediaObject)},
              ${identifier},
              ${stringField(mediaObject, "title") ?? null},
              ${record.license},
              ${record.attribution},
              ${source.id},
              ${visibility}
            )
            ON CONFLICT (uri) DO UPDATE SET
              media_type = EXCLUDED.media_type,
              title = EXCLUDED.title,
              license_uri = EXCLUDED.license_uri,
              attribution = EXCLUDED.attribution,
              source_id = EXCLUDED.source_id,
              visibility = EXCLUDED.visibility
            RETURNING id
          `;
          if (!mediaRow) continue;
          const observationId = occurrenceId
            ? observationIds.get(occurrenceId)
            : undefined;
          await transaction`
            INSERT INTO media_attachments (
              media_id, observation_id, taxon_id, sort_order
            ) VALUES (
              ${mediaRow.id}, ${observationId ?? null},
              ${observationId ? null : taxon.id}, 0
            )
            ON CONFLICT (media_id, sort_order) DO NOTHING
          `;
          await transaction`
            INSERT INTO record_provenance (
              source_record_id, media_id, assertion_type
            ) VALUES (
              ${sourceRecord}, ${mediaRow.id}, ${record.assertionType}
            )
            ON CONFLICT DO NOTHING
          `;
          media += 1;
          if (visibility === "restricted") restrictedMedia += 1;
        }

        return {
          taxonPublicId,
          biologicalEntityPublicId,
          observations,
          media,
          publicObservations,
          restrictedMedia,
        };
      });
    },
  };
}
