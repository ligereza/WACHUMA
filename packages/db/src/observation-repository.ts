import type { Sql } from "postgres";
import type { PublicObservation } from "@wachuma/shared";

type ObservationRow = {
  public_id: string;
  subject_public_id: string;
  observed_at: string;
  observation_basis: PublicObservation["observationBasis"];
  protocol_public_id: string | null;
  place_public_id: string | null;
  place_name: string | null;
  geometry_public: string | null;
  environment: Record<string, unknown>;
  uncertainty: Record<string, unknown>;
  source_public_id: string | null;
  source_record_id: string | null;
};

function parseGeometry(
  value: string | null,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function toObservation(row: ObservationRow): PublicObservation {
  const geometry = parseGeometry(row.geometry_public);
  return {
    publicId: row.public_id as PublicObservation["publicId"],
    subjectPublicId:
      row.subject_public_id as PublicObservation["subjectPublicId"],
    observedAt: row.observed_at,
    observationBasis: row.observation_basis,
    ...(row.protocol_public_id
      ? {
          protocolPublicId: row.protocol_public_id as NonNullable<
            PublicObservation["protocolPublicId"]
          >,
        }
      : {}),
    ...(row.place_public_id
      ? {
          placePublicId: row.place_public_id as NonNullable<
            PublicObservation["placePublicId"]
          >,
        }
      : {}),
    ...(row.place_name ? { placeName: row.place_name } : {}),
    ...(geometry ? { geometryPublic: geometry } : {}),
    environment: row.environment ?? {},
    uncertainty: row.uncertainty ?? {},
    ...(row.source_public_id
      ? {
          sourcePublicId: row.source_public_id as NonNullable<
            PublicObservation["sourcePublicId"]
          >,
        }
      : {}),
    ...(row.source_record_id ? { sourceRecordId: row.source_record_id } : {}),
  };
}

export function createObservationRepository(sql: Sql) {
  return {
    async listPublicObservations(
      subjectPublicId?: string,
      limit = 100,
    ): Promise<PublicObservation[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const rows = await sql<ObservationRow[]>`
        SELECT DISTINCT ON (observation.id)
          observation.public_id,
          COALESCE(
            entity.public_id,
            specimen_entity.public_id,
            taxon.public_id,
            specimen.public_id
          )
            AS subject_public_id,
          observation.observed_at,
          observation.observation_basis,
          protocol.public_id AS protocol_public_id,
          place.public_id AS place_public_id,
          place.name AS place_name,
          ST_AsGeoJSON(observation.geometry_public) AS geometry_public,
          observation.environment,
          observation.uncertainty,
          source.public_id AS source_public_id,
          source_record.source_record_id
        FROM observations AS observation
        LEFT JOIN specimens AS specimen ON specimen.id = observation.specimen_id
        LEFT JOIN biological_entities AS entity
          ON entity.id = observation.biological_entity_id
        LEFT JOIN biological_entities AS specimen_entity
          ON specimen_entity.id = specimen.biological_entity_id
        LEFT JOIN taxa AS taxon ON taxon.id = observation.taxon_id
        LEFT JOIN places AS place
          ON place.id = observation.place_id
          AND place.visibility = 'public'
        LEFT JOIN protocols AS protocol
          ON protocol.id = observation.protocol_id
         AND protocol.access_level = 'public'
         AND protocol.status = 'published'
        LEFT JOIN record_provenance AS provenance
          ON provenance.observation_id = observation.id
        LEFT JOIN source_records AS source_record
          ON source_record.id = provenance.source_record_id
        LEFT JOIN data_sources AS data_source
          ON data_source.id = source_record.data_source_id
        LEFT JOIN sources AS source
          ON source.public_id = CASE
            WHEN data_source.provider_key IS NULL THEN NULL
            WHEN data_source.provider_key = 'gbif' THEN 'source-gbif'
            ELSE 'source-' || data_source.provider_key
          END
        WHERE observation.visibility = 'public'
          AND (specimen.id IS NULL OR specimen.visibility = 'public')
          AND (entity.id IS NULL OR entity.visibility = 'public')
          AND (
            specimen_entity.id IS NULL OR specimen_entity.visibility = 'public'
          )
          AND (place.id IS NULL OR place.visibility = 'public')
          AND (
            ${subjectPublicId ?? null}::text IS NULL
            OR entity.public_id = ${subjectPublicId ?? null}::text
            OR specimen_entity.public_id = ${subjectPublicId ?? null}::text
            OR taxon.public_id = ${subjectPublicId ?? null}::text
            OR specimen.public_id = ${subjectPublicId ?? null}::text
          )
        ORDER BY observation.id, source_record.retrieved_at DESC NULLS LAST
        LIMIT ${safeLimit}
      `;
      return rows.map(toObservation);
    },
  };
}
