import assert from "node:assert/strict";
import test from "node:test";

import { createMaterialFixture } from "../dist/index.js";

test("material fixture requires an organism subject", () => {
  assert.throws(
    () =>
      createMaterialFixture({
        publicId: "fixture-without-subject",
        representationType: "material-study",
        visibility: "public",
      }),
    /biological entity or specimen/,
  );
});

test("chemical bindings require claim and source provenance", () => {
  assert.throws(
    () =>
      createMaterialFixture({
        publicId: "fixture-without-chemistry-evidence",
        biologicalEntityId: "entity-1",
        representationType: "procedural-interpretation",
        visibility: "public",
        bindings: [
          {
            id: "chemistry-to-emission",
            layer: "chemistry",
            target: "emission",
            interpretation: "symbolic",
            claimIds: [],
            sourceIds: [],
          },
        ],
      }),
    /requires claimIds and sourceIds/,
  );
});

test("fixture preserves separate visual, cultivation and chemistry bindings", () => {
  const fixture = createMaterialFixture({
    publicId: "echinopsis-pachanoi-material-study",
    biologicalEntityId: "biological-entity-echinopsis-pachanoi",
    representationType: "procedural-interpretation",
    growthStage: "mature",
    visibility: "public",
    material: { roughness: 0.68, transmission: 0.04 },
    bindings: [
      {
        id: "morphology-ribs",
        layer: "morphology",
        target: "geometry",
        interpretation: "documented",
        claimIds: ["claim-ribs"],
        sourceIds: ["source-morphology"],
      },
      {
        id: "cultivation-growth-stage",
        layer: "cultivation",
        target: "animation",
        interpretation: "derived",
        claimIds: ["claim-growth"],
        sourceIds: ["source-guide"],
      },
      {
        id: "chemistry-pigment",
        layer: "chemistry",
        target: "baseColor",
        interpretation: "measured",
        claimIds: ["claim-pigment"],
        sourceIds: ["source-assay"],
      },
    ],
  });

  assert.equal(fixture.interpretation.scientificReconstruction, false);
  assert.deepEqual(fixture.subject, {
    biologicalEntityId: "biological-entity-echinopsis-pachanoi",
  });
  assert.equal(fixture.bindings.length, 3);
});
