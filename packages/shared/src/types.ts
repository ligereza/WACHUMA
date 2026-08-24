export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Id = Brand<string, "WachumaId">;
export type PublicId = Brand<string, "WachumaPublicId">;

export type Visibility =
  "public" | "restricted" | "sensitive" | "community-controlled";

export type TaxonRank =
  | "domain"
  | "kingdom"
  | "phylum"
  | "class"
  | "order"
  | "family"
  | "genus"
  | "species"
  | "subspecies"
  | "variety"
  | "form"
  | "hybrid";

export type BiologicalEntityType =
  | "species"
  | "subspecies"
  | "variety"
  | "cultivar"
  | "hybrid"
  | "clone"
  | "strain";

export type SpecimenType =
  | "plant-live"
  | "cutting"
  | "seed"
  | "agar-culture"
  | "liquid-culture"
  | "spawn"
  | "sample";

export type LineageRelationshipType =
  | "parent_of"
  | "cutting_of"
  | "clone_of"
  | "seed_from"
  | "culture_from"
  | "isolate_from"
  | "cross_of";

export type CulturalRelationType =
  | "vernacular_name"
  | "food"
  | "medicine"
  | "ritual"
  | "symbolism"
  | "material"
  | "cultivation"
  | "trade"
  | "mythology"
  | "art"
  | "archaeology"
  | "ecological_management"
  | "historical_account";

export type AssertionType =
  | "taxonomic_fact"
  | "contemporary_observation"
  | "historical_source"
  | "archaeological_evidence"
  | "academic_publication"
  | "horticultural_guidance"
  | "community_knowledge"
  | "editorial_interpretation";

export type EvidenceLevel =
  | "unverified"
  | "reported"
  | "documented"
  | "peer-reviewed"
  | "community-verified"
  | "modeled";

export type ReviewStatus =
  "draft" | "under-review" | "accepted" | "rejected" | "superseded";

export type ClaimSubjectType =
  | "taxon"
  | "biological_entity"
  | "specimen"
  | "culture"
  | "observation"
  | "place"
  | "cultural_relation"
  | "growing_guide"
  | "media";

export interface Claim {
  id: Id;
  publicId: PublicId;
  subjectType: ClaimSubjectType;
  subjectId: Id;
  predicate: string;
  objectType?: string;
  objectId?: Id;
  objectUri?: string;
  objectText?: string;
  value?: Record<string, unknown>;
  assertionType: AssertionType;
  evidenceLevel: EvidenceLevel;
  authorAgentId?: Id;
  sourceId: Id;
  sourcePublicId?: PublicId;
  sourceRecordId?: Id;
  authorPerspective?: string;
  recordedOn?: string;
  visibility: Visibility;
  license: string;
  reviewStatus: ReviewStatus;
}

export type DerivationEventType =
  | "parenting"
  | "cutting"
  | "cloning"
  | "seed_collection"
  | "culture_transfer"
  | "isolation"
  | "crossing"
  | "grafting"
  | "spawn_transfer"
  | "other";

export interface DerivationMaterial {
  id: Id;
  direction: "input" | "output";
  biologicalEntityId?: Id;
  specimenId?: Id;
  cultureId?: Id;
  label?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface DerivationEvent {
  id: Id;
  publicId: PublicId;
  eventType: DerivationEventType;
  method?: string;
  occurredAt: string;
  operatorAgentId?: Id;
  locationId?: Id;
  sourceId?: Id;
  notes?: string;
  visibility: Visibility;
  materials: DerivationMaterial[];
}

export type ProtocolType =
  | "observation"
  | "cultivation"
  | "community"
  | "identification"
  | "measurement";

export interface Protocol {
  id: Id;
  publicId: PublicId;
  protocolType: ProtocolType;
  title: string;
  version: string;
  description?: string;
  communityId?: Id;
  sourceId?: Id;
  license: string;
  accessLevel: Visibility;
  status: "draft" | "review" | "published" | "retired";
}

export type TraitValueType =
  "boolean" | "numeric" | "text" | "category" | "range" | "json";

export interface TraitDefinition {
  id: Id;
  namespace: string;
  identifier: string;
  label: string;
  valueType: TraitValueType;
  preferredUnit?: string;
  description?: string;
  sourceId?: Id;
}

export interface TraitMeasurement {
  id: Id;
  publicId: PublicId;
  traitDefinitionId: Id;
  traitNamespace: string;
  traitIdentifier: string;
  traitLabel: string;
  taxonId?: Id;
  biologicalEntityId?: Id;
  specimenId?: Id;
  observationId?: Id;
  valueNumeric?: number;
  valueText?: string;
  value?: Record<string, unknown>;
  unit?: string;
  measuredAt: string;
  method?: string;
  uncertainty: Record<string, unknown>;
  protocolId?: Id;
  sourceId: Id;
  visibility: Visibility;
}

export interface SourceRecordQualityFlag {
  id: Id;
  sourceRecordId: Id;
  flagCode: string;
  severity: "info" | "warning" | "error";
  fieldName?: string;
  message: string;
}

export interface ProvenanceRecord {
  recordId: Id;
  entityType:
    | "taxon"
    | "biological_entity"
    | "specimen"
    | "culture"
    | "observation"
    | "place"
    | "media"
    | "garden_scene"
    | "scene_asset"
    | "procedural_recipe"
    | "source";
  entityId: Id;
  source: string;
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

export interface Taxon {
  id: Id;
  publicId: PublicId;
  scientificName: string;
  rank: TaxonRank;
  taxonomicStatus: "accepted" | "synonym" | "doubtful" | "unresolved";
  acceptedName?: string;
  externalIdentifiers: ExternalIdentifier[];
}

export interface BiologicalEntity {
  id: Id;
  publicId: PublicId;
  entityType: BiologicalEntityType;
  displayName: string;
  taxonId?: Id;
  visibility: Visibility;
}

export interface Specimen {
  id: Id;
  publicId: PublicId;
  specimenType: SpecimenType;
  biologicalEntityId: Id;
  status: "alive" | "stored" | "archived" | "lost" | "deceased";
  visibility: Visibility;
  acquiredAt?: string;
}

export interface LineageRelationship {
  id: Id;
  relationshipType: LineageRelationshipType;
  parentEntityId?: Id;
  parentSpecimenId?: Id;
  childEntityId?: Id;
  childSpecimenId?: Id;
  generationLabel?: string;
  sourceId?: Id;
}

export interface CulturalRelation {
  id: Id;
  relationType: CulturalRelationType;
  taxonId?: Id;
  biologicalEntityId?: Id;
  cultureId?: Id;
  communityId?: Id;
  placeId?: Id;
  historicalPeriodId?: Id;
  sourceId: Id;
  description: string;
  evidenceLevel: "unverified" | "reported" | "documented" | "peer-reviewed";
  assertionType: AssertionType;
  authorPerspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  license?: string;
  accessLevel: Visibility;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
  recordedOn?: string;
}

export interface ExternalIdentifier {
  namespace:
    | "gbif"
    | "inaturalist"
    | "wikidata"
    | "ipni"
    | "powo"
    | "doi"
    | "orcid"
    | "geonames"
    | string;
  identifier: string;
  canonicalUrl?: string;
  retrievedAt?: string;
}
