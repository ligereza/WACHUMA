import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

test("species explorer returns the explicit demo record", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/species?search=pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as Array<{
    publicId: string;
    scientificName: string;
    externalIdentifiers: unknown[];
  }>;
  assert.equal(body.length, 1);
  assert.equal(body[0]?.publicId, "biological-entity-echinopsis-pachanoi");
  assert.equal(body[0]?.scientificName, "Echinopsis pachanoi");
  assert.deepEqual(
    body[0]?.externalIdentifiers.map(
      (identifier: { namespace: string; identifier: string }) =>
        `${identifier.namespace}:${identifier.identifier}`,
    ),
    ["ipni:88444-2", "gbif:5622352", "gbif:11093098"],
  );
  await app.close();
});

test("species detail keeps cultural names contextualized and sourced", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/species/biological-entity-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    taxonomicVariants: Array<{
      name: string;
      relationType: string;
      sourcePublicId: string;
      reviewStatus: string;
    }>;
    vernacularNames: Array<{
      term: string;
      sourcePublicId: string;
      context: string;
    }>;
    sources: Array<{ publicId: string }>;
  };
  assert.deepEqual(
    body.vernacularNames.map((name) => name.term),
    ["San Pedro"],
  );
  assert.ok(body.vernacularNames.every((name) => name.sourcePublicId));
  assert.ok(
    body.vernacularNames.every((name) =>
      name.context.includes("equivalencia taxonómica"),
    ),
  );
  assert.deepEqual(
    body.sources.map((source) => source.publicId),
    [
      "source-ipni-trichocereus-pachanoi-1920",
      "source-schlumpberger-renner-echinopsis-2012",
      "source-albesiano-terrazas-trichocereus-2012",
      "source-utn-echinopsis-pachanoi-habitat-2017",
      "source-wachuma-demo-editorial",
      "source-unprg-echinopsis-pachanoi-rhizosphere-2023",
      "source-untumbes-echinopsis-metabolomics-2020",
      "source-scielo-echinopsis-pachanoi-rhizosphere-2025",
      "source-powo-echinopsis-pachanoi",
      "source-gbif-echinopsis-pachanoi",
      "source-armijos-saraguro-yachakkuna-2014",
      "source-rhs-cacti-succulents-guide",
    ],
  );
  assert.equal(body.taxonomicVariants[0]?.name, "Trichocereus pachanoi");
  assert.equal(
    body.taxonomicVariants[0]?.relationType,
    "historical_combination",
  );
  assert.equal(body.taxonomicVariants[0]?.reviewStatus, "draft");
  await app.close();
});

test("species explorer searches the historical taxonomic variant", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/species?search=Trichocereus",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0]?.scientificName, "Echinopsis pachanoi");
  await app.close();
});

test("material fixture keeps visual parameters separate from chemistry claims", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/material-fixtures/biological-entity-echinopsis-pachanoi",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    representationType: string;
    material: { roughness: number };
    interpretation: { scientificReconstruction: boolean; notes?: string };
    bindings: Array<{ layer: string; sourceIds: string[] }>;
  };
  assert.equal(body.representationType, "procedural-interpretation");
  assert.equal(body.material.roughness, 0.68);
  assert.equal(body.interpretation.scientificReconstruction, false);
  assert.match(
    body.interpretation.notes ?? "",
    /no representan composición química/i,
  );
  assert.equal(
    body.bindings.some((binding) => binding.layer === "chemistry"),
    false,
  );
  assert.ok(body.bindings.every((binding) => binding.sourceIds.length > 0));
  await app.close();
});

test("unknown species returns a stable 404 response", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/species/not-a-real-species",
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "not_found");
  await app.close();
});
