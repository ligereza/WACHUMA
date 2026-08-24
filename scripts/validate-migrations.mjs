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
assert.ok(files.includes("0007_derivation_material_labels.sql"));
assert.ok(files.includes("0008_horticultural_sources.sql"));
assert.ok(files.includes("0009_source_record_reviews.sql"));
assert.ok(files.includes("0010_taxon_projection_reviews.sql"));
assert.ok(files.includes("0011_source_review_taxonomy_confirmation.sql"));
assert.ok(files.includes("0012_provenance_idempotency.sql"));
assert.ok(files.includes("0013_growing_guide_provenance_idempotency.sql"));
assert.ok(files.includes("0014_garden_specimen_provenance.sql"));
assert.ok(files.includes("0015_fix_record_provenance_subject_check.sql"));
assert.ok(files.includes("0017_growing_guide_coverage.sql"));
assert.ok(files.includes("0018_cultural_relation_review_metadata.sql"));
assert.ok(files.includes("0019_lineage_provenance.sql"));
assert.ok(files.includes("0020_external_identifier_provenance.sql"));

const externalIdentifierProvenance = await readFile(
  resolve(migrationDirectory, "0020_external_identifier_provenance.sql"),
  "utf8",
);
assert.match(externalIdentifierProvenance, /external_identifier_id/);
assert.match(
  externalIdentifierProvenance,
  /record_provenance_external_identifier_unique_idx/,
);

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

const sourceReviewMigration = await readFile(
  resolve(migrationDirectory, "0009_source_record_reviews.sql"),
  "utf8",
);
assert.match(sourceReviewMigration, /ADD COLUMN IF NOT EXISTS review_notes/);
assert.match(
  sourceReviewMigration,
  /CREATE TABLE IF NOT EXISTS source_record_reviews/,
);
assert.match(sourceReviewMigration, /license_confirmed/);
assert.match(sourceReviewMigration, /privacy_confirmed/);

const taxonPromotionMigration = await readFile(
  resolve(migrationDirectory, "0010_taxon_projection_reviews.sql"),
  "utf8",
);
assert.match(taxonPromotionMigration, /review_kind/);
assert.match(taxonPromotionMigration, /taxonomic_promotion/);
assert.match(taxonPromotionMigration, /taxonomy_confirmed/);

const taxonomyConfirmationMigration = await readFile(
  resolve(migrationDirectory, "0011_source_review_taxonomy_confirmation.sql"),
  "utf8",
);
assert.match(
  taxonomyConfirmationMigration,
  /ADD COLUMN IF NOT EXISTS taxonomy_confirmed/,
);

const provenanceIdempotencyMigration = await readFile(
  resolve(migrationDirectory, "0012_provenance_idempotency.sql"),
  "utf8",
);
assert.match(
  provenanceIdempotencyMigration,
  /record_provenance_cultural_relation_unique_idx/,
);

const growingGuideProvenanceMigration = await readFile(
  resolve(migrationDirectory, "0013_growing_guide_provenance_idempotency.sql"),
  "utf8",
);
assert.match(
  growingGuideProvenanceMigration,
  /record_provenance_growing_guide_unique_idx/,
);
assert.match(growingGuideProvenanceMigration, /ROW_NUMBER\(\)/);

const gardenSpecimenProvenanceMigration = await readFile(
  resolve(migrationDirectory, "0014_garden_specimen_provenance.sql"),
  "utf8",
);
assert.match(
  gardenSpecimenProvenanceMigration,
  /record_provenance_specimen_unique_idx/,
);

const recordProvenanceCheckMigration = await readFile(
  resolve(migrationDirectory, "0015_fix_record_provenance_subject_check.sql"),
  "utf8",
);
assert.match(recordProvenanceCheckMigration, /DROP CONSTRAINT/);
assert.match(recordProvenanceCheckMigration, /cultivation_event_id/);
assert.doesNotMatch(
  recordProvenanceCheckMigration,
  /num_nonnulls\([\s\S]*source_id/,
);

const guideCoverageMigration = await readFile(
  resolve(migrationDirectory, "0017_growing_guide_coverage.sql"),
  "utf8",
);
assert.match(guideCoverageMigration, /ALTER TABLE growing_guides/);
assert.match(guideCoverageMigration, /ADD COLUMN IF NOT EXISTS coverage jsonb/);

const culturalReviewMetadataMigration = await readFile(
  resolve(migrationDirectory, "0018_cultural_relation_review_metadata.sql"),
  "utf8",
);
assert.match(culturalReviewMetadataMigration, /ALTER TABLE cultural_relations/);
assert.match(
  culturalReviewMetadataMigration,
  /ADD COLUMN IF NOT EXISTS reviewed_by/,
);
assert.match(
  culturalReviewMetadataMigration,
  /ADD COLUMN IF NOT EXISTS reviewed_at/,
);

console.log(JSON.stringify({ migrations: files, idempotentRunner: true }));
