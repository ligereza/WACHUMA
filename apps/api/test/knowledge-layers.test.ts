import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("public claims expose evidence metadata without collapsing observation and interpretation", async () => {
  const app = buildApi();
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/claims?subjectPublicId=biological-entity-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const claim = response.json()[0];
  assert.equal(claim.predicate, "hasScientificName");
  assert.equal(claim.assertionType, "taxonomic_fact");
  assert.equal(claim.reviewStatus, "accepted");
  assert.ok(claim.sourceId);
  assert.ok(claim.license);
  await app.close();
});

test("public derivation endpoint returns explicit input and output materials", async () => {
  const app = buildApi();
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/derivations?subjectPublicId=specimen-public-child-01",
  });

  assert.equal(response.statusCode, 200);
  const event = response.json()[0];
  assert.equal(event.eventType, "cutting");
  assert.equal(event.materials.length, 2);
  assert.deepEqual(
    event.materials.map(
      (material: { direction: string }) => material.direction,
    ),
    ["input", "output"],
  );
  await app.close();
});

test("public trait endpoint preserves method, unit and uncertainty", async () => {
  const app = buildApi();
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/traits?subjectPublicId=specimen-public-demo-01",
  });

  assert.equal(response.statusCode, 200);
  const trait = response.json()[0];
  assert.equal(trait.traitIdentifier, "height_cm");
  assert.equal(trait.valueNumeric, 42);
  assert.equal(trait.unit, "cm");
  assert.deepEqual(trait.uncertainty, { synthetic: true });
  assert.ok(trait.sourceId);
  await app.close();
});
