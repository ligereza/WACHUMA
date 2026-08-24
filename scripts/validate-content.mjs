import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEditorialContent } from "./editorial-content.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const guideSectionKeys = [
  "propagation",
  "substrate",
  "watering",
  "light",
  "temperature",
  "humidity",
  "nutrition",
  "calendar",
  "pests",
  "diseases",
  "transplant",
  "fruiting",
  "harvest",
  "observations",
  "bibliography",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

const editorialContent = await readEditorialContent(root);
const speciesDocuments = editorialContent.species;
const species = speciesDocuments[0];
const sourceIds = new Set(
  editorialContent.sources.map((source) => source.publicId),
);

for (const speciesDocument of speciesDocuments) {
  assert.equal(speciesDocument.schemaVersion, "1.0");
  assert.ok(speciesDocument.publicId, "Every species needs a publicId");
  assert.ok(
    speciesDocument.scientificName,
    "Every species needs a scientific name",
  );
  assert.ok(speciesDocument.rank, `${speciesDocument.publicId} needs a rank`);
  assert.ok(
    speciesDocument.taxonomicStatus,
    `${speciesDocument.publicId} needs a taxonomicStatus`,
  );
  assert.ok(
    speciesDocument.entityType,
    `${speciesDocument.publicId} needs an entityType`,
  );
  assert.ok(
    speciesDocument.authorityNote,
    `${speciesDocument.publicId} needs an authorityNote`,
  );
  for (const identifier of speciesDocument.externalIdentifiers ?? []) {
    assert.ok(identifier.namespace, "External identifiers need a namespace");
    assert.ok(identifier.identifier, "External identifiers need a value");
    assert.ok(
      identifier.canonicalUrl,
      "External identifiers need a canonical URL",
    );
    assert.ok(identifier.license, "External identifiers need a license");
  }

  for (const media of speciesDocument.media ?? []) {
    assert.ok(media.uri, "Every media item needs a URI");
    assert.ok(media.license, "Every media item needs a license");
    assert.ok(media.attribution, "Every media item needs attribution");
  }

  for (const source of speciesDocument.sources) {
    assert.ok(source.publicId, "Every source needs a publicId");
    assert.ok(source.title, `${source.publicId} needs a title`);
    assert.ok(source.citation, `${source.publicId} needs a citation`);
    assert.ok(source.sourceType, `${source.publicId} needs a sourceType`);
    assert.ok(source.license, `${source.publicId} needs a license`);
    assert.ok(source.attribution, `${source.publicId} needs attribution`);
    assert.ok(
      source.accessedAt,
      `${source.publicId} needs an accessedAt timestamp`,
    );
  }

  for (const claim of speciesDocument.claims ?? []) {
    assert.ok(
      claim.publicId,
      `${speciesDocument.publicId} claims need a publicId`,
    );
    assert.ok(claim.predicate, `${claim.publicId} needs a predicate`);
    assert.ok(claim.statement, `${claim.publicId} needs a statement`);
    assert.ok(claim.assertionType, `${claim.publicId} needs an assertionType`);
    assert.ok(claim.evidenceLevel, `${claim.publicId} needs an evidenceLevel`);
    assert.ok(
      sourceIds.has(claim.sourcePublicId),
      `${claim.publicId} references a missing source`,
    );
    assert.ok(
      claim.sourceRecordId,
      `${claim.publicId} needs a provider sourceRecordId`,
    );
    assert.ok(
      claim.authorPerspective,
      `${claim.publicId} needs an authorPerspective`,
    );
    assert.ok(claim.recordedOn, `${claim.publicId} needs a recordedOn date`);
    assert.ok(
      ["public", "restricted", "sensitive", "community-controlled"].includes(
        claim.visibility,
      ),
      `${claim.publicId} has an invalid visibility`,
    );
    assert.ok(
      ["draft", "under-review", "accepted", "rejected"].includes(
        claim.reviewStatus,
      ),
      `${claim.publicId} has an invalid reviewStatus`,
    );
  }

  for (const name of speciesDocument.vernacularNames ?? []) {
    assert.ok(
      sourceIds.has(name.sourcePublicId),
      `${name.term} references a missing source`,
    );
    assert.ok(name.context, `${name.term} needs cultural context`);
    assert.notEqual(name.reviewStatus, "accepted");
  }

  for (const variant of speciesDocument.taxonomicVariants ?? []) {
    assert.ok(
      sourceIds.has(variant.sourcePublicId),
      `${variant.name} references a missing source`,
    );
    assert.ok(variant.context, `${variant.name} needs taxonomic context`);
    assert.notEqual(variant.reviewStatus, "accepted");
  }

  for (const place of speciesDocument.distribution ?? []) {
    if (place.sourcePublicId) {
      assert.ok(
        sourceIds.has(place.sourcePublicId),
        `${place.label} references a missing source`,
      );
    }
  }
}

let guideClaims = 0;
const guideDocuments = editorialContent.guides;
for (const guide of guideDocuments) {
  assert.equal(guide.schemaVersion, "1.0");
  assert.ok(guide.version >= 1, "Growing guides need a positive version");
  assert.ok(
    guide.status === "published" || guide.status === "archived",
    `${guide.publicId} must be published or archived`,
  );
  assert.ok(
    guide.coverage && Array.isArray(guide.coverage.sections),
    `${guide.publicId} must declare coverage for every cultivation section`,
  );
  const coverageBySection = new Map(
    guide.coverage.sections.map((section) => [section.sectionKey, section]),
  );
  assert.equal(
    coverageBySection.size,
    guideSectionKeys.length,
    `${guide.publicId} coverage must contain each section exactly once`,
  );
  for (const sectionKey of guideSectionKeys) {
    const coverage = coverageBySection.get(sectionKey);
    assert.ok(
      coverage,
      `${guide.publicId} is missing coverage for ${sectionKey}`,
    );
    const claimCount = guide.claims.filter(
      (claim) => claim.sectionKey === sectionKey,
    ).length;
    assert.ok(
      coverage.status === "documented" ||
        coverage.status === "in_review" ||
        coverage.status === "not_documented" ||
        coverage.status === "not_applicable",
      `${guide.publicId} has an invalid coverage status for ${sectionKey}`,
    );
    if (claimCount > 0) {
      assert.notEqual(
        coverage.status,
        "not_documented",
        `${guide.publicId} has claims but marks ${sectionKey} as not documented`,
      );
      assert.notEqual(
        coverage.status,
        "not_applicable",
        `${guide.publicId} has claims but marks ${sectionKey} as not applicable`,
      );
    }
    if (coverage.status === "documented") {
      assert.ok(
        claimCount > 0 || sectionKey === "bibliography",
        `${guide.publicId} marks ${sectionKey} as documented without a claim`,
      );
    }
  }
  for (const claim of guide.claims) {
    guideClaims += 1;
    assert.ok(claim.statement, "Every guide claim needs a statement");
    assert.ok(claim.sourcePublicId, "Every guide claim needs a source");
    assert.ok(
      sourceIds.has(claim.sourcePublicId),
      `${claim.sectionKey} references a missing source`,
    );
  }
}

for (const culture of editorialContent.cultures) {
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
    if (
      relation.accessLevel !== "public" ||
      relation.sensitivity !== "normal"
    ) {
      assert.notEqual(
        relation.reviewStatus,
        "accepted",
        "Restricted or sensitive relations cannot be accepted for public publication",
      );
    }
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
    species: speciesDocuments.map((document) => document.publicId),
    sources: speciesDocuments.reduce(
      (count, document) => count + document.sources.length,
      0,
    ),
    vernacularNames: species.vernacularNames.length,
    guideClaims,
    culturalRelations: editorialContent.cultures.reduce(
      (count, document) => count + document.relations.length,
      0,
    ),
    guideCoverage: guideDocuments.map((guide) => {
      return {
        publicId: guide.publicId,
        documented: guide.coverage.sections.filter(
          (section) => section.status === "documented",
        ).length,
        notDocumented: guide.coverage.sections.filter(
          (section) => section.status === "not_documented",
        ).length,
      };
    }),
    proceduralAsset: manifest.asset,
    contentHash: modelHash,
  }),
);
