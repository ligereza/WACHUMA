import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("OpenAPI is served by the same API process", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/docs/json",
  });

  assert.equal(response.statusCode, 200);
  const document = response.json() as {
    openapi: string;
    paths: Record<string, unknown>;
  };
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths["/species"]);
  assert.ok(document.paths["/scenes/{publicId}"]);
  await app.close();
});
