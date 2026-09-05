import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createPlantDescriptor,
  generateCactus,
  generateGardenLayout,
  generateLSystem,
  generatePhyllotaxis,
} from "../src/index.ts";
import { buildPachanoi, warpShoot } from "../src/index.ts";

const pachanoiSurfaceHash = (surface: unknown) =>
  createHash("sha256").update(JSON.stringify(surface)).digest("hex");

test("plant descriptor is explicit about interpretation and stable variation", () => {
  const descriptor = createPlantDescriptor({
    publicId: "descriptor-demo-cactus",
    organismRef: "biological-entity-echinopsis-pachanoi",
    growthForm: "columnar-cactus",
    organs: ["stem", "areole", "spine"],
    axes: "primary-and-lateral",
    growthStage: "adult",
    parameters: { height: 2.2, ribs: 7 },
    variationSeed: 42,
    confidence: 0.35,
    generator: { algorithm: "parametric-cactus", version: "0.1.0" },
  });

  assert.equal(descriptor.interpretation.label, "procedural-interpretation");
  assert.equal(descriptor.interpretation.scientificReconstruction, false);
  assert.equal(descriptor.variationSeed, 42);
});

test("plant descriptor rejects non-integer seeds and invalid confidence", () => {
  assert.throws(
    () =>
      createPlantDescriptor({
        publicId: "bad-seed",
        organismRef: "organism",
        growthForm: "cactus",
        organs: ["stem"],
        axes: "primary",
        growthStage: "adult",
        parameters: {},
        variationSeed: 1.5,
      }),
    /variationSeed/,
  );
  assert.throws(
    () =>
      createPlantDescriptor({
        publicId: "bad-confidence",
        organismRef: "organism",
        growthForm: "cactus",
        organs: ["stem"],
        axes: "primary",
        growthStage: "adult",
        parameters: {},
        variationSeed: 1,
        confidence: 2,
      }),
    /confidence/,
  );
});

test("genera una receta de cactus estable para la misma semilla", () => {
  const first = generateCactus(304);
  const second = generateCactus(304);

  assert.deepEqual(first, second);
  assert.equal(first.areoles.length, 91);
  assert.equal(first.algorithmVersion, "0.1.0");
});

test("una semilla distinta produce una variante reproducible distinta", () => {
  const first = generateCactus(304);
  const second = generateCactus(305);

  assert.notDeepEqual(first.areoles, second.areoles);
  assert.equal(second.areoles.length, first.areoles.length);
});

test("modelo pachanoi extraído conserva un hash dorado y topología cerrada", () => {
  const surface = buildPachanoi(0, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72);

  assert.equal(
    pachanoiSurfaceHash(surface),
    "4de929d183379836c952bd2c53014503fbc93a1541925b249eb3823896e9b325",
  );
  assert.equal(surface.vertices.length, 6050);
  assert.equal(surface.faces.length, 6132);
  assert.equal(surface.areoles.length, 56);
  assert.equal(surface.spines.length, 168);
  assert.equal(surface.diagnostics.closed, true);
  assert.equal(surface.diagnostics.euler, 2);
  assert.ok(surface.diagnostics.seam < 1e-12);
  assert.ok(surface.diagnostics.c1 < 1e-3);
  assert.ok(surface.diagnostics.c2 < 1e-2);
});

test("modelo pachanoi usa una semilla explícita sin cambiar la malla", () => {
  const first = buildPachanoi(304, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72);
  const second = buildPachanoi(304, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72);
  const different = buildPachanoi(305, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72);

  assert.deepEqual(first, second);
  assert.notDeepEqual(first.vertices, different.vertices);
  assert.equal(first.vertices.length, different.vertices.length);
  assert.equal(first.faces.length, different.faces.length);
  assert.throws(
    () => buildPachanoi(304.5, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72),
    /seed must be an integer/,
  );
});

test("deformar un brote conserva la topología y el conteo de órganos", () => {
  const surface = buildPachanoi(0, 7, 2.6, 1, 1, 0.42, 0, 1, 0, 0.72);
  const warped = warpShoot(surface, 0.4, 0.18);

  assert.equal(warped.vertices.length, surface.vertices.length);
  assert.equal(warped.faces.length, surface.faces.length);
  assert.equal(warped.areoles.length, surface.areoles.length);
  assert.equal(warped.spines.length, surface.spines.length);
  assert.equal(warped.diagnostics.closed, true);
});

test("L-system ramificado es determinista y respeta sus límites", () => {
  const first = generateLSystem(304, { iterations: 2 });
  const second = generateLSystem(304, { iterations: 2 });

  assert.deepEqual(first, second);
  assert.equal(first.algorithm, "l-system");
  assert.ok(first.segments.length > 1);
});

test("filotaxis genera puntos estables con el ángulo áureo", () => {
  const first = generatePhyllotaxis(304, 8, 0.4, 2);
  const second = generatePhyllotaxis(304, 8, 0.4, 2);

  assert.deepEqual(first, second);
  assert.equal(first.points.length, 8);
  assert.notDeepEqual(first.points, generatePhyllotaxis(305, 8, 0.4, 2).points);
});

test("composición Poisson-disc es determinista y respeta límites", () => {
  const first = generateGardenLayout(304);
  const second = generateGardenLayout(304);

  assert.deepEqual(first, second);
  assert.ok(first.points.length > 0);
  assert.ok(first.points.length <= first.parameters.maximumPoints);
  for (const point of first.points) {
    assert.ok(Math.abs(point.position[0]) <= first.parameters.width / 2);
    assert.ok(Math.abs(point.position[2]) <= first.parameters.depth / 2);
  }
  for (let index = 0; index < first.points.length; index += 1) {
    for (let other = index + 1; other < first.points.length; other += 1) {
      const dx =
        first.points[index].position[0] - first.points[other].position[0];
      const dz =
        first.points[index].position[2] - first.points[other].position[2];
      assert.ok(
        dx * dx + dz * dz >=
          first.parameters.minimumDistance ** 2 - Number.EPSILON,
      );
    }
  }
});
