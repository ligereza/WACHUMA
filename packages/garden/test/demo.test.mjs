import assert from "node:assert/strict";
import test from "node:test";

const { demoPublicSpecimen } = await import("../dist/index.js");

test("public demo specimen has no exact location", () => {
  assert.equal(demoPublicSpecimen.visibility, "public");
  assert.equal("currentLocation" in demoPublicSpecimen, false);
  assert.match(demoPublicSpecimen.qrUrl, /specimens\/specimen-public-demo-01$/);
});
