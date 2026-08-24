import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("public culture route does not publish the restricted demo relation", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/culture/relations?subjectPublicId=biological-entity-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), []);
  await app.close();
});

test("public map and source fallbacks remain attributable", async () => {
  const app = buildApi();

  const mapResponse = await app.inject({
    method: "GET",
    url: "/api/v1/map/places",
  });
  const sourcesResponse = await app.inject({
    method: "GET",
    url: "/api/v1/sources",
  });

  assert.equal(mapResponse.statusCode, 200);
  assert.equal(mapResponse.json()[0]?.publicId, "place-demo-public");
  assert.equal(mapResponse.json()[0]?.source, "source-wachuma-demo-editorial");
  assert.equal(sourcesResponse.statusCode, 200);
  assert.ok(
    sourcesResponse
      .json()
      .every((source: { license?: string; attribution?: string }) =>
        Boolean(source.license && source.attribution),
      ),
  );
  await app.close();
});

test("public observation fallback keeps safe geometry and subject identity", async () => {
  const app = buildApi();
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/observations?subjectPublicId=biological-entity-echinopsis-pachanoi",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0]?.publicId, "observation-demo-public-01");
  assert.equal("geometryExact" in response.json()[0], false);
  await app.close();
});

test("cultivation events stay separate from growing-guide claims", async () => {
  const app = buildApi();

  const publicResponse = await app.inject({
    method: "GET",
    url: "/api/v1/cultivation/events?specimenPublicId=specimen-public-demo-01",
  });
  const privateResponse = await app.inject({
    method: "GET",
    url: "/api/v1/cultivation/events?specimenPublicId=specimen-demo-01",
  });

  assert.equal(publicResponse.statusCode, 200);
  assert.equal(publicResponse.json()[0]?.eventType, "observation");
  assert.match(publicResponse.json()[0]?.notes, /no es una recomendación/);
  assert.equal(privateResponse.statusCode, 200);
  assert.deepEqual(privateResponse.json(), []);
  await app.close();
});

test("demo guide fallback is versioned, archived and keeps claim provenance", async () => {
  const app = buildApi();
  const response = await app.inject({ method: "GET", url: "/api/v1/guides" });
  assert.equal(response.statusCode, 200);
  const body = response.json() as Array<{
    publicId: string;
    version: number;
    status: string;
    sections: Array<{ sectionKey: string; status: string; claimCount: number }>;
    claims: Array<{ sourceId?: string }>;
  }>;
  assert.equal(body[0]?.publicId, "guide-echinopsis-pachanoi-demo-v1");
  assert.equal(body[0]?.version, 1);
  assert.equal(body[0]?.status, "archived");
  assert.equal(body[0]?.sections.length, 15);
  assert.equal(
    body[0]?.sections.find((section) => section.sectionKey === "watering")
      ?.status,
    "not_documented",
  );
  assert.ok(body[0]?.claims.every((claim) => claim.sourceId));
  await app.close();
});
