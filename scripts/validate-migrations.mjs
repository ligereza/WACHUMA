import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectory = resolve(root, "packages/db/migrations");
const files = (await readdir(migrationDirectory))
  .filter((file) => /^\d{4}_[a-z0-9_-]+\.sql$/.test(file))
  .sort();

const baselineMigrations = [
  "0001_initial.sql",
  "0002_scene_3d.sql",
  "0003_domain_hardening.sql",
  "0004_cultural_context_identifiers.sql",
  "0005_location_updated_at.sql",
  "0006_evidence_materials_traits_protocols.sql",
];
assert.deepEqual(files.slice(0, baselineMigrations.length), baselineMigrations);
assert.equal(new Set(files).size, files.length);

const runner = await readFile(
  resolve(root, "packages/db/src/migrate.ts"),
  "utf8",
);
assert.match(runner, /CREATE TABLE IF NOT EXISTS _wachuma_migrations/);
assert.match(runner, /SELECT id FROM _wachuma_migrations/);
assert.match(runner, /if \(existing\) continue/);

const hardening = await readFile(
  resolve(migrationDirectory, "0003_domain_hardening.sql"),
  "utf8",
);
assert.match(hardening, /ADD COLUMN IF NOT EXISTS value_text/);
assert.match(
  hardening,
  /ALTER TABLE places[\s\S]*ADD COLUMN IF NOT EXISTS source_id/,
);
assert.match(hardening, /CREATE UNIQUE INDEX IF NOT EXISTS/);
assert.match(hardening, /media_uri_unique_idx/);
assert.match(hardening, /record_provenance_observation_unique_idx/);
assert.match(hardening, /record_provenance_biological_entity_unique_idx/);
assert.match(hardening, /review_notes/);
assert.match(hardening, /WHERE public_id IS NULL/);

const culturalContext = await readFile(
  resolve(migrationDirectory, "0004_cultural_context_identifiers.sql"),
  "utf8",
);
assert.match(culturalContext, /ALTER TABLE agents/);
assert.match(culturalContext, /ALTER TABLE cultures/);
assert.match(culturalContext, /ALTER TABLE historical_periods/);
assert.match(culturalContext, /agents_public_id_idx/);

const locationHardening = await readFile(
  resolve(migrationDirectory, "0005_location_updated_at.sql"),
  "utf8",
);
assert.match(locationHardening, /ALTER TABLE locations/);
assert.match(locationHardening, /ADD COLUMN IF NOT EXISTS updated_at/);

const evidenceMigration = await readFile(
  resolve(migrationDirectory, "0006_evidence_materials_traits_protocols.sql"),
  "utf8",
);
assert.match(evidenceMigration, /CREATE TABLE claims/);
assert.match(evidenceMigration, /CREATE TABLE derivation_events/);
assert.match(evidenceMigration, /CREATE TABLE trait_measurements/);
assert.match(evidenceMigration, /CREATE TABLE source_record_quality_flags/);
assert.match(evidenceMigration, /source_id uuid NOT NULL REFERENCES sources/);

const seed = await readFile(resolve(root, "packages/db/src/seed.ts"), "utf8");
assert.match(seed, /media_type,[\s\S]*'model3d'/);

const sceneMigration = await readFile(
  resolve(migrationDirectory, "0002_scene_3d.sql"),
  "utf8",
);
assert.match(sceneMigration, /'model3d'/);
assert.match(sceneMigration, /'texture'/);

console.log(JSON.stringify({ migrations: files, idempotentRunner: true }));
