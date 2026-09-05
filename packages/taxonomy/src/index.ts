import type {
  BiologicalEntityType,
  Id,
  PublicId,
  SpeciesDocument,
  TaxonRank,
  Visibility,
} from "@wachuma/shared";

import { editorialSpeciesDocument } from "./generated/echinopsis-pachanoi.js";

// The development fixture the API serves under WACHUMA_DEMO_MODE, and the
// fallback the web uses when the API is unreachable. Every value comes from
// content/species/echinopsis-pachanoi.json through the generated module, so a
// fact is edited in the editorial document and nowhere else.
//
// Only the shape differences between the two contracts live here, and each one
// has a reason:
//   - id/taxonId/displayName are internal API fields; the editorial schema does
//     not carry them.
//   - externalIdentifiers drop `license` because the PostgreSQL projection in
//     taxonomy-repository.ts does not expose it either, and this fixture has to
//     answer like the real route.
//   - vernacularNames gain `relationType`, which SpeciesCulturalName requires
//     and the editorial schema forbids as an additional property.
//   - $schema, schemaVersion and authorityNote are the editorial envelope, and
//     claims reach the public surface from PostgreSQL, not from this fixture.
const asId = (value: string, field: string): Id => {
  if (!value.trim()) throw new Error(`${field} must not be empty`);
  return value as Id;
};

const asPublicId = (value: string, field: string): PublicId => {
  if (!value.trim()) throw new Error(`${field} must not be empty`);
  return value as PublicId;
};

const asEnum = <T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T => {
  if (!allowed.includes(value as T)) {
    throw new Error(`${field} has unsupported value: ${value}`);
  }
  return value as T;
};

const taxonRanks = [
  "domain",
  "kingdom",
  "phylum",
  "class",
  "order",
  "family",
  "genus",
  "species",
  "subspecies",
  "variety",
  "form",
  "hybrid",
] as const satisfies readonly TaxonRank[];
const entityTypes = [
  "species",
  "subspecies",
  "variety",
  "cultivar",
  "hybrid",
  "clone",
  "strain",
] as const satisfies readonly BiologicalEntityType[];
const visibilities = [
  "public",
  "restricted",
  "sensitive",
  "community-controlled",
] as const satisfies readonly Visibility[];

export const demoSpeciesDocument: SpeciesDocument = {
  id: asId("taxon-echinopsis-pachanoi", "id"),
  taxonId: asId("taxon-echinopsis-pachanoi", "taxonId"),
  publicId: asPublicId(editorialSpeciesDocument.publicId, "publicId"),
  scientificName: editorialSpeciesDocument.scientificName,
  displayName: editorialSpeciesDocument.scientificName,
  rank: asEnum(editorialSpeciesDocument.rank, taxonRanks, "rank"),
  taxonomicStatus: asEnum(
    editorialSpeciesDocument.taxonomicStatus,
    ["accepted", "synonym", "doubtful", "unresolved"],
    "taxonomicStatus",
  ),
  entityType: asEnum(
    editorialSpeciesDocument.entityType,
    entityTypes,
    "entityType",
  ),
  visibility: asEnum(
    editorialSpeciesDocument.visibility,
    visibilities,
    "visibility",
  ),
  description: editorialSpeciesDocument.description,
  taxonomicVariants: editorialSpeciesDocument.taxonomicVariants?.map(
    (variant) => ({
      ...variant,
      sourcePublicId: asPublicId(
        variant.sourcePublicId,
        "variant.sourcePublicId",
      ),
      relationType: asEnum(
        variant.relationType,
        ["historical_combination", "synonym", "unresolved_variant"],
        "variant.relationType",
      ),
      reviewStatus: asEnum(
        variant.reviewStatus,
        ["draft", "under-review", "accepted", "rejected"],
        "variant.reviewStatus",
      ),
    }),
  ),
  externalIdentifiers: editorialSpeciesDocument.externalIdentifiers.map(
    (identifier) => ({
      namespace: identifier.namespace,
      identifier: identifier.identifier,
      canonicalUrl: identifier.canonicalUrl,
    }),
  ),
  ecology: editorialSpeciesDocument.ecology,
  distribution: editorialSpeciesDocument.distribution.map((place) => ({
    label: place.label,
    sourcePublicId: asPublicId(place.sourcePublicId, "place.sourcePublicId"),
  })),
  cultivation: editorialSpeciesDocument.cultivation,
  vernacularNames: editorialSpeciesDocument.vernacularNames.map((name) => ({
    ...name,
    sourcePublicId: asPublicId(name.sourcePublicId, "name.sourcePublicId"),
    accessLevel: asEnum(name.accessLevel, visibilities, "name.accessLevel"),
    reviewStatus: asEnum(
      name.reviewStatus,
      ["draft", "under-review", "accepted", "rejected"],
      "name.reviewStatus",
    ),
    relationType: "vernacular_name",
  })),
  culturalRelations: [],
  history: editorialSpeciesDocument.history,
  sources: editorialSpeciesDocument.sources.map((source) => ({
    ...source,
    publicId: asPublicId(source.publicId, "source.publicId"),
  })),
  relatedSpecies: editorialSpeciesDocument.relatedSpecies,
  media: [],
};

export type { SpeciesDocument } from "@wachuma/shared";
