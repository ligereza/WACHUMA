import type { Sql } from "postgres";

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

export interface InaturalistProjectionSourceRecord {
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: string;
  rawPayload: Record<string, unknown>;
}

export interface InaturalistProjectionInput {
  taxon: {
    sourceRecordId: string;
    sourceUrl: string;
    scientificName: string;
    rank: string;
    externalIdentifier: {
      identifier: string;
      canonicalUrl: string;
    };
  };
  taxonRecord: InaturalistProjectionSourceRecord;
  observationRecords: InaturalistProjectionSourceRecord[];
  mediaRecords: InaturalistProjectionSourceRecord[];
  sourceRecordIds: Record<string, string>;
}

export interface InaturalistProjectionResult {
  taxonPublicId: string;
  biologicalEntityPublicId: string;
  observations: number;
  media: number;
  publicObservations: number;
  restrictedMedia: number;
}

function stringField(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberField(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
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

export function projectPublicInaturalistCoordinates(
  payload: Record<string, unknown>,
): [number, number] | undefined {
  // iNaturalist can return an intentionally obscured point. It is never
  // promoted into WACHUMA's public map unless both privacy flags are open.
  if (
    stringField(payload, "geoprivacy") !== "open" ||
    stringField(payload, "taxon_geoprivacy") !== "open"
  ) {
    return undefined;
  }
  const geojson = payload.geojson;
  if (!geojson || typeof geojson !== "object" || Array.isArray(geojson))
    return undefined;
  const coordinates = (geojson as Record<string, unknown>).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return undefined;
  const longitude = coordinates[0];
  const latitude = coordinates[1];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return undefined;
  }
  return [Math.round(longitude * 100) / 100, Math.round(latitude * 100) / 100];
}

function safeEnvironment(payload: Record<string, unknown>) {
  return {
    provider: "inaturalist",
    qualityGrade: stringField(payload, "quality_grade") ?? "unknown",
    geoprivacy: stringField(payload, "geoprivacy") ?? "unknown",
    taxonGeoprivacy: stringField(payload, "taxon_geoprivacy") ?? "unknown",
    locationPublic: Boolean(projectPublicInaturalistCoordinates(payload)),
    ...(numberField(payload, "positional_accuracy") !== undefined
      ? {
          positionalAccuracyMeters: numberField(payload, "positional_accuracy"),
        }
      : {}),
  };
}

function mediaType(
  payload: Record<string, unknown>,
): "image" | "audio" | "video" | "document" {
  const kind = stringField(payload, "mediaKind");
  if (kind === "sound") return "audio";
  const media = payload.media;
  if (media && typeof media === "object" && !Array.isArray(media)) {
    const type = stringField(
      media as Record<string, unknown>,
      "type",
    )?.toLowerCase();
    if (type?.includes("video")) return "video";
    if (type?.includes("audio") || type?.includes("sound")) return "audio";
  }
  return "image";
}

function mediaField(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const media = payload.media;
  if (!media || typeof media !== "object" || Array.isArray(media))
    return undefined;
  return stringField(media as Record<string, unknown>, key);
}

function observationIdFromRecord(
  record: InaturalistProjectionSourceRecord,
): string {
  const value = record.rawPayload.id;
  if (typeof value === "number" && Number.isInteger(value))
    return String(value);
  const sourceId = record.sourceRecordId.replace(/^observation:/, "");
  if (!sourceId)
    throw new Error("iNaturalist observation source record is missing an id");
  return sourceId;
}

function mediaObservationId(
  record: InaturalistProjectionSourceRecord,
): string | undefined {
  const value = record.rawPayload.observationId;
  if (typeof value === "number" && Number.isInteger(value))
    return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createInaturalistProjectionRepository(sql: Sql) {
  return {
    async persistSnapshot(
      input: InaturalistProjectionInput,
    ): Promise<InaturalistProjectionResult> {
      return sql.begin(async (transaction) => {
        const txJson = (value: unknown) => transaction.json(value as JsonValue);
        const taxonSourceRecordId =
          input.sourceRecordIds[input.taxonRecord.sourceRecordId];
        if (!taxonSourceRecordId) {
          throw new Error("iNaturalist taxon source record was not persisted");
        }

        const [source] = await transaction<{ id: string }[]>`
          INSERT INTO sources (
            public_id, source_type, title, citation, url, license_uri, attribution,
            accessed_at
          ) VALUES (
            'source-inaturalist',
            'external_dataset',
            'iNaturalist · observaciones y multimedia',
            'iNaturalist API; licencias y atribución se revisan por observación y por media',
            'https://www.inaturalist.org',
            'per-record-review',
            'iNaturalist; atribución conservada por source_record',
            ${input.taxonRecord.retrievedAt}
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
        if (!source) throw new Error("iNaturalist source was not created");

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
          LEFT JOIN external_identifiers AS external_identifier
            ON external_identifier.taxon_id = taxon.id
           AND external_identifier.namespace = 'inaturalist'
           AND external_identifier.identifier = ${input.taxon.externalIdentifier.identifier}
          LEFT JOIN biological_entities AS biological_entity
            ON biological_entity.taxon_id = taxon.id
          WHERE external_identifier.id IS NOT NULL
             OR lower(taxon.scientific_name) = lower(${input.taxon.scientificName})
          ORDER BY
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
              ${`taxon-inaturalist-${input.taxon.externalIdentifier.identifier}`},
              ${input.taxon.scientificName},
              ${input.taxon.rank},
              'accepted',
              'Proyección iNaturalist en revisión; el payload completo permanece en source_records.'
            )
            ON CONFLICT (public_id) DO UPDATE SET
              scientific_name = EXCLUDED.scientific_name,
              rank = EXCLUDED.rank,
              taxonomic_status = EXCLUDED.taxonomic_status,
              description = EXCLUDED.description,
              updated_at = now()
            RETURNING id, public_id
          `;
          if (!createdTaxon)
            throw new Error("iNaturalist taxon was not created");
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
          const [createdEntity] = await transaction<
            Array<{ id: string; public_id: string }>
          >`
            INSERT INTO biological_entities (
              public_id, entity_type, display_name, taxon_id,
              authority_note, visibility
            ) VALUES (
              ${`biological-entity-inaturalist-${input.taxon.externalIdentifier.identifier}`},
              'species',
              ${input.taxon.scientificName},
              ${taxon.id},
              'Entidad anclada a iNaturalist; permanece restringida hasta revisión de fuente y derechos.',
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
            throw new Error("iNaturalist biological entity was not created");
          biologicalEntity = createdEntity;
        }

        await transaction`
          INSERT INTO external_identifiers (
            namespace, identifier, canonical_url, retrieved_at,
            license_uri, taxon_id
          ) VALUES (
            'inaturalist',
            ${input.taxon.externalIdentifier.identifier},
            ${input.taxon.externalIdentifier.canonicalUrl},
            ${input.taxonRecord.retrievedAt},
            ${input.taxonRecord.license},
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
            source_record_id, external_identifier_id, source_id, assertion_type
          )
          SELECT
            ${taxonSourceRecordId}, external_identifier.id, ${source.id}, ${input.taxonRecord.assertionType}
          FROM external_identifiers AS external_identifier
          WHERE external_identifier.namespace = 'inaturalist'
            AND external_identifier.identifier = ${input.taxon.externalIdentifier.identifier}
          ON CONFLICT DO NOTHING
        `;

        await transaction`
          INSERT INTO record_provenance (
            source_record_id, taxon_id, source_id, assertion_type
          ) VALUES (
            ${taxonSourceRecordId}, ${taxon.id}, ${source.id}, ${input.taxonRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;
        await transaction`
          INSERT INTO record_provenance (
            source_record_id, biological_entity_id, source_id, assertion_type
          ) VALUES (
            ${taxonSourceRecordId}, ${biologicalEntity.id}, ${source.id}, ${input.taxonRecord.assertionType}
          )
          ON CONFLICT DO NOTHING
        `;

        const observationIds = new Map<string, string>();
        let observations = 0;
        for (const record of input.observationRecords) {
          const occurrenceId = observationIdFromRecord(record);
          const sourceRecordId = input.sourceRecordIds[record.sourceRecordId];
          if (!sourceRecordId) continue;
          const payload = record.rawPayload;
          const coordinates = projectPublicInaturalistCoordinates(payload);
          const longitude = coordinates?.[0] ?? null;
          const latitude = coordinates?.[1] ?? null;
          const observedAt =
            stringField(payload, "observed_on") ??
            stringField(payload, "created_at") ??
            record.retrievedAt;
          const [observation] = await transaction<{ id: string }[]>`
            INSERT INTO observations (
              public_id, taxon_id, observed_at, observation_basis,
              geometry_public, environment, notes, visibility, uncertainty
            ) VALUES (
              ${`observation-inaturalist-${occurrenceId}`},
              ${taxon.id},
              ${safeDate(observedAt, record.retrievedAt)},
              'external',
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
              ${txJson(safeEnvironment(payload))},
              'Importado desde iNaturalist; privacidad geográfica y derechos quedan en revisión.',
              'restricted',
              ${txJson({ provider: "inaturalist", sourceRecordId: record.sourceRecordId })}
            )
            ON CONFLICT (public_id) DO UPDATE SET
              taxon_id = EXCLUDED.taxon_id,
              observed_at = EXCLUDED.observed_at,
              observation_basis = EXCLUDED.observation_basis,
              geometry_public = EXCLUDED.geometry_public,
              environment = EXCLUDED.environment,
              notes = EXCLUDED.notes,
              visibility = EXCLUDED.visibility,
              uncertainty = EXCLUDED.uncertainty
            RETURNING id
          `;
          if (!observation) continue;
          observationIds.set(occurrenceId, observation.id);
          observations += 1;
          await transaction`
            INSERT INTO record_provenance (
              source_record_id, observation_id, source_id, assertion_type
            ) VALUES (
              ${sourceRecordId}, ${observation.id}, ${source.id}, ${record.assertionType}
            )
            ON CONFLICT DO NOTHING
          `;
        }

        let media = 0;
        let restrictedMedia = 0;
        for (const record of input.mediaRecords) {
          const sourceRecordId = input.sourceRecordIds[record.sourceRecordId];
          const identifier =
            mediaField(record.rawPayload, "original_url") ??
            mediaField(record.rawPayload, "file_url") ??
            mediaField(record.rawPayload, "url") ??
            mediaField(record.rawPayload, "medium_url") ??
            mediaField(record.rawPayload, "small_url");
          if (!sourceRecordId || !identifier) continue;
          const observationId = mediaObservationId(record);
          const [mediaRow] = await transaction<{ id: string }[]>`
            INSERT INTO media (
              media_type, uri, title, license_uri, attribution, source_id, visibility
            ) VALUES (
              ${mediaType(record.rawPayload)},
              ${identifier},
              ${`iNaturalist ${record.rawPayload.mediaKind ?? "media"}`},
              ${record.license},
              ${record.attribution},
              ${source.id},
              'restricted'
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
          const observation = observationId
            ? observationIds.get(observationId)
            : undefined;
          await transaction`
            INSERT INTO media_attachments (
              media_id, observation_id, taxon_id, sort_order
            ) VALUES (
              ${mediaRow.id}, ${observation ?? null}, ${observation ? null : taxon.id}, 0
            )
            ON CONFLICT (media_id, sort_order) DO NOTHING
          `;
          await transaction`
            INSERT INTO record_provenance (
              source_record_id, media_id, source_id, assertion_type
            ) VALUES (
              ${sourceRecordId}, ${mediaRow.id}, ${source.id}, ${record.assertionType}
            )
            ON CONFLICT DO NOTHING
          `;
          media += 1;
          restrictedMedia += 1;
        }

        return {
          taxonPublicId: taxon.public_id,
          biologicalEntityPublicId: biologicalEntity.public_id,
          observations,
          media,
          publicObservations: 0,
          restrictedMedia,
        };
      });
    },
  };
}
