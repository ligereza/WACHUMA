import assert from "node:assert/strict";
import test from "node:test";

const { GardenLedgerImportError, applyGardenLedger, parseGardenLedger } =
  await import("../dist/index.js");

function manifest(records) {
  return {
    schemaVersion: "1.0",
    sourcePublicId: "source-wachuma-garden-ledger",
    sourceUrl: "https://github.com/ligereza/WACHUMA",
    retrievedAt: "2026-08-23T12:00:00.000Z",
    license: "WACHUMA-GARDEN-PRIVATE",
    attribution: "Custodia privada del jardín WACHUMA",
    importerVersion: "garden-ledger-test-0.1.0",
    records,
  };
}

function record(overrides = {}) {
  return {
    publicId: "garden-echinopsis-001",
    specimenType: "plant-live",
    biologicalEntityPublicId: "biological-entity-echinopsis-pachanoi",
    status: "alive",
    visibility: "restricted",
    sourceRecordId: "garden:garden-echinopsis-001:v1",
    rawPayload: {
      capture: "manual",
      custodianName: "persona no publicada",
      exactLocation: { latitude: -33.45, longitude: -70.66 },
    },
    ...overrides,
  };
}

test("normalizes a private garden ledger without leaking payload fields", () => {
  const result = parseGardenLedger(manifest([record()]));
  assert.equal(result.recordCount, 1);
  assert.equal(result.records[0].visibility, "restricted");
  assert.equal(
    result.records[0].provenance.sourcePublicId,
    "source-wachuma-garden-ledger",
  );
  assert.deepEqual(result.records[0].provenance.rawPayload.exactLocation, {
    latitude: -33.45,
    longitude: -70.66,
  });
  assert.equal("custodianName" in result.records[0], false);
  assert.equal("exactLocation" in result.records[0], false);
});

test("allows per-record retrieval and attribution overrides", () => {
  const result = parseGardenLedger(
    manifest([
      record({
        retrievedAt: "2026-08-24T10:00:00.000Z",
        license: "WACHUMA-GARDEN-COMMUNITY-CONTROLLED",
        attribution: "Comunidad custodiante; alcance restringido",
        visibility: "community-controlled",
      }),
    ]),
  );
  assert.equal(
    result.records[0].provenance.retrievedAt,
    "2026-08-24T10:00:00.000Z",
  );
  assert.equal(
    result.records[0].provenance.license,
    "WACHUMA-GARDEN-COMMUNITY-CONTROLLED",
  );
  assert.equal(result.records[0].visibility, "community-controlled");
});

test("rejects public visibility before the API is called", () => {
  assert.throws(
    () => parseGardenLedger(manifest([record({ visibility: "public" })])),
    (error) => {
      assert.ok(error instanceof GardenLedgerImportError);
      assert.match(error.message, /Invalid garden ledger/);
      return true;
    },
  );
});

test("rejects duplicate specimen IDs and source record keys", () => {
  assert.throws(
    () =>
      parseGardenLedger(
        manifest([record(), record({ sourceRecordId: "garden:other:v1" })]),
      ),
    /Duplicate specimen publicId/,
  );

  assert.throws(
    () =>
      parseGardenLedger(
        manifest([
          record({ publicId: "garden-echinopsis-001" }),
          record({
            publicId: "garden-echinopsis-002",
            sourceRecordId: "garden:garden-echinopsis-001:v1",
          }),
        ]),
      ),
    /Duplicate source record key/,
  );
});

test("rejects malformed manifests before normalization", () => {
  assert.throws(
    () => parseGardenLedger({ schemaVersion: "0.1", records: [] }),
    (error) => {
      assert.ok(error instanceof GardenLedgerImportError);
      assert.match(error.message, /schemaVersion/);
      return true;
    },
  );
});

test("applies only through the protected intake endpoint", async () => {
  const calls = [];
  const batch = parseGardenLedger(manifest([record()]));
  const result = await applyGardenLedger(batch, {
    apiUrl: "http://localhost:3001/",
    token: "test-admin-token",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          specimen: { publicId: "garden-echinopsis-001" },
          sourceRecordStatus: "pending",
          created: true,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    },
  });

  assert.deepEqual(result.applied, [
    {
      index: 1,
      publicId: "garden-echinopsis-001",
      sourceRecordStatus: "pending",
      created: true,
    },
  ]);
  assert.equal(
    calls[0].url,
    "http://localhost:3001/api/v1/admin/garden/intake/specimens",
  );
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, "Bearer test-admin-token");
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.visibility, "restricted");
  assert.equal(
    sent.provenance.sourceRecordId,
    "garden:garden-echinopsis-001:v1",
  );
});
