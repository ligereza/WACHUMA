import assert from "node:assert/strict";
import test from "node:test";

const { buildRoCrateMetadata, toDarwinCoreOccurrence } =
  await import("../dist/index.js");

test("Darwin Core export keeps stable occurrence identity and safe location metadata", () => {
  const occurrence = toDarwinCoreOccurrence({
    occurrenceId: "observation-demo-public-01",
    scientificName: "Echinopsis pachanoi",
    eventDate: "2026-01-15T12:00:00.000Z",
    basisOfRecord: "HumanObservation",
    decimalLatitude: -33.45,
    decimalLongitude: -70.65,
    informationWithheld: "Exact geometry withheld",
  });

  assert.equal(occurrence.occurrenceID, "observation-demo-public-01");
  assert.equal(occurrence.basisOfRecord, "HumanObservation");
  assert.equal(occurrence.informationWithheld, "Exact geometry withheld");
});

test("RO-Crate metadata preserves provenance links", () => {
  const crate = buildRoCrateMetadata(
    {
      id: "species/echinopsis-pachanoi",
      type: "Dataset",
      name: "Echinopsis pachanoi",
      license: "CC BY 4.0",
    },
    [
      {
        id: "source/gbif",
        type: "Dataset",
        derivedFrom: ["https://api.gbif.org/v1"],
      },
    ],
  );

  assert.equal(crate["@context"], "https://w3id.org/ro/crate/1.2/context");
  assert.equal(crate["@graph"].length, 3);
  assert.deepEqual(crate["@graph"][2]["prov:wasDerivedFrom"], [
    { "@id": "https://api.gbif.org/v1" },
  ]);
});
