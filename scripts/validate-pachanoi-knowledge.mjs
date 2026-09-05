import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readEditorialContent } from "./editorial-content.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalog = await readEditorialContent(root);
const species = catalog.species.find(
  (document) => document.publicId === "biological-entity-echinopsis-pachanoi",
);
assert.ok(species, "The Echinopsis pachanoi editorial document is required");

const sourceByPublicId = new Map(
  catalog.sources.map((source) => [source.publicId, source]),
);
const claims = species.claims ?? [];
const claimCounts = new Map();

for (const claim of claims) {
  claimCounts.set(claim.predicate, (claimCounts.get(claim.predicate) ?? 0) + 1);
  const source = sourceByPublicId.get(claim.sourcePublicId);
  assert.ok(source, `${claim.publicId} must resolve an editorial source`);
  assert.ok(
    claim.sourceRecordId,
    `${claim.publicId} must keep a provider sourceRecordId`,
  );
}

for (const [predicate, minimum] of [
  ["historicalTaxonomy", 2],
  ["molecularPhylogeny", 1],
  ["chloroplastPhylogeny", 1],
]) {
  assert.ok(
    (claimCounts.get(predicate) ?? 0) >= minimum,
    `Echinopsis pachanoi needs at least ${minimum} ${predicate} claim(s)`,
  );
}

const ipni = sourceByPublicId.get("source-ipni-trichocereus-pachanoi-1920");
assert.ok(ipni, "The IPNI protologue source is required");
assert.equal(ipni.url, "https://www.ipni.org/n/257116-2");

const molecularClaims = claims.filter((claim) =>
  ["molecularPhylogeny", "chloroplastPhylogeny"].includes(claim.predicate),
);
assert.ok(
  molecularClaims.some((claim) =>
    /no es un genoma de referencia|no identifica por sí solo un clon/i.test(
      claim.statement,
    ),
  ),
  "Molecular claims must state their scope limitation",
);

const historicalStatements = claims
  .filter((claim) => claim.predicate === "historicalTaxonomy")
  .map((claim) => claim.statement)
  .join(" ");
assert.match(historicalStatements, /1920/);
assert.match(historicalStatements, /1974/);

console.log(
  JSON.stringify(
    {
      species: species.publicId,
      claims: claims.length,
      historicalTaxonomy: claimCounts.get("historicalTaxonomy") ?? 0,
      molecularPhylogeny: claimCounts.get("molecularPhylogeny") ?? 0,
      chloroplastPhylogeny: claimCounts.get("chloroplastPhylogeny") ?? 0,
      scopeLimitation: true,
      ipniSource: ipni.publicId,
    },
    null,
    2,
  ),
);
