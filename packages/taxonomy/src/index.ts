import type { SpeciesDocument } from "@wachuma/shared";

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
export const demoSpeciesDocument = {
  id: "taxon-echinopsis-pachanoi",
  taxonId: "taxon-echinopsis-pachanoi",
  publicId: editorialSpeciesDocument.publicId,
  scientificName: editorialSpeciesDocument.scientificName,
  displayName: editorialSpeciesDocument.scientificName,
  rank: editorialSpeciesDocument.rank,
  taxonomicStatus: editorialSpeciesDocument.taxonomicStatus,
  entityType: editorialSpeciesDocument.entityType,
  visibility: editorialSpeciesDocument.visibility,
  description: editorialSpeciesDocument.description,
  taxonomicVariants: editorialSpeciesDocument.taxonomicVariants,
  externalIdentifiers: editorialSpeciesDocument.externalIdentifiers.map(
    (identifier) => ({
      namespace: identifier.namespace,
      identifier: identifier.identifier,
      canonicalUrl: identifier.canonicalUrl,
    }),
  ),
  ecology: editorialSpeciesDocument.ecology,
  distribution: editorialSpeciesDocument.distribution,
  cultivation: editorialSpeciesDocument.cultivation,
  vernacularNames: editorialSpeciesDocument.vernacularNames.map((name) => ({
    ...name,
    relationType: "vernacular_name",
  })),
  culturalRelations: editorialSpeciesDocument.culturalRelations,
  history: editorialSpeciesDocument.history,
  sources: editorialSpeciesDocument.sources,
  relatedSpecies: editorialSpeciesDocument.relatedSpecies,
} as unknown as SpeciesDocument;

export type { SpeciesDocument } from "@wachuma/shared";
