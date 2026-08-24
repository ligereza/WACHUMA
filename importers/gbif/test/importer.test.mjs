import assert from "node:assert/strict";
import test from "node:test";

const { checksumPayload, createGbifImporter, projectTaxon } =
  await import("../dist/index.js");

test("projects a GBIF taxon without publishing an unresolved status", () => {
  const projection = projectTaxon({
    key: 123,
    scientificName: "Echinopsis pachanoi",
    canonicalName: "Echinopsis pachanoi",
    rank: "SPECIES",
    status: "ACCEPTED",
  });

  assert.equal(projection.rank, "species");
  assert.equal(projection.taxonomicStatus, "accepted");
  assert.equal(projection.externalIdentifier.identifier, "123");
});

test("keeps GBIF payloads, attribution and checksums as pending records", async () => {
  const calls = [];
  const payloads = {
    "/species/match": {
      key: 123,
      scientificName: "Echinopsis pachanoi",
      rank: "SPECIES",
      status: "ACCEPTED",
    },
    "/species/123": {
      key: 123,
      scientificName: "Echinopsis pachanoi",
      canonicalName: "Echinopsis pachanoi",
      rank: "SPECIES",
      status: "ACCEPTED",
    },
    "/occurrence/search": {
      results: [
        {
          gbifID: "occ-1",
          speciesKey: 123,
          scientificName: "Echinopsis pachanoi",
          license: "CC BY 4.0",
          datasetName: "Demo dataset",
          rightsHolder: "Demo holder",
          media: [
            {
              type: "StillImage",
              format: "image/jpeg",
              identifier: "https://images.example/occ-1.jpg",
              references: "https://records.example/occ-1",
              title: "Demo cactus",
              creator: "Demo photographer",
              license: "CC BY 4.0",
              rightsHolder: "Demo photographer",
            },
          ],
        },
      ],
    },
  };
  const importer = createGbifImporter({
    baseUrl: "https://gbif.test/v1",
    retrievedAt: () => "2026-08-21T00:00:00.000Z",
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      calls.push(`${parsed.pathname}${parsed.search}`);
      const key = parsed.pathname.replace("/v1", "");
      return new Response(JSON.stringify(payloads[key]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await importer.importSpecies(" Echinopsis pachanoi ");
  assert.equal(result.requestedName, "Echinopsis pachanoi");
  assert.equal(result.taxon.externalIdentifier.identifier, "123");
  assert.equal(result.speciesRecord.status, "pending");
  assert.equal(result.occurrenceRecords[0].license, "CC BY 4.0");
  assert.match(result.occurrenceRecords[0].attribution, /Demo dataset/);
  assert.equal(result.mediaRecords.length, 1);
  assert.equal(result.mediaRecords[0].license, "CC BY 4.0");
  assert.match(result.mediaRecords[0].attribution, /Demo photographer/);
  assert.equal(result.mediaRecords[0].status, "pending");
  assert.match(result.mediaRecords[0].sourceRecordId, /^media:occ-1:0$/);
  assert.equal(
    result.occurrenceRecords[0].rawChecksum,
    checksumPayload(payloads["/occurrence/search"].results[0]),
  );
  assert.deepEqual(result.speciesRecord.rawPayload, {
    match: payloads["/species/match"],
    species: payloads["/species/123"],
  });
  assert.equal(calls.length, 3);
});

test("passes an optional occurrence license filter to GBIF", async () => {
  const requests = [];
  const importer = createGbifImporter({
    baseUrl: "https://gbif.test/v1",
    occurrenceLicense: "CC_BY_4_0",
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      requests.push(parsed);
      const payload = parsed.pathname.endsWith("/species/match")
        ? { key: 123, scientificName: "Opuntia ficus-indica" }
        : parsed.pathname.endsWith("/species/123")
          ? { key: 123, scientificName: "Opuntia ficus-indica" }
          : { results: [] };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  await importer.importSpecies("Opuntia ficus-indica");
  assert.equal(requests[2].searchParams.get("license"), "CC_BY_4_0");
});

test("passes an optional occurrence media filter to GBIF", async () => {
  const requests = [];
  const importer = createGbifImporter({
    baseUrl: "https://gbif.test/v1",
    occurrenceLimit: 1,
    occurrenceMediaType: "StillImage",
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      requests.push(parsed);
      const payload = parsed.pathname.endsWith("/species/match")
        ? { key: 123, scientificName: "Opuntia ficus-indica" }
        : parsed.pathname.endsWith("/species/123")
          ? { key: 123, scientificName: "Opuntia ficus-indica" }
          : { results: [] };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  await importer.importSpecies("Opuntia ficus-indica");
  assert.equal(requests[2].searchParams.get("media_type"), "StillImage");
});

test("normalizes GBIF's live usageKey species-match shape", async () => {
  const importer = createGbifImporter({
    baseUrl: "https://gbif.test/v1",
    occurrenceLimit: 0,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      const payload = path.endsWith("/species/match")
        ? { usageKey: 5622352, scientificName: "Echinopsis pachanoi" }
        : {
            key: 5622352,
            scientificName: "Echinopsis pachanoi",
            rank: "SPECIES",
            status: "SYNONYM",
          };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  const result = await importer.importSpecies("Echinopsis pachanoi");
  assert.equal(result.taxon.externalIdentifier.identifier, "5622352");
  assert.equal(result.taxon.taxonomicStatus, "synonym");
});

test("normalizes GBIF species records using live taxonomicStatus and accepted fields", async () => {
  const importer = createGbifImporter({
    baseUrl: "https://gbif.test/v1",
    occurrenceLimit: 0,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      const payload = path.endsWith("/species/match")
        ? {
            usageKey: 5622352,
            scientificName:
              "Echinopsis pachanoi (Britton & Rose) H.Friedrich & G.D.Rowley",
          }
        : {
            key: 5622352,
            scientificName:
              "Echinopsis pachanoi (Britton & Rose) H.Friedrich & G.D.Rowley",
            canonicalName: "Echinopsis pachanoi",
            rank: "SPECIES",
            taxonomicStatus: "SYNONYM",
            accepted:
              "Trichocereus macrogonus var. pachanoi (Britton & Rose) Albesiano & R.Kiesling",
          };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  const result = await importer.importSpecies("Echinopsis pachanoi");
  assert.equal(result.taxon.taxonomicStatus, "synonym");
  assert.equal(
    result.taxon.acceptedName,
    "Trichocereus macrogonus var. pachanoi (Britton & Rose) Albesiano & R.Kiesling",
  );
});

test("does not hide an HTTP failure behind an empty import", async () => {
  const importer = createGbifImporter({
    fetchImpl: async () => new Response("no", { status: 503 }),
    occurrenceLimit: 0,
  });

  await assert.rejects(
    importer.matchSpecies("Echinopsis pachanoi"),
    /HTTP 503/,
  );
});
