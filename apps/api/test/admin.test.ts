import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

const locationBody = {
  publicId: "greenhouse-demo",
  name: "Invernadero demo",
  locationType: "greenhouse",
  visibility: "restricted",
};

test("protected garden writes reject missing and invalid credentials", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const missing = await app.inject({
    method: "POST",
    url: "/api/v1/admin/locations",
    payload: locationBody,
  });
  assert.equal(missing.statusCode, 403);
  assert.equal(missing.json().error, "forbidden");

  const invalid = await app.inject({
    method: "POST",
    url: "/api/v1/admin/locations",
    headers: { authorization: "Bearer wrong-token" },
    payload: locationBody,
  });
  assert.equal(invalid.statusCode, 403);
  assert.equal(invalid.json().error, "forbidden");
  await app.close();
});

test("source-record publication review is protected and requires all confirmations", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const missing = await app.inject({
    method: "GET",
    url: "/api/v1/admin/source-records?provider=gbif&status=pending",
  });
  assert.equal(missing.statusCode, 403);

  const invalid = await app.inject({
    method: "POST",
    url: "/api/v1/admin/source-records/00000000-0000-4000-8000-000000000001/review",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      reviewer: "editor-test",
      decision: "accepted",
      note: "No debe publicarse sin las confirmaciones completas.",
      licenseConfirmed: true,
      attributionConfirmed: true,
      privacyConfirmed: false,
    },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error, "validation_error");

  const malformedId = await app.inject({
    method: "POST",
    url: "/api/v1/admin/source-records/not-a-uuid/review",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      reviewer: "editor-test",
      decision: "rejected",
      note: "Identificador inválido.",
      licenseConfirmed: false,
      attributionConfirmed: false,
      privacyConfirmed: false,
    },
  });
  assert.equal(malformedId.statusCode, 400);
  assert.equal(malformedId.json().error, "validation_error");
  await app.close();
});

test("taxon promotion requires a separate taxonomic confirmation", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/source-records/00000000-0000-4000-8000-000000000001/promote-taxon",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      reviewer: "editor-test",
      note: "No debe promoverse sin confirmar la identidad taxonómica.",
      taxonomyConfirmed: false,
      licenseConfirmed: true,
      attributionConfirmed: true,
      privacyConfirmed: true,
    },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});

test("protected garden writes validate input before requiring database persistence", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const invalidBody = await app.inject({
    method: "POST",
    url: "/api/v1/admin/locations",
    headers: { authorization: "Bearer test-admin-token" },
    payload: { ...locationBody, publicId: "NOT-URL-SAFE" },
  });
  assert.equal(invalidBody.statusCode, 400);
  assert.equal(invalidBody.json().error, "validation_error");

  const withoutDatabase = await app.inject({
    method: "POST",
    url: "/api/v1/admin/locations",
    headers: { authorization: "Bearer test-admin-token" },
    payload: locationBody,
  });
  assert.equal(withoutDatabase.statusCode, 503);
  assert.equal(withoutDatabase.json().error, "internal_error");
  await app.close();
});

test("garden intake never accepts a public specimen before provenance review", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/garden/intake/specimens",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      publicId: "garden-intake-public-attempt",
      specimenType: "plant-live",
      biologicalEntityPublicId: "biological-entity-echinopsis-pachanoi",
      status: "alive",
      visibility: "public",
      provenance: {
        sourceRecordId: "garden:public-attempt:v1",
        retrievedAt: "2026-08-23T00:00:00.000Z",
        license: "WACHUMA-GARDEN-PRIVATE",
        attribution: "WACHUMA garden ledger",
        rawPayload: { synthetic: false },
        importerVersion: "garden-intake-0.1.0",
        assertionType: "contemporary_observation",
        sourcePublicId: "source-wachuma-garden-ledger",
      },
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});

test("lineage intake rejects self relationships before database persistence", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/lineage/relationships",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      relationshipType: "clone_of",
      parent: {
        kind: "specimen",
        publicId: "specimen-garden-self",
      },
      child: {
        kind: "specimen",
        publicId: "specimen-garden-self",
      },
      provenance: {
        sourceRecordId: "lineage:self:v1",
        retrievedAt: "2026-08-23T00:00:00.000Z",
        license: "WACHUMA-GARDEN-PRIVATE",
        attribution: "WACHUMA garden ledger",
        rawPayload: { synthetic: true },
        importerVersion: "lineage-intake-0.1.0",
        assertionType: "editorial_interpretation",
        sourcePublicId: "source-wachuma-garden-ledger",
      },
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});

test("cultural relation workflow rejects an accepted restricted claim", async () => {
  const app = buildApi({ adminToken: "test-admin-token" });

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/culture/relations",
    headers: { authorization: "Bearer test-admin-token" },
    payload: {
      publicId: "cultural-relation-test",
      relationType: "vernacular_name",
      subjectPublicId: "biological-entity-echinopsis-pachanoi",
      valueText: "nombre de prueba",
      description: "Registro sintético para probar la regla de publicación.",
      communityPublicId: "community-demo-pending-review",
      sourcePublicId: "source-wachuma-demo-editorial",
      evidenceLevel: "reported",
      assertionType: "community_knowledge",
      authorPerspective: "perspectiva de prueba",
      sensitivity: "sensitive",
      accessLevel: "restricted",
      license: "WACHUMA-PROJECT",
      reviewStatus: "accepted",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});

test("cultural takedown requires a reason before database access", async () => {
  const app = buildApi({ adminToken: "secret-token" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/culture/relations/cultural-relation-demo/takedown",
    headers: { authorization: "Bearer secret-token" },
    payload: {},
  });
  assert.equal(response.statusCode, 400);
  await app.close();
});

test("cultural relation input requires a community or biological culture context", async () => {
  const app = buildApi({ adminToken: "secret-token" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/culture/relations",
    headers: { authorization: "Bearer secret-token" },
    payload: {
      publicId: "cultural-relation-without-context",
      relationType: "vernacular_name",
      subjectPublicId: "biological-entity-echinopsis-pachanoi",
      description: "No debe persistirse sin un contexto trazable.",
      sourcePublicId: "source-wachuma-demo-editorial",
      evidenceLevel: "unverified",
      assertionType: "editorial_interpretation",
      authorPerspective: "prueba de validación",
      sensitivity: "sensitive",
      accessLevel: "restricted",
      license: "WACHUMA-PROJECT",
      reviewStatus: "draft",
    },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});
