import assert from "node:assert/strict";
import test from "node:test";

const {
  buildDarwinCoreFiles,
  buildRoCrateMetadata,
  buildZip,
  toDarwinCoreOccurrence,
} = await import("../dist/index.js");

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

test("public export serializers preserve source and identity columns", () => {
  const files = buildDarwinCoreFiles({
    taxa: [
      {
        id: "biological-entity-echinopsis-pachanoi",
        taxonId: "taxon-echinopsis-pachanoi",
        scientificName: "Echinopsis pachanoi",
        rank: "species",
        taxonomicStatus: "unresolved",
        sourceIds: ["source-powo-echinopsis-pachanoi"],
        license: "CC BY 3.0",
        rightsHolder: "Plants of the World Online",
      },
    ],
    claims: [],
    guides: [],
    guideClaims: [],
    observations: [],
    sources: [
      {
        id: "source-powo-echinopsis-pachanoi",
        title: "Plants of the World Online",
        citation: "POWO",
        license: "CC BY 3.0",
        rightsHolder: "Royal Botanic Gardens, Kew",
      },
    ],
  });

  const taxon = files.find((file) => file.name === "taxon.csv");
  assert.match(taxon.content, /biological-entity-echinopsis-pachanoi/);
  assert.match(taxon.content, /source-powo-echinopsis-pachanoi/);
  assert.match(taxon.content, /CC BY 3\.0/);
  const archive = buildZip(files);
  assert.equal(String.fromCharCode(...archive.slice(0, 4)), "PK\x03\x04");
  assert.ok(archive.length > 100);
});
