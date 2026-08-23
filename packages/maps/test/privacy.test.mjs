import assert from "node:assert/strict";
import test from "node:test";

import { roundPublicGeometry } from "../dist/index.js";

test("public geometry is rounded before leaving the map package", () => {
  const geometry = {
    type: "Point",
    coordinates: [-70.123456, -33.987654],
    metadata: { precision: 0.000001 },
  };
  assert.deepEqual(roundPublicGeometry(geometry, 2), {
    type: "Point",
    coordinates: [-70.12, -33.99],
    metadata: { precision: 0 },
  });
});
