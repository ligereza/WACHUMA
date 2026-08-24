import type { Sql } from "postgres";
import type {
  PublicSearchResult,
  PublicSearchResultKind,
} from "@wachuma/shared";

type SearchRow = {
  kind: PublicSearchResultKind;
  public_id: string;
  title: string;
  summary: string;
  path: string;
  subject_public_id: string | null;
  source_public_ids: string[];
};

function searchPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

function toResult(row: SearchRow): PublicSearchResult {
  return {
    kind: row.kind,
    publicId: row.public_id as PublicSearchResult["publicId"],
    title: row.title,
    summary: row.summary,
    path: row.path,
    ...(row.subject_public_id
      ? {
          subjectPublicId: row.subject_public_id as NonNullable<
            PublicSearchResult["subjectPublicId"]
          >,
        }
      : {}),
    sourcePublicIds: (row.source_public_ids ?? []).map(
      (publicId) => publicId as PublicSearchResult["sourcePublicIds"][number],
    ),
  };
}

/**
 * Public search is a read projection over the canonical relational model.
 * Every branch repeats the visibility/review boundary deliberately so a new
 * public result cannot be created by accidentally joining a restricted row.
 */
export function createSearchRepository(sql: Sql) {
  return {
    async searchPublic(
      search?: string,
      limit = 30,
    ): Promise<PublicSearchResult[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const normalizedSearch = search?.trim();
      const pattern = normalizedSearch ? searchPattern(normalizedSearch) : null;

      const rows = await sql<SearchRow[]>`
        WITH search_params AS (
          SELECT ${pattern}::text AS pattern
        ),
        public_species AS (
          SELECT
            be.id AS entity_id,
            be.public_id AS entity_public_id,
            be.display_name,
            t.id AS taxon_id,
            t.public_id AS taxon_public_id,
            t.scientific_name,
            t.accepted_name,
            t.description
          FROM biological_entities AS be
          JOIN taxa AS t ON t.id = be.taxon_id
          WHERE be.visibility = 'public'
        ),
        public_sources AS (
          SELECT s.id, s.public_id
          FROM sources AS s
          WHERE EXISTS (
            SELECT 1
            FROM claims AS claim
            WHERE claim.source_id = s.id
              AND claim.visibility = 'public'
              AND claim.review_status = 'accepted'
          )
          OR EXISTS (
            SELECT 1
            FROM growing_guide_claims AS guide_claim
            JOIN growing_guides AS guide
              ON guide.id = guide_claim.growing_guide_id
             AND guide.status = 'published'
            WHERE guide_claim.source_id = s.id
          )
          OR EXISTS (
            SELECT 1
            FROM cultural_relations AS relation
            LEFT JOIN communities AS community
              ON community.id = relation.community_id
             AND community.visibility = 'public'
            LEFT JOIN places AS relation_place
              ON relation_place.id = relation.place_id
             AND relation_place.visibility = 'public'
            LEFT JOIN cultures AS cultural_material
              ON cultural_material.id = relation.culture_id
            LEFT JOIN specimens AS culture_specimen
              ON culture_specimen.id = cultural_material.specimen_id
            LEFT JOIN biological_entities AS culture_entity
              ON culture_entity.id = culture_specimen.biological_entity_id
            WHERE relation.source_id = s.id
              AND relation.access_level = 'public'
              AND relation.review_status = 'accepted'
              AND relation.sensitivity = 'normal'
              AND (relation.community_id IS NULL OR community.id IS NOT NULL)
              AND (relation.place_id IS NULL OR relation_place.id IS NOT NULL)
              AND (relation.culture_id IS NULL OR culture_specimen.visibility = 'public')
              AND (relation.culture_id IS NULL OR culture_entity.visibility = 'public')
          )
          OR EXISTS (
            SELECT 1
            FROM places AS source_place
            WHERE source_place.source_id = s.id
              AND source_place.visibility = 'public'
          )
          OR EXISTS (
            SELECT 1
            FROM media AS source_media
            WHERE source_media.source_id = s.id
              AND source_media.visibility = 'public'
          )
        ),
        hits AS (
          SELECT
            'species'::text AS kind,
            species.entity_public_id AS public_id,
            species.display_name AS title,
            COALESCE(NULLIF(species.description, ''), species.scientific_name) AS summary,
            '/species/' || species.entity_public_id AS path,
            species.entity_public_id AS subject_public_id,
            COALESCE((
              SELECT ARRAY_AGG(DISTINCT source.public_id ORDER BY source.public_id)
              FROM sources AS source
              WHERE EXISTS (
                SELECT 1
                FROM claims AS claim
                WHERE claim.source_id = source.id
                  AND claim.visibility = 'public'
                  AND claim.review_status = 'accepted'
                  AND (
                    (claim.subject_type = 'taxon' AND claim.subject_id = species.taxon_id)
                    OR (claim.subject_type = 'biological_entity' AND claim.subject_id = species.entity_id)
                  )
              )
              OR EXISTS (
                SELECT 1
                FROM cultural_relations AS relation
                LEFT JOIN communities AS community
                  ON community.id = relation.community_id
                 AND community.visibility = 'public'
                LEFT JOIN places AS relation_place
                  ON relation_place.id = relation.place_id
                 AND relation_place.visibility = 'public'
                LEFT JOIN cultures AS cultural_material
                  ON cultural_material.id = relation.culture_id
                LEFT JOIN specimens AS culture_specimen
                  ON culture_specimen.id = cultural_material.specimen_id
                LEFT JOIN biological_entities AS culture_entity
                  ON culture_entity.id = culture_specimen.biological_entity_id
                WHERE relation.source_id = source.id
                  AND relation.access_level = 'public'
                  AND relation.review_status = 'accepted'
                  AND relation.sensitivity = 'normal'
                  AND (relation.community_id IS NULL OR community.id IS NOT NULL)
                  AND (relation.place_id IS NULL OR relation_place.id IS NOT NULL)
                  AND (relation.culture_id IS NULL OR culture_specimen.visibility = 'public')
                  AND (relation.culture_id IS NULL OR culture_entity.visibility = 'public')
                  AND (
                    relation.taxon_id = species.taxon_id
                    OR relation.biological_entity_id = species.entity_id
                  )
              )
            ), ARRAY[]::text[]) AS source_public_ids,
            1 AS sort_order
          FROM public_species AS species
          CROSS JOIN search_params
          WHERE search_params.pattern IS NULL
            OR species.scientific_name ILIKE search_params.pattern
            OR species.accepted_name ILIKE search_params.pattern
            OR species.display_name ILIKE search_params.pattern
            OR species.entity_public_id ILIKE search_params.pattern
            OR species.taxon_public_id ILIKE search_params.pattern
            OR EXISTS (
              SELECT 1
              FROM external_identifiers AS identifier
              WHERE (
                identifier.taxon_id = species.taxon_id
                OR identifier.biological_entity_id = species.entity_id
              )
                AND (
                  identifier.namespace ILIKE search_params.pattern
                  OR identifier.identifier ILIKE search_params.pattern
                  OR (identifier.namespace || ':' || identifier.identifier) ILIKE search_params.pattern
                )
            )
            OR EXISTS (
              SELECT 1
              FROM claims AS claim
              WHERE claim.visibility = 'public'
                AND claim.review_status = 'accepted'
                AND claim.object_text ILIKE search_params.pattern
                AND (
                  (claim.subject_type = 'taxon' AND claim.subject_id = species.taxon_id)
                  OR (claim.subject_type = 'biological_entity' AND claim.subject_id = species.entity_id)
                )
            )
            OR EXISTS (
              SELECT 1
              FROM cultural_relations AS relation
              LEFT JOIN communities AS community
                ON community.id = relation.community_id
               AND community.visibility = 'public'
              LEFT JOIN places AS relation_place
                ON relation_place.id = relation.place_id
               AND relation_place.visibility = 'public'
              LEFT JOIN cultures AS cultural_material
                ON cultural_material.id = relation.culture_id
              LEFT JOIN specimens AS culture_specimen
                ON culture_specimen.id = cultural_material.specimen_id
              LEFT JOIN biological_entities AS culture_entity
                ON culture_entity.id = culture_specimen.biological_entity_id
              WHERE relation.access_level = 'public'
                AND relation.review_status = 'accepted'
                AND relation.sensitivity = 'normal'
                AND (relation.community_id IS NULL OR community.id IS NOT NULL)
                AND (relation.place_id IS NULL OR relation_place.id IS NOT NULL)
                AND (relation.culture_id IS NULL OR culture_specimen.visibility = 'public')
                AND (relation.culture_id IS NULL OR culture_entity.visibility = 'public')
                AND (
                  relation.taxon_id = species.taxon_id
                  OR relation.biological_entity_id = species.entity_id
                )
                AND (
                  relation.value_text ILIKE search_params.pattern
                  OR relation.description ILIKE search_params.pattern
                )
            )

          UNION ALL

          SELECT
            'guide'::text AS kind,
            guide.public_id,
            guide.title,
            COALESCE(NULLIF(guide.summary, ''), 'Manual de cultivo versionado') AS summary,
            '/cultivation/' || guide.public_id AS path,
            COALESCE(taxon.public_id, entity.public_id) AS subject_public_id,
            COALESCE((
              SELECT ARRAY_AGG(DISTINCT source.public_id ORDER BY source.public_id)
              FROM growing_guide_claims AS guide_claim
              JOIN sources AS source ON source.id = guide_claim.source_id
              WHERE guide_claim.growing_guide_id = guide.id
            ), ARRAY[]::text[]) AS source_public_ids,
            2 AS sort_order
          FROM growing_guides AS guide
          LEFT JOIN taxa AS taxon ON taxon.id = guide.taxon_id
          LEFT JOIN biological_entities AS entity
            ON entity.id = guide.biological_entity_id
           AND entity.visibility = 'public'
          CROSS JOIN search_params
          WHERE guide.status = 'published'
            AND (guide.biological_entity_id IS NULL OR entity.id IS NOT NULL)
            AND (
              search_params.pattern IS NULL
              OR guide.title ILIKE search_params.pattern
              OR guide.summary ILIKE search_params.pattern
              OR guide.climate_context ILIKE search_params.pattern
              OR guide.technique_context ILIKE search_params.pattern
              OR guide.region_context ILIKE search_params.pattern
              OR COALESCE(taxon.scientific_name, '') ILIKE search_params.pattern
              OR COALESCE(entity.display_name, '') ILIKE search_params.pattern
              OR EXISTS (
                SELECT 1
                FROM growing_guide_claims AS guide_claim
                WHERE guide_claim.growing_guide_id = guide.id
                  AND guide_claim.statement ILIKE search_params.pattern
              )
            )

          UNION ALL

          SELECT
            'cultural_relation'::text AS kind,
            relation.public_id,
            COALESCE(NULLIF(relation.value_text, ''), relation.relation_type) AS title,
            relation.description AS summary,
            '/culture?subjectPublicId=' || COALESCE(entity.public_id, taxon.public_id) AS path,
            COALESCE(entity.public_id, taxon.public_id) AS subject_public_id,
            ARRAY[ source.public_id ] AS source_public_ids,
            3 AS sort_order
          FROM cultural_relations AS relation
          JOIN sources AS source ON source.id = relation.source_id
          LEFT JOIN taxa AS taxon ON taxon.id = relation.taxon_id
          LEFT JOIN biological_entities AS entity
            ON entity.id = relation.biological_entity_id
           AND entity.visibility = 'public'
          LEFT JOIN communities AS community
            ON community.id = relation.community_id
           AND community.visibility = 'public'
          LEFT JOIN places AS relation_place
            ON relation_place.id = relation.place_id
           AND relation_place.visibility = 'public'
          LEFT JOIN cultures AS cultural_material
            ON cultural_material.id = relation.culture_id
          LEFT JOIN specimens AS culture_specimen
            ON culture_specimen.id = cultural_material.specimen_id
          LEFT JOIN biological_entities AS culture_entity
            ON culture_entity.id = culture_specimen.biological_entity_id
          LEFT JOIN historical_periods AS period
            ON period.id = relation.historical_period_id
          CROSS JOIN search_params
          WHERE relation.access_level = 'public'
            AND relation.review_status = 'accepted'
            AND relation.sensitivity = 'normal'
            AND (relation.community_id IS NULL OR community.id IS NOT NULL)
            AND (relation.place_id IS NULL OR relation_place.id IS NOT NULL)
            AND (relation.culture_id IS NULL OR culture_specimen.visibility = 'public')
            AND (relation.culture_id IS NULL OR culture_entity.visibility = 'public')
            AND (entity.id IS NULL OR entity.visibility = 'public')
            AND (
              search_params.pattern IS NULL
              OR relation.public_id ILIKE search_params.pattern
              OR relation.relation_type ILIKE search_params.pattern
              OR relation.value_text ILIKE search_params.pattern
              OR relation.description ILIKE search_params.pattern
              OR community.name ILIKE search_params.pattern
              OR relation_place.name ILIKE search_params.pattern
              OR period.name ILIKE search_params.pattern
              OR COALESCE(entity.display_name, taxon.scientific_name) ILIKE search_params.pattern
            )

          UNION ALL

          SELECT
            'source'::text AS kind,
            source.public_id,
            source.title,
            source.citation AS summary,
            '/sources#' || source.public_id AS path,
            NULL::text AS subject_public_id,
            ARRAY[ source.public_id ] AS source_public_ids,
            4 AS sort_order
          FROM public_sources AS public_source
          JOIN sources AS source ON source.id = public_source.id
          CROSS JOIN search_params
          WHERE search_params.pattern IS NULL
            OR source.public_id ILIKE search_params.pattern
            OR source.title ILIKE search_params.pattern
            OR source.citation ILIKE search_params.pattern
            OR source.doi ILIKE search_params.pattern
            OR source.publisher ILIKE search_params.pattern
            OR source.url ILIKE search_params.pattern
            OR source.attribution ILIKE search_params.pattern

          UNION ALL

          SELECT
            'place'::text AS kind,
            place.public_id,
            place.name AS title,
            COALESCE(NULLIF(place.description, ''), COALESCE(place.country_code, 'Lugar público')) AS summary,
            '/map#' || place.public_id AS path,
            NULL::text AS subject_public_id,
            COALESCE((
              SELECT ARRAY[ source.public_id ]
              FROM sources AS source
              WHERE source.id = place.source_id
            ), ARRAY[]::text[]) AS source_public_ids,
            5 AS sort_order
          FROM places AS place
          CROSS JOIN search_params
          WHERE place.visibility = 'public'
            AND (
              search_params.pattern IS NULL
              OR place.public_id ILIKE search_params.pattern
              OR place.name ILIKE search_params.pattern
              OR place.description ILIKE search_params.pattern
              OR place.country_code ILIKE search_params.pattern
            )

          UNION ALL

          SELECT
            'specimen'::text AS kind,
            specimen.public_id,
            specimen.public_id AS title,
            'Ejemplar público · ' || entity.display_name AS summary,
            '/specimens/' || specimen.public_id AS path,
            entity.public_id AS subject_public_id,
            COALESCE((
              SELECT ARRAY_AGG(DISTINCT source.public_id ORDER BY source.public_id)
              FROM record_provenance AS provenance
              LEFT JOIN sources AS source ON source.id = provenance.source_id
              WHERE provenance.specimen_id = specimen.id
                AND source.id IS NOT NULL
            ), ARRAY[]::text[]) AS source_public_ids,
            6 AS sort_order
          FROM specimens AS specimen
          JOIN biological_entities AS entity
            ON entity.id = specimen.biological_entity_id
           AND entity.visibility = 'public'
          CROSS JOIN search_params
          WHERE specimen.visibility = 'public'
            AND (
              search_params.pattern IS NULL
              OR specimen.public_id ILIKE search_params.pattern
              OR specimen.specimen_type ILIKE search_params.pattern
              OR specimen.status ILIKE search_params.pattern
              OR entity.public_id ILIKE search_params.pattern
              OR entity.display_name ILIKE search_params.pattern
              OR EXISTS (
                SELECT 1
                FROM taxa AS taxon
                WHERE taxon.id = entity.taxon_id
                  AND taxon.scientific_name ILIKE search_params.pattern
              )
            )
        )
        SELECT
          kind,
          public_id,
          title,
          summary,
          path,
          subject_public_id,
          source_public_ids
        FROM hits
        ORDER BY sort_order ASC, title ASC, public_id ASC
        LIMIT ${safeLimit}
      `;

      return rows.map(toResult);
    },
  };
}
