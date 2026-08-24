import assert from "node:assert/strict";
import test from "node:test";

const {
  canPublishFungalTraitsSnapshot,
  evaluateFungalTraitsPublication,
  importFungalTraitsSnapshot,
  parseFungalTraitsCsv,
} = await import("../dist/index.js");

const metadata = {
  releaseVersion: "synthetic-release-0.1",
  snapshotUrl: "https://example.org/fungaltraits/synthetic.csv",
  doi: "https://doi.org/10.0000/example",
  citation: "Synthetic fixture for importer contract testing",
  license: "unknown",
  attribution: "Synthetic fixture; no external dataset copied",
  retrievedAt: "2026-08-23T00:00:00.000Z",
  licenseReview: "unresolved",
};

test("parses the FungalTraits wide-row CSV shape without copying a dataset", () => {
  const rows = parseFungalTraitsCsv(
    "obj_id,species,speciesMatched,uuid,ifungorum_number,trait_name,value\n" +
      "synthetic_1,Pleurotus_ostreatus,Pleurotus ostreatus,fixture,0,substrate,wood\n",
  );
  assert.deepEqual(rows[0], {
    rowNumber: 2,
    recordId: "synthetic_1",
    species: "Pleurotus_ostreatus",
    speciesMatched: "Pleurotus ostreatus",
    uuid: "fixture",
    ifungorumNumber: "0",
    traitIdentifier: "substrate",
    rawValue: "wood",
  });
});

test("stages every measurement with provenance and blocks unresolved publication", () => {
  const result = importFungalTraitsSnapshot({
    metadata,
    csv:
      "obj_id,species,speciesMatched,trait_name,value\n" +
      "synthetic_1,Pleurotus_ostreatus,Pleurotus ostreatus,substrate,wood\n" +
      "synthetic_2,Pleurotus_ostreatus,Pleurotus ostreatus,temperature,18.5\n",
  });

  assert.equal(result.publishable, false);
  assert.equal(result.sourceRecords.length, 2);
  assert.equal(result.measurements.length, 2);
  assert.equal(result.sourceRecords[0].status, "pending");
  assert.deepEqual(result.publicationDecision.blockers, [
    "license_review_unresolved",
    "license_expression_missing",
    "license_evidence_missing",
  ]);
  assert.match(result.sourceRecords[0].rawChecksum, /^sha256:/);
  assert.equal(result.measurements[1].valueNumeric, 18.5);
  assert.equal(result.measurements[0].publishable, false);
});

test("preserves rows with an empty value as explicitly missing", () => {
  const rows = parseFungalTraitsCsv(
    "obj_id,species,trait_name,value\n" +
      "synthetic_missing,Pleurotus_ostreatus,substrate,\n",
  );
  assert.equal(rows[0].rawValue, "");

  const result = importFungalTraitsSnapshot({
    metadata,
    csv:
      "obj_id,species,trait_name,value\n" +
      "synthetic_missing,Pleurotus_ostreatus,substrate,\n",
  });
  assert.equal(result.sourceRecords.length, 1);
  assert.equal(result.measurements[0].uncertainty.valuePresence, "missing");
  assert.equal(result.measurements[0].publishable, false);
});

test("keeps repeated study identifiers distinct by source row", () => {
  const result = importFungalTraitsSnapshot({
    metadata,
    csv:
      "obj_id,species,trait_name,value\n" +
      "same_study_row,Pleurotus_ostreatus,substrate,wood\n" +
      "same_study_row,Pleurotus_ostreatus,temperature,18.5\n",
  });
  assert.equal(result.sourceRecords.length, 2);
  assert.notEqual(
    result.sourceRecords[0].sourceRecordId,
    result.sourceRecords[1].sourceRecordId,
  );
  assert.match(result.sourceRecords[1].sourceRecordId, /row-3$/);
});

test("requires an explicit license evidence URL before publication can be considered", () => {
  assert.equal(canPublishFungalTraitsSnapshot(metadata), false);
  assert.deepEqual(evaluateFungalTraitsPublication(metadata).blockers, [
    "license_review_unresolved",
    "license_expression_missing",
    "license_evidence_missing",
  ]);
  assert.equal(
    canPublishFungalTraitsSnapshot({
      ...metadata,
      license: "CC BY 4.0",
      licenseReview: "verified",
      licenseExpression: "CC-BY-4.0",
      licenseEvidenceUrl: "https://example.org/license",
    }),
    true,
  );
  assert.equal(
    canPublishFungalTraitsSnapshot({
      ...metadata,
      license: "CC BY 4.0",
      licenseReview: "verified",
      licenseExpression: "CC-BY-4.0",
      licenseEvidenceUrl: "not-a-url",
    }),
    false,
  );
  assert.deepEqual(
    evaluateFungalTraitsPublication({
      ...metadata,
      license: "Other (Open)",
      licenseReview: "verified",
      licenseExpression: "Other (Open)",
      licenseEvidenceUrl: "https://zenodo.org/records/1216257",
    }).blockers,
    ["license_expression_unsupported"],
  );
});
