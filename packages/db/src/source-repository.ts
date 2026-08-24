import type { Sql } from "postgres";
import type { Source } from "@wachuma/shared";

type SourceRow = {
  id: string;
  public_id: string;
  source_type: Source["sourceType"];
  title: string;
  citation: string;
  url: string | null;
  doi: string | null;
  publisher: string | null;
  license_uri: string;
  attribution: string;
  published_on: string | null;
  accessed_at: string | null;
};

function toSource(row: SourceRow): Source {
  return {
    id: row.id as Source["id"],
    publicId: row.public_id as Source["publicId"],
    sourceType: row.source_type,
    title: row.title,
    citation: row.citation,
    ...(row.url ? { url: row.url } : {}),
    ...(row.doi ? { doi: row.doi } : {}),
    ...(row.publisher ? { publisher: row.publisher } : {}),
    license: row.license_uri,
    attribution: row.attribution,
    ...(row.published_on ? { publishedOn: row.published_on } : {}),
    ...(row.accessed_at ? { accessedAt: row.accessed_at } : {}),
  };
}

export function createSourceRepository(sql: Sql) {
  return {
    async listPublicSources(limit = 100): Promise<Source[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const rows = await sql<SourceRow[]>`
        SELECT DISTINCT
          s.id,
          s.public_id,
          s.source_type,
          s.title,
          s.citation,
          s.url,
          s.doi,
          s.publisher,
          s.license_uri,
          s.attribution,
          s.published_on,
          s.accessed_at
        FROM sources AS s
        LEFT JOIN cultural_relations AS cr
          ON cr.source_id = s.id
         AND cr.access_level = 'public'
         AND cr.review_status = 'accepted'
         AND cr.sensitivity = 'normal'
        LEFT JOIN communities AS cr_community
          ON cr_community.id = cr.community_id
         AND cr_community.visibility = 'public'
        LEFT JOIN places AS cr_place
          ON cr_place.id = cr.place_id
         AND cr_place.visibility = 'public'
        LEFT JOIN scene_asset_provenance AS sap
          ON sap.source_id = s.id
        LEFT JOIN places AS source_place
          ON source_place.source_id = s.id
         AND source_place.visibility = 'public'
        LEFT JOIN growing_guide_claims AS guide_claim
          ON guide_claim.source_id = s.id
        LEFT JOIN growing_guides AS guide
          ON guide.id = guide_claim.growing_guide_id
         AND guide.status = 'published'
        LEFT JOIN scene_assets AS sa
          ON sa.id = sap.scene_asset_id
         AND sa.visibility = 'public'
        LEFT JOIN media AS m
          ON m.id = sa.media_id
         AND m.visibility = 'public'
        WHERE (
          cr.id IS NOT NULL
          AND (cr.community_id IS NULL OR cr_community.id IS NOT NULL)
          AND (cr.place_id IS NULL OR cr_place.id IS NOT NULL)
        )
        OR m.id IS NOT NULL
        OR source_place.id IS NOT NULL
        OR guide.id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM claims AS claim
          WHERE claim.source_id = s.id
            AND claim.visibility = 'public'
            AND claim.review_status = 'accepted'
        )
        OR EXISTS (
          SELECT 1
          FROM observations AS observation
          JOIN record_provenance AS provenance
            ON provenance.observation_id = observation.id
          WHERE provenance.source_id = s.id
            AND observation.visibility = 'public'
        )
        OR EXISTS (
          SELECT 1
          FROM media AS medium
          WHERE medium.source_id = s.id
            AND medium.visibility = 'public'
        )
        ORDER BY s.title ASC
        LIMIT ${safeLimit}
      `;
      return rows.map(toSource);
    },
  };
}
