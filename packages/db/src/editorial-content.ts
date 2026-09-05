import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type EditorialSourceReference = {
  publicId: string;
  title: string;
  citation: string;
  url?: string;
  doi?: string;
  publishedOn?: string;
  accessedAt?: string;
  sourceType: string;
  license: string;
  attribution: string;
  [key: string]: unknown;
};

export type EditorialSpeciesDocument = {
  schemaVersion: string;
  publicId: string;
  scientificName: string;
  rank?: string;
  taxonomicStatus?: string;
  entityType?: string;
  authorityNote?: string;
  visibility?: string;
  description?: string;
  externalIdentifiers?: Array<{
    namespace: string;
    identifier: string;
    canonicalUrl?: string;
    license?: string;
  }>;
  pathogens?: EditorialPathogenDocument[];
  pathogenicityClaims?: EditorialPathogenicityClaim[];
  relatedTaxa?: EditorialRelatedTaxonDocument[];
  relatedTaxonClaims?: EditorialRelatedTaxonClaim[];
  claims?: EditorialSpeciesClaim[];
  sources?: EditorialSourceReference[];
  [key: string]: unknown;
};

/** A reviewed biological entity linked to a pathogen risk in the species record. */
export type EditorialPathogenDocument = {
  publicId: string;
  scientificName: string;
  rank?: string;
  taxonomicStatus?: string;
  entityType?: string;
  authorityNote?: string;
  visibility?: string;
  description?: string;
  externalIdentifiers?: Array<{
    namespace: string;
    identifier: string;
    canonicalUrl?: string;
    license?: string;
  }>;
  sourcePublicId: string;
  sourceRecordId: string;
};

export type EditorialPathogenicityClaim = EditorialSpeciesClaim & {
  pathogenPublicId: string;
};

export type EditorialRelatedTaxonDocument = EditorialPathogenDocument & {
  synonyms?: string[];
};

export type EditorialRelatedTaxonClaim = EditorialSpeciesClaim & {
  relatedTaxonPublicId: string;
};

export type EditorialSpeciesClaim = {
  publicId: string;
  predicate: string;
  statement: string;
  assertionType: string;
  evidenceLevel: string;
  sourcePublicId: string;
  sourceRecordId: string;
  authorPerspective: string;
  recordedOn: string;
  visibility: "public" | "restricted" | "sensitive" | "community-controlled";
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
};

export type EditorialGuideClaim = {
  sectionKey: string;
  statement: string;
  evidenceLevel: string;
  sourcePublicId: string;
  assertionType: string;
};

export type EditorialGuideDocument = {
  schemaVersion: string;
  publicId: string;
  guideKey: string;
  version: number;
  title: string;
  biologicalEntityPublicId?: string;
  taxonPublicId?: string;
  climateContext?: string;
  techniqueContext?: string;
  regionContext?: string;
  status: string;
  summary?: string;
  coverage: {
    sections: Array<{
      sectionKey: string;
      status: string;
      note?: string;
    }>;
  };
  claims: EditorialGuideClaim[];
};

export type EditorialCultureDocument = {
  schemaVersion: string;
  relations: Array<EditorialCultureRelation>;
};

export type EditorialCultureRelation = {
  publicId: string;
  subjectPublicId: string;
  relationType: string;
  valueText?: string;
  description: string;
  communityPublicId?: string;
  culturePublicId?: string;
  placePublicId?: string;
  historicalPeriodPublicId?: string;
  documentedByAgentPublicId: string;
  sourcePublicId: string;
  evidenceLevel: string;
  assertionType: string;
  authorPerspective: string;
  sensitivity: string;
  accessLevel: string;
  license: string;
  reviewNote: string;
  recordedOn?: string;
  reviewStatus: string;
  [key: string]: unknown;
};

export type EditorialContentCatalog = {
  species: EditorialSpeciesDocument[];
  sources: EditorialSourceReference[];
  guides: EditorialGuideDocument[];
  cultures: EditorialCultureDocument[];
};

async function readDocuments<T>(directory: string): Promise<T[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (file) => {
      const contents = await readFile(join(directory, file), "utf8");
      return JSON.parse(contents) as T;
    }),
  );
}

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate editorial ${label}: ${value}`);
    }
    seen.add(value);
  }
}

export async function loadEditorialContent(
  rootDirectory: string,
): Promise<EditorialContentCatalog> {
  const [species, guides, cultures] = await Promise.all([
    readDocuments<EditorialSpeciesDocument>(
      join(rootDirectory, "content", "species"),
    ),
    readDocuments<EditorialGuideDocument>(
      join(rootDirectory, "content", "cultivation-guides"),
    ),
    readDocuments<EditorialCultureDocument>(
      join(rootDirectory, "content", "cultures"),
    ),
  ]);

  assertUnique(
    species.map((document) => document.publicId),
    "species publicId",
  );
  assertUnique(
    guides.map((document) => document.publicId),
    "guide publicId",
  );
  assertUnique(
    cultures.flatMap((document) =>
      document.relations.map((relation) => relation.publicId),
    ),
    "cultural relation publicId",
  );

  const sourcesByPublicId = new Map<string, EditorialSourceReference>();
  for (const source of species.flatMap((document) => document.sources ?? [])) {
    const existing = sourcesByPublicId.get(source.publicId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(source)) {
      throw new Error(
        `Editorial source ${source.publicId} has conflicting definitions`,
      );
    }
    sourcesByPublicId.set(source.publicId, source);
  }

  for (const guide of guides) {
    for (const claim of guide.claims) {
      if (!sourcesByPublicId.has(claim.sourcePublicId)) {
        throw new Error(
          `Editorial guide ${guide.publicId} references missing source ${claim.sourcePublicId}`,
        );
      }
    }
  }
  for (const speciesDocument of species) {
    for (const claim of speciesDocument.claims ?? []) {
      if (!sourcesByPublicId.has(claim.sourcePublicId)) {
        throw new Error(
          `Editorial species ${speciesDocument.publicId} references missing source ${claim.sourcePublicId}`,
        );
      }
    }
  }
  for (const culture of cultures) {
    for (const relation of culture.relations) {
      if (!sourcesByPublicId.has(relation.sourcePublicId)) {
        throw new Error(
          `Editorial relation ${relation.publicId} references missing source ${relation.sourcePublicId}`,
        );
      }
    }
  }

  for (const document of [...species, ...guides, ...cultures]) {
    if (document.schemaVersion !== "1.0") {
      throw new Error(
        `Unsupported editorial schemaVersion in ${JSON.stringify(document)}`,
      );
    }
  }

  return {
    species,
    sources: [...sourcesByPublicId.values()].sort((left, right) =>
      left.publicId.localeCompare(right.publicId),
    ),
    guides,
    cultures,
  };
}
