import type {
  BiologicalEntityType,
  Id,
  PublicId,
  TaxonRank,
  Visibility,
} from "./types.js";

export interface SpeciesSummary {
  publicId: PublicId;
  scientificName: string;
  displayName: string;
  rank: TaxonRank;
  taxonomicStatus: "accepted" | "synonym" | "doubtful" | "unresolved";
  entityType: BiologicalEntityType;
  acceptedName?: string;
  visibility: Visibility;
  externalIdentifiers: Array<{
    namespace: string;
    identifier: string;
    canonicalUrl?: string;
  }>;
}

export interface SpeciesSourceReference {
  publicId: PublicId;
  title: string;
  citation: string;
  url?: string;
  sourceType: string;
  license: string;
  attribution: string;
}

export interface SpeciesCulturalName {
  term: string;
  relationType: "vernacular_name";
  context: string;
  sourcePublicId: PublicId;
  accessLevel: Visibility;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
}

export interface SpeciesTaxonomicVariant {
  name: string;
  relationType: "historical_combination" | "synonym" | "unresolved_variant";
  context: string;
  sourcePublicId: PublicId;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
}

export interface SpeciesDocument extends SpeciesSummary {
  id: Id;
  taxonId?: Id;
  taxonomicVariants?: SpeciesTaxonomicVariant[];
  description: string;
  ecology: string[];
  distribution: Array<{
    placePublicId?: PublicId;
    observationPublicId?: PublicId;
    label: string;
    geometry?: Record<string, unknown>;
    sourcePublicId?: PublicId;
  }>;
  cultivation: string[];
  vernacularNames: SpeciesCulturalName[];
  culturalRelations: Array<{
    relationType: string;
    description: string;
    sourcePublicId: PublicId;
    accessLevel: Visibility;
    reviewStatus: string;
  }>;
  history: string[];
  sources: SpeciesSourceReference[];
  relatedSpecies: SpeciesSummary[];
  media: Array<{
    uri: string;
    mediaType?: string;
    title?: string;
    license: string;
    attribution: string;
  }>;
}
