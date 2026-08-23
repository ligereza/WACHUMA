import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("public scene endpoint does not expose restricted objects", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/scenes/garden-demo-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    scene: { visibility: string };
    assets: unknown[];
    objects: unknown[];
    recipes: unknown[];
  };

  assert.equal(body.scene.visibility, "public");
  assert.equal(body.assets.length, 1);
  assert.deepEqual(body.objects, []);
  assert.equal(body.recipes.length, 1);
  await app.close();
});

test("unknown scene returns a stable 404 response", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/scenes/not-a-real-scene",
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "not_found");
  await app.close();
});

test("invalid public ids return a stable validation envelope", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/scenes/NOT_VALID",
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  assert.ok(response.json().requestId);
  await app.close();
});
