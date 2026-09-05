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
const pathogens = species.pathogens ?? [];
const pathogenicityClaims = species.pathogenicityClaims ?? [];
const relatedTaxa = species.relatedTaxa ?? [];
const relatedTaxonClaims = species.relatedTaxonClaims ?? [];
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

assert.ok(
  pathogens.length >= 2,
  "The pachanoi record needs at least two pathogen entities",
);
assert.equal(
  pathogenicityClaims.length,
  pathogens.length,
  "Each pathogen entity needs one sourced pathogenicity relation",
);
const pathogenIds = new Set(pathogens.map((pathogen) => pathogen.publicId));
for (const pathogen of pathogens) {
  assert.equal(pathogen.entityType, "species");
  assert.equal(pathogen.visibility, "restricted");
  assert.ok(
    pathogen.externalIdentifiers?.some(
      (identifier) =>
        identifier.namespace === "gbif" && identifier.canonicalUrl,
    ),
    `${pathogen.publicId} needs a GBIF identifier`,
  );
}
for (const claim of pathogenicityClaims) {
  assert.ok(
    pathogenIds.has(claim.pathogenPublicId),
    `${claim.publicId} needs a pathogen entity`,
  );
  assert.equal(claim.predicate, "pathogenicity");
  assert.match(
    claim.statement,
    /no (?:una |una )?inoculaci[oó]n confirmada|no demuestra infecci[oó]n|no prueba un hospedero/i,
    `${claim.publicId} must state the direct pachanoi evidence limit`,
  );
  assert.ok(
    claim.sourcePublicId && sourceByPublicId.has(claim.sourcePublicId),
    `${claim.publicId} needs a cited phytopathology source`,
  );
}
const oomycete = pathogens.find(
  (pathogen) => pathogen.publicId === "biological-entity-phytophthora-cactorum",
);
assert.ok(oomycete, "The corpus must distinguish Phytophthora cactorum");
assert.match(oomycete.description ?? "", /oomiceto/i);
assert.match(oomycete.authorityNote ?? "", /no hongo/i);

assert.ok(
  relatedTaxa.length >= 2,
  "The pachanoi record needs at least two related cactus taxa",
);
assert.equal(
  relatedTaxonClaims.length,
  relatedTaxa.length,
  "Each related cactus needs one sourced relation claim",
);
const relatedTaxonIds = new Set(relatedTaxa.map((taxon) => taxon.publicId));
for (const relatedTaxon of relatedTaxa) {
  assert.equal(relatedTaxon.entityType, "species");
  assert.equal(relatedTaxon.visibility, "restricted");
  assert.ok(
    relatedTaxon.externalIdentifiers?.some(
      (identifier) =>
        identifier.namespace === "gbif" &&
        identifier.canonicalUrl &&
        identifier.license === "CC BY 4.0",
    ),
    `${relatedTaxon.publicId} needs a licensed GBIF identifier`,
  );
}
for (const claim of relatedTaxonClaims) {
  assert.ok(
    relatedTaxonIds.has(claim.relatedTaxonPublicId),
    `${claim.publicId} needs a related taxon entity`,
  );
  assert.equal(claim.predicate, "relatedTaxon");
  assert.match(
    claim.statement,
    /no (?:prueba|demuestra).*(?:identidad|sinonimia|grupo hermano|equivalencia)|no.*(?:identidad|sinonimia|grupo hermano|equivalencia)/i,
    `${claim.publicId} must state the relationship evidence limit`,
  );
  assert.ok(
    claim.sourcePublicId && sourceByPublicId.has(claim.sourcePublicId),
    `${claim.publicId} needs a cited taxonomic source`,
  );
}
assert.ok(
  relatedTaxa.some((taxon) => taxon.scientificName === "Echinopsis peruviana"),
  "Echinopsis peruviana must be represented",
);
assert.ok(
  relatedTaxa.some(
    (taxon) =>
      taxon.scientificName === "Echinopsis lageniformis" &&
      taxon.synonyms?.includes("Trichocereus bridgesii"),
  ),
  "Echinopsis lageniformis / Trichocereus bridgesii must be represented",
);

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

assert.equal(
  species.taxonomicStatus,
  "unresolved",
  "The editorial record must not choose between the documented taxonomic treatments",
);
const powoTreatment = claims.find(
  (claim) => claim.publicId === "claim-powo-echinopsis-pachanoi-accepted",
);
const albesianoKieslingTreatment = claims.find(
  (claim) =>
    claim.publicId === "claim-albesiano-kiesling-macrogonus-pachanoi-2012",
);
assert.ok(powoTreatment, "The POWO taxonomic treatment is required");
assert.equal(powoTreatment.predicate, "taxonomicStatus");
assert.equal(powoTreatment.sourcePublicId, "source-powo-echinopsis-pachanoi");
assert.match(powoTreatment.statement, /Echinopsis pachanoi.*especie/i);
assert.ok(
  albesianoKieslingTreatment,
  "The Albesiano and Kiesling taxonomic treatment is required",
);
assert.equal(albesianoKieslingTreatment.predicate, "taxonomicStatus");
assert.equal(
  albesianoKieslingTreatment.sourcePublicId,
  "source-albesiano-kiesling-macrogonus-2012",
);
assert.equal(
  albesianoKieslingTreatment.sourceRecordId,
  "doi:10.2985/1070-0048-17.1.3",
);
assert.match(
  albesianoKieslingTreatment.statement,
  /Trichocereus macrogonus var\. pachanoi/i,
);
assert.match(
  albesianoKieslingTreatment.statement,
  /no identifica por sí solo/i,
);

const albesianoKieslingSource = sourceByPublicId.get(
  "source-albesiano-kiesling-macrogonus-2012",
);
assert.ok(
  albesianoKieslingSource,
  "The Albesiano and Kiesling source is required",
);
assert.equal(albesianoKieslingSource.doi, "10.2985/1070-0048-17.1.3");
assert.equal(albesianoKieslingSource.publishedOn, "2012-03-31");
assert.match(albesianoKieslingSource.citation, /Haseltonia, 17, 24–34/);

const combinationIpni = species.externalIdentifiers?.find(
  (identifier) =>
    identifier.namespace === "ipni" && identifier.identifier === "77125731-1",
);
assert.ok(combinationIpni, "The 2012 combination needs its IPNI identifier");
assert.equal(combinationIpni.canonicalUrl, "https://www.ipni.org/n/77125731-1");
assert.ok(
  species.taxonomicVariants?.some(
    (variant) =>
      variant.name === "Trichocereus macrogonus var. pachanoi" &&
      variant.relationType === "unresolved_variant" &&
      variant.reviewStatus === "under-review",
  ),
  "The alternate treatment must remain an unresolved variant",
);

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
      taxonomicStatus: species.taxonomicStatus,
      taxonomicTreatments: [
        powoTreatment.publicId,
        albesianoKieslingTreatment.publicId,
      ],
      combinationIpni: combinationIpni.identifier,
      relatedTaxa: relatedTaxa.map((taxon) => taxon.scientificName),
    },
    null,
    2,
  ),
);
