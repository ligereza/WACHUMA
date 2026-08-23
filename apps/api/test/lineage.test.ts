import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("demo species exposes a safe isolated lineage tree", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/lineage/biological-entity-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    relationships: unknown[];
    tree: { roots: string[]; nodes: Array<{ id: string }> };
  };
  assert.deepEqual(body.relationships, []);
  assert.deepEqual(body.tree.roots, ["biological-entity-echinopsis-pachanoi"]);
  assert.equal(body.tree.nodes[0]?.id, "biological-entity-echinopsis-pachanoi");
  await app.close();
});

test("private specimen lineage is not disclosed by the public API", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/lineage/specimen-demo-01",
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "not_found");
  await app.close();
});

test("public specimen lineage exposes multiple relationship types", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/lineage/specimen-public-demo-01",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    relationships: Array<{ relationshipType: string; childId: string }>;
    tree: { roots: string[] };
  };
  assert.deepEqual(
    body.relationships.map((relationship) => relationship.relationshipType),
    ["cutting_of"],
  );
  assert.equal(body.relationships[0]?.childId, "specimen-public-child-01");
  assert.deepEqual(body.tree.roots, ["specimen-public-demo-01"]);
  await app.close();
});
