import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const modelPath = resolve(
  testDirectory,
  "../public/models/echinopsis-pachanoi-demo.glb",
);
const manifestPath = resolve(
  testDirectory,
  "../public/models/echinopsis-pachanoi-demo.manifest.json",
);

test("procedural GLB manifest is reproducible and provenance-aware", async () => {
  const [model, manifestText] = await Promise.all([
    readFile(modelPath),
    readFile(manifestPath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.schemaVersion, "1.0");
  assert.equal(manifest.origin, "procedural");
  assert.equal(manifest.adapterBoundary, "in-process");
  assert.equal(manifest.taxonomicClaim, false);
  assert.equal(
    createHash("sha256").update(model).digest("hex"),
    manifest.contentHash,
  );
  assert.equal(manifest.generator.algorithm, "parametric-cactus");
  assert.equal(manifest.generator.license, "MIT");
  assert.match(manifest.attribution, /WACHUMA/);
});
