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
  // Full objects, not just publicIds: commit eff8048 added four academic
  // sources to the content document and left this fixture behind, and the
  // surviving five had silently lost doi/publishedOn/accessedAt/assertionType
  // because only the identifiers were compared.
  assert.deepEqual(demoSpeciesDocument.sources, content.sources);
  assert.deepEqual(demoSpeciesDocument.ecology, content.ecology);
  assert.deepEqual(demoSpeciesDocument.distribution, content.distribution);
  assert.deepEqual(demoSpeciesDocument.cultivation, content.cultivation);
  assert.deepEqual(demoSpeciesDocument.history, content.history);
  assert.ok(
    demoSpeciesDocument.vernacularNames.every(
      (item) =>
        item.sourcePublicId &&
        ["draft", "under-review"].includes(item.reviewStatus),
    ),
  );
  assert.equal(
    demoSpeciesDocument.vernacularNames.find(
      (item) => item.term === "San Pedro",
    )?.reviewStatus,
    "under-review",
  );
});
