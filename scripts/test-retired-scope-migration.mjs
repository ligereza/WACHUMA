import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for quality:retired-scope; this gate never falls back to fixtures.",
  );
}
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const migrationRun = spawnSync(packageManager, ["db:migrate"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: false,
});
if (migrationRun.error) throw migrationRun.error;
if (migrationRun.status !== 0) {
  throw new Error(`db:migrate failed (${migrationRun.status})`);
}
const migration = await readFile(
  resolve(root, "packages/db/migrations/0024_remove_out_of_scope_taxa.sql"),
  "utf8",
);
const sql = postgres(process.env.DATABASE_URL);

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(`
      INSERT INTO data_sources (id, provider_key, name, source_type)
      VALUES ('f0000000-0000-4000-8000-000000000024', 'retired-scope-test', 'retired scope test', 'test');
      INSERT INTO source_records (
        id, data_source_id, source_record_id, retrieved_at, attribution,
        assertion_type, raw_payload, importer_version
      ) VALUES
        ('f0000000-0000-4000-8000-000000000025', 'f0000000-0000-4000-8000-000000000024', 'retired', now(), 'test', 'editorial_interpretation', '{"taxon":"Opuntia ficus-indica"}', 'test'),
        ('f0000000-0000-4000-8000-000000000026', 'f0000000-0000-4000-8000-000000000024', 'kept', now(), 'test', 'editorial_interpretation', '{"taxon":"Echinopsis pachanoi"}', 'test');
      INSERT INTO sources (id, public_id, source_type, title, citation, attribution)
      VALUES
        ('f0000000-0000-4000-8000-000000000027', 'source-retired-scope-test', 'editorial', 'retired test source', 'retired', 'test'),
        ('f0000000-0000-4000-8000-000000000028', 'source-kept-scope-test', 'editorial', 'kept test source', 'kept', 'test');
      INSERT INTO taxa (id, public_id, scientific_name, rank)
      VALUES
        ('f0000000-0000-4000-8000-000000000029', 'taxon-opuntia-ficus-indica', 'Opuntia ficus-indica', 'species'),
        ('f0000000-0000-4000-8000-000000000041', 'taxon-pleurotus-ostreatus', 'Pleurotus ostreatus', 'species'),
        ('f0000000-0000-4000-8000-000000000030', 'taxon-test-pachanoi', 'Echinopsis pachanoi', 'species');
      INSERT INTO biological_entities (id, public_id, entity_type, display_name, taxon_id)
      VALUES
        ('f0000000-0000-4000-8000-000000000031', 'biological-entity-opuntia-ficus-indica', 'species', 'Opuntia ficus-indica', 'f0000000-0000-4000-8000-000000000029'),
        ('f0000000-0000-4000-8000-000000000042', 'biological-entity-pleurotus-ostreatus', 'species', 'Pleurotus ostreatus', 'f0000000-0000-4000-8000-000000000041'),
        ('f0000000-0000-4000-8000-000000000032', 'biological-entity-test-pachanoi', 'species', 'Echinopsis pachanoi', 'f0000000-0000-4000-8000-000000000030');
      INSERT INTO claims (id, public_id, subject_type, subject_id, predicate, object_text, assertion_type, source_id)
      VALUES
        ('f0000000-0000-4000-8000-000000000033', 'claim-retired-scope-test', 'biological_entity', 'f0000000-0000-4000-8000-000000000031', 'test', 'retired', 'editorial_interpretation', 'f0000000-0000-4000-8000-000000000027'),
        ('f0000000-0000-4000-8000-000000000034', 'claim-kept-scope-test', 'biological_entity', 'f0000000-0000-4000-8000-000000000032', 'test', 'kept', 'editorial_interpretation', 'f0000000-0000-4000-8000-000000000028');
      INSERT INTO claim_sources (claim_id, source_id, source_record_id)
      VALUES
        ('f0000000-0000-4000-8000-000000000033', 'f0000000-0000-4000-8000-000000000027', 'f0000000-0000-4000-8000-000000000025'),
        ('f0000000-0000-4000-8000-000000000034', 'f0000000-0000-4000-8000-000000000028', 'f0000000-0000-4000-8000-000000000026');
      INSERT INTO growing_guides (id, public_id, guide_key, version, title, biological_entity_id)
      VALUES ('f0000000-0000-4000-8000-000000000035', 'guide-retired-scope-test', 'retired-scope-test', 1, 'retired', 'f0000000-0000-4000-8000-000000000031');
      INSERT INTO growing_guide_claims (id, growing_guide_id, section_key, statement)
      VALUES ('f0000000-0000-4000-8000-000000000036', 'f0000000-0000-4000-8000-000000000035', 'observations', 'retired');
      INSERT INTO observations (id, public_id, biological_entity_id, observed_at, observation_basis)
      VALUES ('f0000000-0000-4000-8000-000000000037', 'observation-retired-scope-test', 'f0000000-0000-4000-8000-000000000031', now(), 'human');
      INSERT INTO media (id, media_type, uri, attribution)
      VALUES ('f0000000-0000-4000-8000-000000000038', 'image', 'https://example.test/retired', 'test');
      INSERT INTO media_attachments (media_id, observation_id)
      VALUES ('f0000000-0000-4000-8000-000000000038', 'f0000000-0000-4000-8000-000000000037');
      INSERT INTO external_identifiers (id, namespace, identifier, biological_entity_id)
      VALUES ('f0000000-0000-4000-8000-000000000039', 'test', 'retired', 'f0000000-0000-4000-8000-000000000031');
      INSERT INTO record_provenance (id, source_record_id, biological_entity_id, assertion_type)
      VALUES ('f0000000-0000-4000-8000-000000000040', 'f0000000-0000-4000-8000-000000000025', 'f0000000-0000-4000-8000-000000000031', 'editorial_interpretation');
      INSERT INTO record_provenance (id, source_record_id, growing_guide_id, assertion_type)
      VALUES ('f0000000-0000-4000-8000-000000000043', 'f0000000-0000-4000-8000-000000000025', 'f0000000-0000-4000-8000-000000000035', 'editorial_interpretation');
      INSERT INTO source_record_reviews (source_record_id, reviewer, decision, note)
      VALUES ('f0000000-0000-4000-8000-000000000025', 'test', 'rejected', 'test');
    `);

    await tx.unsafe(migration);

    const retired = await tx`
      SELECT COUNT(*)::int AS count
      FROM taxa
      WHERE public_id IN ('taxon-opuntia-ficus-indica', 'taxon-pleurotus-ostreatus')
    `;
    const kept = await tx`
      SELECT COUNT(*)::int AS count
      FROM taxa
      WHERE public_id = 'taxon-test-pachanoi'
    `;
    const orphaned = await tx`
      SELECT COUNT(*)::int AS count
      FROM source_records
      WHERE id = 'f0000000-0000-4000-8000-000000000025'
    `;
    assert.equal(retired[0].count, 0);
    assert.equal(kept[0].count, 1);
    assert.equal(orphaned[0].count, 0);

    throw new Error("ROLLBACK_RETIRED_SCOPE_TEST");
  });
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "ROLLBACK_RETIRED_SCOPE_TEST"
  ) {
    console.log(
      JSON.stringify({
        retiredRecordsRemoved: true,
        keptRecordsPreserved: true,
      }),
    );
  } else {
    throw error;
  }
} finally {
  await sql.end();
}
