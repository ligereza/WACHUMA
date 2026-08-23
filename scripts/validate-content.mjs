import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

const species = await readJson("content/species/echinopsis-pachanoi.json");
const sourceIds = new Set(species.sources.map((source) => source.publicId));

for (const media of species.media ?? []) {
  assert.ok(media.uri, "Every media item needs a URI");
  assert.ok(media.license, "Every media item needs a license");
  assert.ok(media.attribution, "Every media item needs attribution");
}

for (const source of species.sources) {
  assert.ok(source.publicId, "Every source needs a publicId");
  assert.ok(source.license, `${source.publicId} needs a license`);
  assert.ok(source.attribution, `${source.publicId} needs attribution`);
}

for (const name of species.vernacularNames) {
  assert.ok(
    sourceIds.has(name.sourcePublicId),
    `${name.term} references a missing source`,
  );
  assert.ok(name.context, `${name.term} needs cultural context`);
  assert.notEqual(name.reviewStatus, "accepted");
}

for (const variant of species.taxonomicVariants ?? []) {
  assert.ok(
    sourceIds.has(variant.sourcePublicId),
    `${variant.name} references a missing source`,
  );
  assert.ok(variant.context, `${variant.name} needs taxonomic context`);
  assert.notEqual(variant.reviewStatus, "accepted");
}

for (const place of species.distribution ?? []) {
  if (place.sourcePublicId) {
    assert.ok(
      sourceIds.has(place.sourcePublicId),
      `${place.label} references a missing source`,
    );
  }
}

const guide = await readJson(
  "content/cultivation-guides/echinopsis-pachanoi-demo.json",
);
assert.equal(guide.schemaVersion, "1.0");
assert.ok(guide.version >= 1, "Growing guides need a positive version");
assert.equal(guide.status, "published");
for (const claim of guide.claims) {
  assert.ok(claim.statement, "Every guide claim needs a statement");
  assert.ok(claim.sourcePublicId, "Every guide claim needs a source");
  assert.ok(
    sourceIds.has(claim.sourcePublicId),
    `${claim.sectionKey} references a missing source`,
  );
}

const culture = await readJson(
  "content/cultures/echinopsis-pachanoi-demo.json",
);
assert.equal(culture.schemaVersion, "1.0");
for (const relation of culture.relations) {
  assert.ok(
    relation.communityPublicId || relation.culturePublicId,
    "Cultural relations need a community or biological culture",
  );
  assert.ok(relation.sourcePublicId, "Cultural relations need a source");
  assert.ok(
    sourceIds.has(relation.sourcePublicId),
    `${relation.publicId} references a missing source`,
  );
  assert.ok(
    relation.authorPerspective,
    "Cultural relations need a perspective",
  );
  assert.ok(
    relation.assertionType,
    "Cultural relations need an assertion type",
  );
  assert.ok(
    relation.documentedByAgentPublicId,
    "Cultural relations need a documenting agent identifier",
  );
  assert.ok(relation.license, "Cultural relations need a license");
  if (relation.accessLevel !== "public" || relation.sensitivity !== "normal") {
    assert.notEqual(
      relation.reviewStatus,
      "accepted",
      "Restricted or sensitive relations cannot be accepted for public publication",
    );
  }
}

const manifest = await readJson(
  "apps/web/public/models/echinopsis-pachanoi-demo.manifest.json",
);
const model = await readFile(
  resolve(root, "apps/web/public/models/echinopsis-pachanoi-demo.glb"),
);
const modelHash = createHash("sha256").update(model).digest("hex");
assert.equal(manifest.contentHash, modelHash, "GLB and manifest hash differ");
assert.ok(manifest.license, "Procedural asset needs a license");
assert.ok(manifest.attribution, "Procedural asset needs attribution");
assert.equal(manifest.taxonomicClaim, false);

const scene = await readJson("content/scenes/echinopsis-pachanoi-demo.json");
const sceneAsset = scene.assets.find(
  (asset) => asset.publicId === "procedural-cactus-echinopsis-304",
);
assert.ok(sceneAsset, "Scene fixture must reference the demo asset");
assert.equal(sceneAsset.contentHash, manifest.contentHash);

console.log(
  JSON.stringify({
    species: species.publicId,
    sources: species.sources.length,
    vernacularNames: species.vernacularNames.length,
    guideClaims: guide.claims.length,
    culturalRelations: culture.relations.length,
    proceduralAsset: manifest.asset,
    contentHash: modelHash,
  }),
);
