import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("public garden endpoint exposes only the synthetic public specimen", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/garden/specimens",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as Array<{
    publicId: string;
    visibility: string;
  }>;
  assert.equal(body.length, 1);
  assert.equal(body[0]?.publicId, "specimen-public-demo-01");
  assert.equal(body[0]?.visibility, "public");
  await app.close();
});

test("private or unknown specimen is not disclosed through the public route", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/specimens/specimen-demo-01",
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "not_found");
  await app.close();
});

test("public specimen detail contains a QR URL but no exact location", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/specimens/specimen-public-demo-01",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as { qrUrl: string; currentLocation?: unknown };
  assert.match(body.qrUrl, /specimens\/specimen-public-demo-01$/);
  assert.equal("currentLocation" in body, false);
  await app.close();
});

test("public garden locations do not expose private location rows", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/garden/locations",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), []);
  await app.close();
});
