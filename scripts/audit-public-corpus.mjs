import assert from "node:assert/strict";
// The database workspace owns the PostgreSQL client; the root scripts package
// intentionally does not duplicate that runtime dependency.
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for audit:public-corpus; this audit never falls back to fixtures.",
  );
}

const sql = postgres(databaseUrl, { max: 1 });
const checks = [
  [
    "public_specimens",
    sql`
      SELECT public_id
      FROM specimens
      WHERE visibility = 'public'
        AND (public_id ILIKE '%demo%' OR notes ILIKE '%sintét%' OR notes ILIKE '%fixture%')
    `,
  ],
  [
    "public_observations",
    sql`
      SELECT public_id
      FROM observations
      WHERE visibility = 'public'
        AND (public_id ILIKE '%demo%' OR notes ILIKE '%sintét%' OR environment->>'synthetic' = 'true')
    `,
  ],
  [
    "public_places",
    sql`
      SELECT public_id
      FROM places
      WHERE visibility = 'public'
        AND (public_id ILIKE '%demo%' OR place_type ILIKE '%synthetic%' OR description ILIKE '%sintét%')
    `,
  ],
  [
    "public_locations",
    sql`
      SELECT public_id
      FROM locations
      WHERE visibility = 'public'
        AND (public_id ILIKE '%demo%' OR notes ILIKE '%sintét%')
    `,
  ],
  [
    "public_claims",
    sql`
      SELECT claim.public_id
      FROM claims AS claim
      LEFT JOIN sources AS source ON source.id = claim.source_id
      WHERE claim.visibility = 'public'
        AND (claim.object_text ILIKE '%sintét%'
          OR claim.object_text ILIKE '%fixture%'
          OR source.public_id ILIKE '%demo%')
    `,
  ],
  [
    "published_guides",
    sql`
      SELECT public_id
      FROM growing_guides
      WHERE status = 'published'
        AND (public_id ILIKE '%demo%' OR title ILIKE '%demo%' OR summary ILIKE '%sintét%')
    `,
  ],
  [
    "public_cultural_relations",
    sql`
      SELECT public_id
      FROM cultural_relations
      WHERE access_level = 'public'
        AND (public_id ILIKE '%demo%' OR description ILIKE '%fixture%' OR description ILIKE '%sintét%')
    `,
  ],
  [
    "public_media",
    sql`
      SELECT uri
      FROM media
      WHERE visibility = 'public'
        AND (uri ILIKE '%demo%' OR title ILIKE '%demo%' OR title ILIKE '%sintét%')
    `,
  ],
  [
    "public_scenes",
    sql`
      SELECT public_id
      FROM garden_scenes
      WHERE visibility = 'public'
        AND (public_id ILIKE '%demo%' OR name ILIKE '%demo%' OR description ILIKE '%sintét%')
    `,
  ],
  [
    "public_recipes",
    sql`
      SELECT public_id
      FROM procedural_recipes
      WHERE visibility = 'public'
        AND public_id ILIKE '%demo%'
    `,
  ],
  [
    "public_material_fixtures",
    sql`
      SELECT mf.public_id
      FROM material_fixtures AS mf
      LEFT JOIN biological_entities AS entity
        ON entity.id = mf.biological_entity_id
      LEFT JOIN specimens AS specimen
        ON specimen.id = mf.specimen_id
      WHERE mf.visibility = 'public'
        AND (
          (mf.interpretation->>'scientificReconstruction') <> 'false'
          OR (mf.biological_entity_id IS NOT NULL AND entity.visibility <> 'public')
          OR (mf.specimen_id IS NOT NULL AND specimen.visibility <> 'public')
          OR mf.public_id ILIKE '%demo%'
        )
    `,
  ],
  [
    "public_chemistry_bindings_without_provenance",
    sql`
      SELECT binding.public_id
      FROM material_fixture_bindings AS binding
      JOIN material_fixtures AS fixture
        ON fixture.id = binding.material_fixture_id
      WHERE fixture.visibility = 'public'
        AND binding.layer = 'chemistry'
        AND (
          NOT EXISTS (
            SELECT 1
            FROM material_fixture_binding_claims AS binding_claim
            WHERE binding_claim.binding_id = binding.id
          )
          OR NOT EXISTS (
            SELECT 1
            FROM material_fixture_binding_sources AS binding_source
            WHERE binding_source.binding_id = binding.id
          )
          OR EXISTS (
            SELECT 1
            FROM material_fixture_binding_claims AS binding_claim
            JOIN claims AS claim ON claim.id = binding_claim.claim_id
            WHERE binding_claim.binding_id = binding.id
              AND claim.visibility <> 'public'
          )
        )
    `,
  ],
];

try {
  const violations = [];
  for (const [key, query] of checks) {
    const rows = await query;
    for (const row of rows) {
      violations.push({ check: key, record: row });
    }
  }

  assert.equal(
    violations.length,
    0,
    `Public corpus contains synthetic or demo records: ${JSON.stringify(violations)}`,
  );

  const [state] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM biological_entities WHERE visibility = 'public') AS public_entities,
      (SELECT COUNT(*)::int FROM growing_guides WHERE status = 'published') AS published_guides,
      (SELECT COUNT(*)::int FROM observations WHERE visibility = 'public') AS public_observations,
      (SELECT COUNT(*)::int FROM specimens WHERE visibility = 'public') AS public_specimens,
      (SELECT COUNT(*)::int FROM material_fixtures WHERE visibility = 'public') AS public_material_fixtures
  `;
  assert.equal(
    state.public_entities,
    1,
    `The public monographic corpus must expose exactly one biological entity: ${JSON.stringify(state)}`,
  );
  assert.equal(
    state.published_guides,
    1,
    `The public monographic corpus must expose exactly one published guide: ${JSON.stringify(state)}`,
  );
  assert.equal(
    state.public_material_fixtures,
    1,
    `The public monographic corpus must expose exactly one public material fixture: ${JSON.stringify(state)}`,
  );
  console.log(JSON.stringify({ checks: checks.length, violations: 0, state }));
} finally {
  await sql.end();
}
