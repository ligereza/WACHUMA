import type { Sql } from "postgres";
import { roundPublicGeometry, type PublicMapFeature } from "@wachuma/maps";

type PlaceRow = {
  public_id: string;
  name: string;
  geometry: string | null;
  source_public_id: string | null;
};

type ObservationMapRow = {
  public_id: string;
  label: string;
  geometry: string | null;
  source_public_id: string | null;
};

export function createMapsRepository(sql: Sql) {
  return {
    async listPublicPlaces(): Promise<PublicMapFeature[]> {
      const rows = await sql<PlaceRow[]>`
        SELECT
          p.public_id,
          p.name,
          ST_AsGeoJSON(p.geometry_public) AS geometry,
          source.public_id AS source_public_id
        FROM places AS p
        LEFT JOIN sources AS source ON source.id = p.source_id
        WHERE p.visibility = 'public'
          AND p.geometry_public IS NOT NULL
        ORDER BY p.name ASC
        LIMIT 500
      `;

      const placeFeatures = rows.flatMap((row) => {
        if (!row.geometry) return [];
        try {
          const geometry = JSON.parse(row.geometry) as Record<string, unknown>;
          return [
            {
              publicId: row.public_id,
              label: row.name,
              geometry: roundPublicGeometry(geometry),
              ...(row.source_public_id ? { source: row.source_public_id } : {}),
            },
          ];
        } catch {
          return [];
        }
      });

      const observationRows = await sql<ObservationMapRow[]>`
        SELECT DISTINCT ON (observation.id)
          observation.public_id,
          CASE
            WHEN observation.environment->>'countryCode' IS NOT NULL
              THEN 'GBIF · ' || (observation.environment->>'countryCode')
            ELSE 'GBIF · ocurrencia externa'
          END AS label,
          ST_AsGeoJSON(observation.geometry_public) AS geometry,
          source.public_id AS source_public_id
        FROM observations AS observation
        LEFT JOIN record_provenance AS provenance
          ON provenance.observation_id = observation.id
        LEFT JOIN source_records AS source_record
          ON source_record.id = provenance.source_record_id
        LEFT JOIN data_sources AS data_source
          ON data_source.id = source_record.data_source_id
        LEFT JOIN sources AS source
          ON source.id = provenance.source_id
          OR (
            provenance.source_id IS NULL
            AND source.public_id = CASE
              WHEN data_source.provider_key IS NULL THEN NULL
              WHEN data_source.provider_key = 'gbif' THEN 'source-gbif'
              ELSE 'source-' || data_source.provider_key
            END
          )
        WHERE observation.visibility = 'public'
          AND observation.observation_basis = 'external'
          AND observation.geometry_public IS NOT NULL
        ORDER BY observation.id, source_record.retrieved_at DESC NULLS LAST
        LIMIT 500
      `;

      const observationFeatures = observationRows.flatMap((row) => {
        if (!row.geometry) return [];
        try {
          const geometry = JSON.parse(row.geometry) as Record<string, unknown>;
          return [
            {
              publicId: row.public_id,
              label: row.label,
              geometry: roundPublicGeometry(geometry),
              ...(row.source_public_id ? { source: row.source_public_id } : {}),
            },
          ];
        } catch {
          return [];
        }
      });

      return [...placeFeatures, ...observationFeatures];
    },
  };
}
