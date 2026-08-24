import assert from "node:assert/strict";
// The database workspace owns the PostgreSQL client; the root scripts package
// intentionally does not duplicate that runtime dependency.
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for audit:corpus; this audit never falls back to fixtures.",
  );
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const checks = await sql.unsafe(`
    WITH checks AS (
      SELECT
        'accepted_source_without_accepted_review' AS check_key,
        COUNT(*)::int AS violation_count
      FROM source_records AS source_record
      WHERE source_record.status = 'accepted'
        AND NOT EXISTS (
          SELECT 1
          FROM source_record_reviews AS review
          WHERE review.source_record_id = source_record.id
            AND review.decision = 'accepted'
            AND review.license_confirmed = true
            AND review.attribution_confirmed = true
            AND review.privacy_confirmed = true
        )

      UNION ALL

      SELECT
        'accepted_source_missing_metadata',
        COUNT(*)::int
      FROM source_records AS source_record
      WHERE source_record.status = 'accepted'
        AND (
          source_record.source_url IS NULL
          OR source_record.license_uri IS NULL
          OR lower(trim(source_record.license_uri)) IN ('', 'unknown')
          OR source_record.attribution IS NULL
          OR trim(source_record.attribution) = ''
          OR source_record.raw_checksum IS NULL
          OR trim(source_record.raw_checksum) = ''
        )

      UNION ALL

      SELECT
        'public_taxon_without_provenance',
        COUNT(*)::int
      FROM taxa AS taxon
      WHERE NOT EXISTS (
        SELECT 1
        FROM record_provenance AS provenance
        WHERE provenance.taxon_id = taxon.id
      )
        AND EXISTS (
          SELECT 1
          FROM biological_entities AS entity
          WHERE entity.taxon_id = taxon.id
            AND entity.visibility = 'public'
        )

      UNION ALL

      SELECT
        'public_entity_without_provenance',
        COUNT(*)::int
      FROM biological_entities AS entity
      WHERE entity.visibility = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          WHERE provenance.biological_entity_id = entity.id
        )

      UNION ALL

      SELECT
        'public_entity_without_accepted_source_review',
        COUNT(*)::int
      FROM biological_entities AS entity
      WHERE entity.visibility = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          JOIN source_records AS source_record
            ON source_record.id = provenance.source_record_id
          WHERE provenance.biological_entity_id = entity.id
            AND source_record.status = 'accepted'
            AND EXISTS (
              SELECT 1
              FROM source_record_reviews AS review
              WHERE review.source_record_id = source_record.id
                AND review.decision = 'accepted'
                AND review.license_confirmed = true
                AND review.attribution_confirmed = true
                AND review.privacy_confirmed = true
            )
        )

      UNION ALL

      SELECT
        'public_external_observation_without_provenance',
        COUNT(*)::int
      FROM observations AS observation
      WHERE observation.visibility = 'public'
        AND observation.observation_basis = 'external'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          WHERE provenance.observation_id = observation.id
        )

      UNION ALL

      SELECT
        'public_external_observation_without_accepted_source_review',
        COUNT(*)::int
      FROM observations AS observation
      WHERE observation.visibility = 'public'
        AND observation.observation_basis = 'external'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          JOIN source_records AS source_record
            ON source_record.id = provenance.source_record_id
          WHERE provenance.observation_id = observation.id
            AND source_record.status = 'accepted'
            AND EXISTS (
              SELECT 1
              FROM source_record_reviews AS review
              WHERE review.source_record_id = source_record.id
                AND review.decision = 'accepted'
                AND review.license_confirmed = true
                AND review.attribution_confirmed = true
                AND review.privacy_confirmed = true
            )
        )

      UNION ALL

      SELECT
        'public_external_media_without_provenance',
        COUNT(*)::int
      FROM media AS medium
      WHERE medium.visibility = 'public'
        AND medium.uri NOT LIKE '/models/%'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          WHERE provenance.media_id = medium.id
        )

      UNION ALL

      SELECT
        'public_external_media_without_accepted_source_review',
        COUNT(*)::int
      FROM media AS medium
      WHERE medium.visibility = 'public'
        AND medium.uri NOT LIKE '/models/%'
        AND NOT EXISTS (
          SELECT 1
          FROM record_provenance AS provenance
          JOIN source_records AS source_record
            ON source_record.id = provenance.source_record_id
          WHERE provenance.media_id = medium.id
            AND source_record.status = 'accepted'
            AND EXISTS (
              SELECT 1
              FROM source_record_reviews AS review
              WHERE review.source_record_id = source_record.id
                AND review.decision = 'accepted'
                AND review.license_confirmed = true
                AND review.attribution_confirmed = true
                AND review.privacy_confirmed = true
            )
        )

      UNION ALL

      SELECT
        'public_external_media_missing_rights',
        COUNT(*)::int
      FROM media AS medium
      WHERE medium.visibility = 'public'
        AND medium.uri NOT LIKE '/models/%'
        AND (
          medium.license_uri IS NULL
          OR lower(trim(medium.license_uri)) IN ('', 'unknown')
          OR medium.attribution IS NULL
          OR trim(medium.attribution) = ''
        )

      UNION ALL

      SELECT
        'accepted_claim_without_source',
        COUNT(*)::int
      FROM claims AS claim
      WHERE claim.visibility = 'public'
        AND claim.review_status = 'accepted'
        AND NOT EXISTS (
          SELECT 1
          FROM sources AS source
          WHERE source.id = claim.source_id
        )

      UNION ALL

      SELECT
        'published_guide_claim_without_source',
        COUNT(*)::int
      FROM growing_guide_claims AS guide_claim
      JOIN growing_guides AS guide
        ON guide.id = guide_claim.growing_guide_id
      WHERE guide.status = 'published'
        AND NOT EXISTS (
          SELECT 1
          FROM sources AS source
          WHERE source.id = guide_claim.source_id
        )

      UNION ALL

      SELECT
        'published_guide_invalid_coverage',
        COUNT(*)::int
      FROM growing_guides AS guide
      WHERE guide.status = 'published'
        AND (
          jsonb_typeof(guide.coverage) <> 'array'
          OR CASE
            WHEN jsonb_typeof(guide.coverage) = 'array'
              THEN jsonb_array_length(guide.coverage)
            ELSE -1
          END <> 15
          OR (
            SELECT COUNT(DISTINCT section->>'sectionKey')
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(guide.coverage) = 'array'
                  THEN guide.coverage
                ELSE '[]'::jsonb
              END
            ) AS section
          ) <> 15
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(guide.coverage) = 'array'
                  THEN guide.coverage
                ELSE '[]'::jsonb
              END
            ) AS section
            WHERE section->>'status' NOT IN (
              'documented', 'in_review', 'not_documented', 'not_applicable'
            )
          )
        )

      UNION ALL

      SELECT
        'published_guide_claim_without_covered_section',
        COUNT(*)::int
      FROM growing_guide_claims AS guide_claim
      JOIN growing_guides AS guide
        ON guide.id = guide_claim.growing_guide_id
      WHERE guide.status = 'published'
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(guide.coverage) = 'array'
                THEN guide.coverage
              ELSE '[]'::jsonb
            END
          ) AS section
          WHERE section->>'sectionKey' = guide_claim.section_key
            AND section->>'status' IN ('documented', 'in_review')
        )

      UNION ALL

      SELECT
        'public_accepted_cultural_missing_context',
        COUNT(*)::int
      FROM cultural_relations AS relation
      WHERE relation.access_level = 'public'
        AND relation.review_status = 'accepted'
        AND relation.sensitivity = 'normal'
        AND relation.culture_id IS NULL
        AND relation.community_id IS NULL

      UNION ALL

      SELECT
        'public_accepted_cultural_missing_source',
        COUNT(*)::int
      FROM cultural_relations AS relation
      WHERE relation.access_level = 'public'
        AND relation.review_status = 'accepted'
        AND relation.sensitivity = 'normal'
        AND NOT EXISTS (
          SELECT 1
          FROM sources AS source
          WHERE source.id = relation.source_id
        )

      UNION ALL

      SELECT
        'public_accepted_cultural_missing_review_audit',
        COUNT(*)::int
      FROM cultural_relations AS relation
      WHERE relation.access_level = 'public'
        AND relation.review_status = 'accepted'
        AND relation.sensitivity = 'normal'
        AND (
          relation.reviewed_by IS NULL
          OR trim(relation.reviewed_by) = ''
          OR relation.reviewed_at IS NULL
        )

      UNION ALL

      SELECT
        'public_accepted_cultural_exposes_restricted_context',
        COUNT(*)::int
      FROM cultural_relations AS relation
      LEFT JOIN communities AS community
        ON community.id = relation.community_id
      LEFT JOIN places AS place
        ON place.id = relation.place_id
      WHERE relation.access_level = 'public'
        AND relation.review_status = 'accepted'
        AND relation.sensitivity = 'normal'
        AND (
          (community.id IS NOT NULL AND community.visibility <> 'public')
          OR (place.id IS NOT NULL AND place.visibility <> 'public')
        )

      UNION ALL

      SELECT
        'public_place_without_public_geometry',
        COUNT(*)::int
      FROM places AS place
        WHERE place.visibility = 'public'
          AND place.geometry_public IS NULL
          AND EXISTS (
            SELECT 1
            FROM observations AS observation
            WHERE observation.place_id = place.id
              AND observation.visibility = 'public'
          )

      UNION ALL

      SELECT
        'public_lineage_without_accepted_source_review',
        COUNT(*)::int
      FROM lineage_relationships AS relationship
      WHERE (
        (
          relationship.parent_entity_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM biological_entities AS parent_entity
            WHERE parent_entity.id = relationship.parent_entity_id
              AND parent_entity.visibility = 'public'
          )
        )
        OR (
          relationship.parent_specimen_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM specimens AS parent_specimen
            JOIN biological_entities AS parent_entity
              ON parent_entity.id = parent_specimen.biological_entity_id
            WHERE parent_specimen.id = relationship.parent_specimen_id
              AND parent_specimen.visibility = 'public'
              AND parent_entity.visibility = 'public'
          )
        )
      )
      AND (
        (
          relationship.child_entity_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM biological_entities AS child_entity
            WHERE child_entity.id = relationship.child_entity_id
              AND child_entity.visibility = 'public'
          )
        )
        OR (
          relationship.child_specimen_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM specimens AS child_specimen
            JOIN biological_entities AS child_entity
              ON child_entity.id = child_specimen.biological_entity_id
            WHERE child_specimen.id = relationship.child_specimen_id
              AND child_specimen.visibility = 'public'
              AND child_entity.visibility = 'public'
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM record_provenance AS provenance
        JOIN source_records AS source_record
          ON source_record.id = provenance.source_record_id
        WHERE provenance.lineage_relationship_id = relationship.id
          AND source_record.status = 'accepted'
          AND EXISTS (
            SELECT 1
            FROM source_record_reviews AS review
            WHERE review.source_record_id = source_record.id
              AND review.decision = 'accepted'
              AND review.license_confirmed = true
              AND review.attribution_confirmed = true
              AND review.privacy_confirmed = true
          )
      )
    )
    SELECT check_key, violation_count
    FROM checks
    ORDER BY check_key
  `);

  const stateCounts = await sql.unsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM taxa) AS taxa,
      (SELECT COUNT(*)::int FROM biological_entities WHERE visibility = 'public') AS public_entities,
      (SELECT COUNT(*)::int FROM specimens WHERE visibility = 'public') AS public_specimens,
      (SELECT COUNT(*)::int FROM observations WHERE visibility = 'public') AS public_observations,
      (SELECT COUNT(*)::int FROM media WHERE visibility = 'public') AS public_media,
      (SELECT COUNT(*)::int FROM source_records WHERE status = 'pending') AS pending_source_records,
      (SELECT COUNT(*)::int FROM source_records WHERE status = 'accepted') AS accepted_source_records,
      (SELECT COUNT(*)::int FROM cultural_relations WHERE review_status = 'under-review') AS cultural_relations_under_review
  `);

  const violations = checks.filter((check) => check.violation_count > 0);
  assert.equal(
    violations.length,
    0,
    `Corpus audit failed: ${JSON.stringify(violations)}`,
  );

  console.log(
    JSON.stringify({
      checks: checks.length,
      violations: 0,
      state: stateCounts[0],
    }),
  );
} finally {
  await sql.end();
}
