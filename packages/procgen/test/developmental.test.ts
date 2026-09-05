import assert from "node:assert/strict";
import test from "node:test";

import {
  activateBasalBud,
  applyDevelopmentalEvent,
  advanceDevelopment,
  createDevelopmentalState,
  projectDevelopmentalState,
  setHydration,
  sigmoid,
} from "../src/index.ts";

test("el primer slice conserva la identidad de las areolas al nacer", () => {
  const first = advanceDevelopment(createDevelopmentalState(304), 32);
  const firstBirth = first.areoles[0];
  assert.ok(firstBirth);
  const later = advanceDevelopment(first, 32);
  const sameBirth = later.areoles.find((areole) => areole.id === firstBirth.id);

  assert.ok(sameBirth);
  assert.equal(sameBirth.birthTime, firstBirth.birthTime);
  assert.equal(sameBirth.order, firstBirth.order);
  assert.equal(sameBirth.rib, firstBirth.rib);
  assert.ok(later.areoles.length >= first.areoles.length);
});

test("seco y riego cambian la turgencia, no la topología", () => {
  const dryState = advanceDevelopment(createDevelopmentalState(304), 45);
  const dry = projectDevelopmentalState(dryState);
  const wateredState = advanceDevelopment(setHydration(dryState, "riego"), 3);
  const watered = projectDevelopmentalState(wateredState);

  assert.ok(watered.hydration > dry.hydration);
  assert.equal(watered.shoots.length, dry.shoots.length);
  assert.equal(
    watered.shoots[0]?.surface.vertices.length,
    dry.shoots[0]?.surface.vertices.length,
  );
  assert.equal(
    watered.shoots[0]?.surface.faces.length,
    dry.shoots[0]?.surface.faces.length,
  );
  assert.equal(watered.shoots[0]?.surface.diagnostics.closed, true);
});

test("el evento water es un alias explícito de riego", () => {
  const state = createDevelopmentalState(304);
  const watered = applyDevelopmentalEvent(state, { kind: "water" });

  assert.equal(watered.hydrationTarget, 1);
  assert.equal(watered.history.at(-1)?.value, "water");
});

test("sin evidencia una areola madura permanece dormant", () => {
  let state = createDevelopmentalState(304);
  state = advanceDevelopment(state, 181);
  state = advanceDevelopment(state, 1);

  assert.ok(state.areoles.length > 1);
  assert.ok(state.areoles.every((areole) => areole.state === "dormant"));
  assert.ok(state.areoles.every((areole) => areole.evidence === "unknown"));
});

test("la activación basal explícita crea un hijo con ápice propio", () => {
  let state = createDevelopmentalState(304);
  state = advanceDevelopment(state, 181);
  state = advanceDevelopment(state, 1);
  const parentAreole = state.areoles.find(
    (areole) => areole.state === "dormant",
  );
  assert.ok(parentAreole);

  const activated = activateBasalBud(state, parentAreole.id);
  const child = activated.shoots.find(
    (shoot) => shoot.parentAreoleId === parentAreole.id,
  );
  assert.ok(child);
  assert.equal(parentAreole.state, "dormant");
  assert.equal(
    activated.areoles.find((areole) => areole.id === parentAreole.id)?.state,
    "shoot_meristem",
  );
  assert.equal(child.parentShootId, "trunk");
  assert.equal(child.apexId, `${child.id}:apex`);
  assert.notEqual(child.seed, activated.seed);

  const projection = projectDevelopmentalState(activated);
  assert.equal(projection.shoots.length, 2);
  assert.ok(projection.shoots[1]?.surface.vertices.length);
  assert.notDeepEqual(
    projection.shoots[0]?.surface.vertices,
    projection.shoots[1]?.surface.vertices,
  );
});

test("la sigmoide es una compuerta monótona y acotada", () => {
  assert.ok(sigmoid(-10) < 0.01);
  assert.equal(sigmoid(0), 0.5);
  assert.ok(sigmoid(10) > 0.99);
  assert.ok(sigmoid(1) > sigmoid(0));
});
