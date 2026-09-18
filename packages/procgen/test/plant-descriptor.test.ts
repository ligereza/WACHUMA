import assert from "node:assert/strict";
import test from "node:test";
import { createPlantDescriptor } from "../src/index.ts";

test("createPlantDescriptor valid minimal input without optional fields", () => {
  const input = {
    publicId: "plant-001",
    organismRef: "org/001",
    growthForm: "tree",
    organs: ["leaf", "stem"],
    axes: "main",
    growthStage: "mature",
    parameters: { height: 10 },
    variationSeed: 42,
  };
  const result = createPlantDescriptor(input);
  assert.equal(result.$schema, "https://wachuma.org/schemas/plant-descriptor.schema.json");
  assert.equal(result.schemaVersion, "1.0");
  assert.equal(result.publicId, "plant-001");
  assert.equal(result.organismRef, "org/001");
  assert.deepEqual(result.architecture, {
    growthForm: "tree",
    organs: ["leaf", "stem"],
    axes: "main",
  });
  assert.equal(result.growthStage, "mature");
  assert.deepEqual(result.parameters, { height: 10 });
  assert.equal(result.variationSeed, 42);
  assert.deepEqual(result.interpretation, {
    label: "procedural-interpretation",
    scientificReconstruction: false,
  });
  assert.equal("phyllotaxis" in result.architecture, false);
  assert.equal("sources" in result, false);
  assert.equal("confidence" in result, false);
  assert.equal("notes" in result.interpretation, false);
  assert.equal("generator" in result, false);
});

test("createPlantDescriptor throws RangeError when variationSeed is not an integer", () => {
  const input = {
    publicId: "plant-002",
    organismRef: "org/002",
    growthForm: "shrub",
    organs: ["flower"],
    axes: "primary",
    growthStage: "seedling",
    parameters: {},
    variationSeed: 1.5,
  };
  assert.throws(() => createPlantDescriptor(input), RangeError);
});

test("createPlantDescriptor throws RangeError when confidence is outside 0..1 (negative)", () => {
  const input = {
    publicId: "plant-003",
    organismRef: "org/003",
    growthForm: "herb",
    organs: ["root"],
    axes: "taproot",
    growthStage: "juvenile",
    parameters: {},
    variationSeed: 7,
    confidence: -0.1,
  };
  assert.throws(() => createPlantDescriptor(input), RangeError);
});

test("createPlantDescriptor throws RangeError when confidence is outside 0..1 (greater than 1)", () => {
  const input = {
    publicId: "plant-004",
    organismRef: "org/004",
    growthForm: "vine",
    organs: ["tendril"],
    axes: "climbing",
    growthStage: "adult",
    parameters: {},
    variationSeed: 99,
    confidence: 1.1,
  };
  assert.throws(() => createPlantDescriptor(input), RangeError);
});

test("createPlantDescriptor allows confidence at limits: 0 and 1", () => {
  const input0 = {
    publicId: "plant-005",
    organismRef: "org/005",
    growthForm: "grass",
    organs: ["blade"],
    axes: "tiller",
    growthStage: "senescent",
    parameters: {},
    variationSeed: 0,
    confidence: 0,
  };
  const result0 = createPlantDescriptor(input0);
  assert.equal(result0.confidence, 0);

  const input1 = {
    publicId: "plant-006",
    organismRef: "org/006",
    growthForm: "fern",
    organs: ["frond"],
    axes: "rhizome",
    growthStage: "sporophyte",
    parameters: {},
    variationSeed: 1,
    confidence: 1,
  };
  const result1 = createPlantDescriptor(input1);
  assert.equal(result1.confidence, 1);
});

test("createPlantDescriptor includes phyllotaxis only when provided", () => {
  const withPhyllotaxis = {
    publicId: "plant-007",
    organismRef: "org/007",
    growthForm: "palm",
    organs: ["frond"],
    axes: "trunk",
    growthStage: "adult",
    parameters: {},
    variationSeed: 5,
    phyllotaxis: "spiral",
  };
  const resultWith = createPlantDescriptor(withPhyllotaxis);
  assert.equal(resultWith.architecture.phyllotaxis, "spiral");

  const withoutPhyllotaxis = {
    publicId: "plant-008",
    organismRef: "org/008",
    growthForm: "palm",
    organs: ["frond"],
    axes: "trunk",
    growthStage: "adult",
    parameters: {},
    variationSeed: 5,
  };
  const resultWithout = createPlantDescriptor(withoutPhyllotaxis);
  assert.equal("phyllotaxis" in resultWithout.architecture, false);
});

test("createPlantDescriptor copies organs array instead of keeping the same reference", () => {
  const organs = ["spine", "areole"];
  const sources = ["source1"];
  const input = {
    publicId: "plant-009",
    organismRef: "org/009",
    growthForm: "cactus",
    organs,
    axes: "columnar",
    growthStage: "flowering",
    parameters: {},
    variationSeed: 33,
    sources,
  };
  const result = createPlantDescriptor(input);
  assert.deepEqual(result.architecture.organs, organs);
  assert.notEqual(result.architecture.organs, organs);
  assert.deepEqual(result.sources, sources);
  assert.notEqual(result.sources, sources);
});
