import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("an API without PostgreSQL stays empty when demo mode is disabled", async () => {
  const app = buildApi({ demoMode: false });

  const species = await app.inject({
    method: "GET",
    url: "/api/v1/species?search=pachanoi",
  });
  assert.equal(species.statusCode, 200);
  assert.deepEqual(species.json(), []);

  const sources = await app.inject({
    method: "GET",
    url: "/api/v1/sources",
  });
  assert.equal(sources.statusCode, 200);
  assert.deepEqual(sources.json(), []);

  const missingSpecies = await app.inject({
    method: "GET",
    url: "/api/v1/species/biological-entity-echinopsis-pachanoi",
  });
  assert.equal(missingSpecies.statusCode, 404);

  const scenes = await app.inject({
    method: "GET",
    url: "/api/v1/scenes",
  });
  assert.equal(scenes.statusCode, 200);
  assert.deepEqual(scenes.json(), []);

  await app.close();
});
