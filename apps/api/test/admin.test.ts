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
