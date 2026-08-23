import assert from "node:assert/strict";
import test from "node:test";

import {
  ClaimInputSchema,
  NotFoundError,
  PublicIdParamsSchema,
  ProvenanceInputSchema,
  validateDerivationMaterials,
  toApiErrorBody,
} from "../dist/index.js";

test("public ids accept stable URL-safe identifiers only", () => {
  assert.equal(
    PublicIdParamsSchema.safeParse({ publicId: "echinopsis-pachanoi" }).success,
    true,
  );
  assert.equal(
    PublicIdParamsSchema.safeParse({ publicId: "../../private" }).success,
    false,
  );
  assert.equal(
    PublicIdParamsSchema.safeParse({ publicId: "Name With Spaces" }).success,
    false,
  );
});

test("provenance rejects claims without a source record", () => {
  const result = ProvenanceInputSchema.safeParse({
    source: "gbif",
    retrievedAt: "2026-08-21T00:00:00Z",
    license: "CC0-1.0",
    attribution: "GBIF",
    assertionType: "taxonomic_fact",
    rawPayload: { key: 1 },
    importerVersion: "gbif-v0.1.0",
  });

  assert.equal(result.success, false);
});

test("domain errors produce stable API envelopes", () => {
  const result = toApiErrorBody(
    new NotFoundError("species", "echinopsis-pachanoi"),
    "request-123",
  );

  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, {
    error: "not_found",
    message: "species not found",
    requestId: "request-123",
    details: { resource: "species", publicId: "echinopsis-pachanoi" },
  });
});

test("derivation validation turns incomplete lineage into stable issues", () => {
  const issues = validateDerivationMaterials([
    { direction: "output", specimenId: "specimen-output" },
  ]);

  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["missing_input"],
  );
});

test("public claim validation rejects unreviewed or unlicensed assertions", () => {
  const result = ClaimInputSchema.safeParse({
    publicId: "claim-invalid-publication",
    subjectType: "biological_entity",
    subjectId: "00000000-0000-4000-8000-000000000001",
    predicate: "wachuma:example",
    objectText: "example",
    assertionType: "editorial_interpretation",
    evidenceLevel: "reported",
    sourceId: "00000000-0000-4000-8000-000000000002",
    visibility: "public",
    license: "unknown",
    reviewStatus: "draft",
  });

  assert.equal(result.success, false);
});
