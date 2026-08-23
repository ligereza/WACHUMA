import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { demoSpeciesDocument } from "../dist/index.js";

const contentPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../content/species/echinopsis-pachanoi.json",
);

test("executable species fixture preserves canonical content guardrails", async () => {
  const content = JSON.parse(await readFile(contentPath, "utf8"));

  assert.equal(demoSpeciesDocument.publicId, content.publicId);
  assert.deepEqual(
    demoSpeciesDocument.vernacularNames.map((item) => item.term),
    content.vernacularNames.map((item) => item.term),
  );
  assert.deepEqual(
    demoSpeciesDocument.sources.map((source) => source.publicId),
    content.sources.map((source) => source.publicId),
  );
  assert.deepEqual(demoSpeciesDocument.ecology, content.ecology);
  assert.deepEqual(demoSpeciesDocument.distribution, content.distribution);
  assert.deepEqual(demoSpeciesDocument.cultivation, content.cultivation);
  assert.deepEqual(demoSpeciesDocument.history, content.history);
  assert.ok(
    demoSpeciesDocument.vernacularNames.every(
      (item) => item.sourcePublicId && item.reviewStatus === "draft",
    ),
  );
});
