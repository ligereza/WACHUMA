import assert from "node:assert/strict";
import test from "node:test";

const {
  checksumPayload,
  createInaturalistImporter,
  normalizeInaturalistLicense,
} = await import("../dist/index.js");

test("normalizes iNaturalist license codes without treating missing media rights as open", () => {
  assert.equal(
    normalizeInaturalistLicense("cc-by"),
    "https://creativecommons.org/licenses/by/4.0/",
  );
  assert.equal(normalizeInaturalistLicense(undefined), "all-rights-reserved");
  assert.equal(
    normalizeInaturalistLicense("all-rights-reserved"),
    "all-rights-reserved",
  );
});

test("imports observations and per-media provenance as pending records", async () => {
  const requests = [];
  const importer = createInaturalistImporter({
    baseUrl: "https://inat.test/v1",
    retrievedAt: () => "2026-08-23T00:00:00.000Z",
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      requests.push(parsed);
      if (parsed.pathname.endsWith("/taxa")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: 123, name: "Echinopsis pachanoi", rank: "species" },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              id: 456,
              uri: "https://www.inaturalist.org/observations/456",
              observed_on: "2026-01-20",
              quality_grade: "research",
              license_code: "cc-by-nc",
              geoprivacy: "open",
              taxon_geoprivacy: "open",
              geojson: { type: "Point", coordinates: [-71.3, -33.7] },
              user: { login: "observer" },
              photos: [
                {
                  id: 789,
                  license_code: "cc-by",
                  attribution: "Observer",
                  original_url: "https://static.inat.test/photo.jpg",
                },
              ],
              sounds: [
                {
                  id: 790,
                  license_code: null,
                  file_url: "https://static.inat.test/sound.mp3",
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    },
  });

  const result = await importer.importSpecies(" Echinopsis pachanoi ");
  assert.equal(result.taxon.externalIdentifier.identifier, "123");
  assert.equal(result.taxonRecord.status, "pending");
  assert.equal(result.observationRecords.length, 1);
  assert.equal(
    result.observationRecords[0].license,
    "https://creativecommons.org/licenses/by-nc/4.0/",
  );
  assert.equal(result.mediaRecords.length, 2);
  assert.equal(
    result.mediaRecords[0].license,
    "https://creativecommons.org/licenses/by/4.0/",
  );
  assert.equal(result.mediaRecords[1].license, "all-rights-reserved");
  assert.match(result.mediaRecords[0].sourceRecordId, /^photo:789$/);
  assert.equal(
    result.observationRecords[0].rawChecksum,
    checksumPayload(result.observationRecords[0].rawPayload),
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get("taxon_id"), "123");
});

test("can constrain the API request to open geoprivacy and a per-record license", async () => {
  let observationUrl;
  const importer = createInaturalistImporter({
    baseUrl: "https://inat.test/v1",
    occurrenceLimit: 0,
    observationLicense: "cc-by",
    openGeoOnly: true,
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/observations")) observationUrl = parsed;
      const payload = parsed.pathname.endsWith("/taxa")
        ? {
            results: [
              { id: 123, name: "Opuntia ficus-indica", rank: "species" },
            ],
          }
        : { results: [] };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  await importer.importSpecies("Opuntia ficus-indica");
  assert.equal(observationUrl.searchParams.get("license"), "cc-by");
  assert.equal(observationUrl.searchParams.get("geoprivacy"), "open");
  assert.equal(observationUrl.searchParams.get("taxon_geoprivacy"), "open");
});

test("surfaces upstream HTTP failures", async () => {
  const importer = createInaturalistImporter({
    fetchImpl: async () => new Response("no", { status: 503 }),
  });
  await assert.rejects(
    importer.importSpecies("Echinopsis pachanoi"),
    /HTTP 503/,
  );
});
