import type {
  AssertionType,
  BiologicalEntityType,
  Id,
  PublicId,
  SpecimenType,
  Visibility,
} from "./types.js";

export interface Source {
  id: Id;
  publicId: PublicId;
  sourceType:
    | "scientific_publication"
    | "historical_account"
    | "archaeological_evidence"
    | "community_knowledge"
    | "external_dataset"
    | "horticultural_guide"
    | "editorial";
  title: string;
  citation: string;
  url?: string;
  doi?: string;
  publisher?: string;
  license: string;
  attribution: string;
  publishedOn?: string;
  accessedAt?: string;
}

export interface SourceRecord {
  id: Id;
  sourceId: Id;
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: AssertionType;
  rawPayload: Record<string, unknown>;
  rawChecksum?: string;
  importerVersion: string;
  status: "pending" | "accepted" | "rejected" | "superseded";
}

export interface Location {
  id: Id;
  publicId: PublicId;
  name: string;
  locationType:
    "garden" | "bed" | "greenhouse" | "shelf" | "container" | "lab" | "other";
  parentLocationId?: Id;
  geometryPublic?: Record<string, unknown>;
  visibility: Visibility;
  notes?: string;
}

export interface PublicLocation {
  publicId: PublicId;
  name: string;
  locationType: Location["locationType"];
  parentPublicId?: PublicId;
  geometryPublic?: Record<string, unknown>;
  visibility: "public";
  notes?: string;
}

export interface SpecimenRecord {
  id: Id;
  publicId: PublicId;
  specimenType: SpecimenType;
  biologicalEntityId: Id;
  biologicalEntityPublicId?: PublicId;
  biologicalEntityType: BiologicalEntityType;
  status: "alive" | "stored" | "archived" | "lost" | "deceased";
  visibility: Visibility;
  acquiredAt?: string;
  currentLocation?: PublicLocation;
  qrUrl: string;
}

export interface Culture {
  id: Id;
  specimenId: Id;
  cultureType: "agar" | "liquid" | "spawn" | "tissue" | "other";
  generationLabel?: string;
  medium?: string;
  status: string;
}

export interface Observation {
  id: Id;
  publicId: PublicId;
  specimenId?: Id;
  taxonId?: Id;
  biologicalEntityId?: Id;
  placeId?: Id;
  locationId?: Id;
  observedAt: string;
  observationBasis: "human" | "photo" | "specimen" | "external";
  protocolId?: Id;
  geometryPublic?: Record<string, unknown>;
  environment: Record<string, unknown>;
  uncertainty: Record<string, unknown>;
  visibility: Visibility;
}

export interface PublicObservation {
  publicId: PublicId;
  subjectPublicId: PublicId;
  observedAt: string;
  observationBasis: Observation["observationBasis"];
  protocolPublicId?: PublicId;
  placePublicId?: PublicId;
  placeName?: string;
  geometryPublic?: Record<string, unknown>;
  environment: Record<string, unknown>;
  uncertainty: Record<string, unknown>;
  sourcePublicId?: PublicId;
  sourceRecordId?: string;
}

export interface GrowingGuide {
  id: Id;
  publicId: PublicId;
  guideKey: string;
  version: number;
  title: string;
  taxonId?: Id;
  biologicalEntityId?: Id;
  subjectPublicId?: PublicId;
  climateContext?: string;
  techniqueContext?: string;
  regionContext?: string;
  status: "draft" | "review" | "published" | "archived";
  summary?: string;
  sections: GrowingGuideSection[];
  claims: GrowingGuideClaim[];
}

export const GROWING_GUIDE_SECTION_KEYS = [
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
] as const;

export type GrowingGuideSectionKey =
  (typeof GROWING_GUIDE_SECTION_KEYS)[number];

export type GrowingGuideSectionStatus =
  "documented" | "in_review" | "not_documented" | "not_applicable";

export interface GrowingGuideSection {
  sectionKey: GrowingGuideSectionKey;
  status: GrowingGuideSectionStatus;
  claimCount: number;
  sourcePublicIds: PublicId[];
  note?: string;
}

export interface GrowingGuideSectionDeclaration {
  sectionKey: GrowingGuideSectionKey;
  status: GrowingGuideSectionStatus;
  note?: string;
}

export function buildGrowingGuideSections(
  claims: ReadonlyArray<{
    sectionKey: GrowingGuideSectionKey;
    evidenceLevel: string;
    sourcePublicId?: PublicId | null;
  }>,
  declarations?: readonly GrowingGuideSectionDeclaration[],
): GrowingGuideSection[] {
  const declarationsByKey = new Map(
    declarations?.map((declaration) => [declaration.sectionKey, declaration]) ??
      [],
  );

  return GROWING_GUIDE_SECTION_KEYS.map((sectionKey) => {
    const sectionClaims = claims.filter(
      (claim) => claim.sectionKey === sectionKey,
    );
    const declaration = declarationsByKey.get(sectionKey);
    const inferredStatus: GrowingGuideSectionStatus =
      sectionClaims.length === 0
        ? "not_documented"
        : sectionClaims.every((claim) => claim.evidenceLevel === "unverified")
          ? "in_review"
          : "documented";
    const sourcePublicIds = Array.from(
      new Set(
        sectionClaims.flatMap((claim) =>
          claim.sourcePublicId ? [claim.sourcePublicId] : [],
        ),
      ),
    );

    return {
      sectionKey,
      status: declaration?.status ?? inferredStatus,
      claimCount: sectionClaims.length,
      sourcePublicIds,
      ...(declaration?.note ? { note: declaration.note } : {}),
    };
  });
}

export interface GrowingGuideClaim {
  id: Id;
  sectionKey: GrowingGuideSectionKey;
  statement: string;
  evidenceLevel: string;
  sourceId?: Id;
  sourcePublicId?: PublicId;
  assertionType: AssertionType;
}

export interface CultivationEvent {
  id: Id;
  specimenId: Id;
  locationId?: Id;
  eventType:
    | "propagation"
    | "watering"
    | "feeding"
    | "transplant"
    | "pest"
    | "disease"
    | "fruiting"
    | "harvest"
    | "observation"
    | "move"
    | "other";
  occurredAt: string;
  notes?: string;
  measurements: Record<string, unknown>;
  sourceId?: Id;
}

export interface PublicCultivationEvent {
  id: Id;
  specimenPublicId: PublicId;
  locationPublicId?: PublicId;
  eventType: CultivationEvent["eventType"];
  occurredAt: string;
  notes?: string;
  measurements: Record<string, unknown>;
  sourcePublicId?: PublicId;
}

export interface Community {
  id: Id;
  publicId: PublicId;
  name: string;
  description?: string;
  visibility: Visibility;
}

export interface Place {
  id: Id;
  publicId: PublicId;
  name: string;
  placeType: string;
  countryCode?: string;
  geometryPublic?: Record<string, unknown>;
  visibility: Visibility;
}

export interface HistoricalPeriod {
  id: Id;
  name: string;
  description?: string;
  startsOn?: string;
  endsOn?: string;
  sourceId?: Id;
}

export interface CulturalRelationRecord {
  id: Id;
  relationType: string;
  taxonId?: Id;
  biologicalEntityId?: Id;
  cultureId?: Id;
  communityId?: Id;
  placeId?: Id;
  historicalPeriodId?: Id;
  sourceId: Id;
  valueText?: string;
  description: string;
  evidenceLevel: string;
  assertionType: AssertionType;
  authorPerspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  accessLevel: Visibility;
  license: string;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
  documentedByAgentId?: Id;
  protocolId?: Id;
  recordedOn?: string;
}

export interface PublicCulturalRelation {
  publicId: PublicId;
  subjectPublicId: PublicId;
  relationType: string;
  valueText?: string;
  description: string;
  culturePublicId?: PublicId;
  communityPublicId?: PublicId;
  communityName?: string;
  placePublicId?: PublicId;
  placeName?: string;
  historicalPeriodPublicId?: PublicId;
  historicalPeriod?: string;
  documentedByAgentPublicId?: PublicId;
  documentedByName?: string;
  recordedOn?: string;
  sourcePublicId: PublicId;
  evidenceLevel: string;
  authorPerspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  accessLevel: "public";
  license: string;
  reviewStatus: "accepted";
}

export interface Media {
  id: Id;
  uri: string;
  mediaType: "image" | "audio" | "video" | "document" | "model3d" | "texture";
  title?: string;
  license: string;
  attribution: string;
  visibility: Visibility;
}
