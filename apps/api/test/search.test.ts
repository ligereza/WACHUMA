import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("public search exposes attributable demo resources", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=pachanoi&limit=10",
  });

  assert.equal(response.statusCode, 200);
  const results = response.json() as Array<{
    kind: string;
    publicId: string;
    path: string;
    sourcePublicIds: string[];
  }>;
  assert.ok(results.some((result) => result.kind === "species"));
  assert.ok(results.some((result) => result.kind === "guide"));
  assert.ok(results.every((result) => result.path.startsWith("/")));
  assert.ok(results.every((result) => Array.isArray(result.sourcePublicIds)));
  await app.close();
});

test("public search rejects invalid query lengths", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: `/api/v1/search?q=${"x".repeat(161)}`,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "validation_error");
  await app.close();
});
