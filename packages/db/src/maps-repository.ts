import type { Sql } from "postgres";
import { roundPublicGeometry, type PublicMapFeature } from "@wachuma/maps";

type PlaceRow = {
  public_id: string;
  name: string;
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

      return rows.flatMap((row) => {
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
    },
  };
}
