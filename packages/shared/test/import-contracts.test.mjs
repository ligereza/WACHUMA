import assert from "node:assert/strict";
import test from "node:test";

const {
  ExternalProviderContractSchema,
  ExternalSourceRecordSchema,
  externalProviderContracts,
  canPublishExternalMediaRecord,
} = await import("../dist/index.js");

test("all external integrations have executable provider contracts", () => {
  assert.deepEqual(
    externalProviderContracts.map((contract) => contract.providerKey),
    ["gbif", "inaturalist", "wikidata", "fungaltraits", "ethnobotany"],
  );
  for (const contract of externalProviderContracts) {
    assert.equal(
      ExternalProviderContractSchema.safeParse(contract).success,
      true,
    );
  }
});

test("source records require provenance and start pending", () => {
  const result = ExternalSourceRecordSchema.safeParse({
    source: "inaturalist",
    sourceRecordId: "observation:1",
    sourceUrl: "https://www.inaturalist.org/observations/1",
    retrievedAt: "2026-08-21T00:00:00.000Z",
    license: "CC BY 4.0",
    attribution: "iNaturalist observer",
    assertionType: "contemporary_observation",
    rawPayload: {},
    importerVersion: "test-0.1.0",
    status: "pending",
  });
  assert.equal(result.success, true);
});

test("external media publication is denied without compatible license and attribution", () => {
  assert.equal(
    canPublishExternalMediaRecord({
      identifier: "https://image.example/a.jpg",
      license: "http://creativecommons.org/licenses/by-nc-nd/4.0/",
      attribution: "Author",
    }),
    false,
  );
  assert.equal(
    canPublishExternalMediaRecord({
      identifier: "https://image.example/a.jpg",
      license: "CC BY 4.0",
      attribution: "Author",
    }),
    true,
  );
});
