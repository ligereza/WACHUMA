import assert from "node:assert/strict";
import test from "node:test";

const { checksumPayload, createWikidataImporter } =
  await import("../dist/index.js");

test("imports only selected structured claims and external identifiers", async () => {
  const requests = [];
  const importer = createWikidataImporter({
    baseUrl: "https://wikidata.test/w/api.php",
    entityBaseUrl: "https://wikidata.test/entity",
    retrievedAt: () => "2026-08-23T00:00:00.000Z",
    fetchImpl: async (url, init) => {
      requests.push({ url: new URL(url), init });
      const parsed = new URL(url);
      if (parsed.searchParams.get("action") === "wbsearchentities") {
        return new Response(
          JSON.stringify({
            search: [
              {
                id: "Q133426",
                label: "Echinopsis pachanoi",
                concepturi: "https://www.wikidata.org/entity/Q133426",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          entities: {
            Q133426: {
              id: "Q133426",
              labels: { en: { language: "en", value: "Echinopsis pachanoi" } },
              claims: {
                P225: [
                  {
                    id: "Q133426$P225-1",
                    rank: "normal",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "string",
                      datavalue: { value: "Echinopsis pachanoi" },
                    },
                  },
                ],
                P105: [
                  {
                    id: "Q133426$P105-1",
                    rank: "normal",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "wikibase-item",
                      datavalue: {
                        value: { "entity-type": "item", "numeric-id": 7432 },
                      },
                    },
                  },
                ],
                P846: [
                  {
                    id: "Q133426$P846-1",
                    rank: "preferred",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "external-id",
                      datavalue: { value: "5622352" },
                    },
                    references: [{ hash: "reference-hash" }],
                  },
                ],
                P3151: [
                  {
                    id: "Q133426$P3151-1",
                    rank: "normal",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "external-id",
                      datavalue: { value: "327669" },
                    },
                  },
                ],
                P18: [
                  {
                    id: "Q133426$P18-1",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "commonsMedia",
                      datavalue: { value: "not-copied.jpg" },
                    },
                  },
                ],
                P1843: [
                  {
                    id: "Q133426$P1843-1",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "monolingualtext",
                      datavalue: { value: { language: "es", text: "nombre" } },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      );
    },
  });

  const result = await importer.importSpecies(" Echinopsis pachanoi ");
  assert.equal(result.itemId, "Q133426");
  assert.equal(result.taxon.scientificName, "Echinopsis pachanoi");
  assert.equal(result.taxon.rank, "species");
  assert.deepEqual(
    result.taxon.externalIdentifiers.map(
      ({ namespace, identifier }) => `${namespace}:${identifier}`,
    ),
    ["wikidata:Q133426", "inaturalist:327669", "gbif:5622352"],
  );
  assert.equal(result.itemRecord.status, "pending");
  assert.equal(
    result.itemRecord.license,
    "https://creativecommons.org/publicdomain/zero/1.0/",
  );
  assert.deepEqual(
    result.claims.map((claim) => claim.property),
    ["P105", "P225", "P3151", "P846"],
  );
  assert.ok(
    !JSON.stringify(result.itemRecord.rawPayload).includes("not-copied.jpg"),
  );
  assert.ok(!JSON.stringify(result.itemRecord.rawPayload).includes("nombre"));
  assert.equal(
    result.itemRecord.rawChecksum,
    checksumPayload(result.itemRecord.rawPayload),
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.searchParams.get("formatversion"), "2");
  assert.match(
    requests[1].init.headers["user-agent"],
    /WACHUMA-wikidata-importer/,
  );
  assert.equal(requests[1].init.headers["accept-encoding"], "gzip, deflate");
});

test("can import a QID directly and handles the API object entity shape", async () => {
  const importer = createWikidataImporter({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          entities: {
            Q900001: {
              id: "Q900001",
              claims: {
                P225: [
                  {
                    id: "Q900001$P225-1",
                    mainsnak: {
                      snaktype: "value",
                      datatype: "string",
                      datavalue: { value: "Pleurotus ostreatus" },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      ),
  });
  const result = await importer.importItem("q900001");
  assert.equal(result.itemId, "Q900001");
  assert.equal(result.taxon.externalIdentifiers[0].identifier, "Q900001");
});

test("surfaces upstream HTTP failures", async () => {
  const importer = createWikidataImporter({
    fetchImpl: async () => new Response("no", { status: 429 }),
  });
  await assert.rejects(importer.importItem("Q133426"), /HTTP 429/);
});
