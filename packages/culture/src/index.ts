export interface DemoCulturalRelation {
  publicId: string;
  subjectPublicId: string;
  relationType: "vernacular_name";
  valueText: string;
  description: string;
  culturePublicId?: string;
  communityPublicId: string;
  placePublicId?: string;
  historicalPeriodPublicId?: string;
  documentedByAgentPublicId?: string;
  documentedByName?: string;
  historicalPeriod?: string;
  sourcePublicId: string;
  evidenceLevel: "unverified" | "reported" | "documented" | "peer-reviewed";
  assertionType:
    | "taxonomic_fact"
    | "contemporary_observation"
    | "historical_source"
    | "archaeological_evidence"
    | "academic_publication"
    | "community_knowledge"
    | "editorial_interpretation";
  authorPerspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  accessLevel: "public" | "restricted" | "sensitive" | "community-controlled";
  license: string;
  reviewNote?: string;
  recordedOn?: string;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
}

export function isPubliclyPublishableRelation(
  relation: Pick<
    DemoCulturalRelation,
    "accessLevel" | "reviewStatus" | "sensitivity"
  >,
): boolean {
  return (
    relation.accessLevel === "public" &&
    relation.reviewStatus === "accepted" &&
    relation.sensitivity === "normal"
  );
}

export const demoCulturalRelations: DemoCulturalRelation[] = [
  {
    publicId: "cultural-relation-wachuma-demo",
    subjectPublicId: "biological-entity-echinopsis-pachanoi",
    relationType: "vernacular_name",
    valueText: "wachuma",
    description:
      "Registro de demostración para mostrar procedencia y perspectiva; no es una afirmación histórica publicada.",
    communityPublicId: "community-demo-pending-review",
    historicalPeriodPublicId: "period-wachuma-demo",
    documentedByAgentPublicId: "agent-wachuma-editorial-demo",
    documentedByName: "WACHUMA · equipo editorial demo",
    sourcePublicId: "source-wachuma-demo-editorial",
    evidenceLevel: "unverified",
    assertionType: "editorial_interpretation",
    authorPerspective: "WACHUMA editorial demo",
    sensitivity: "sensitive",
    accessLevel: "restricted",
    license: "WACHUMA-PROJECT",
    reviewNote:
      "No publicar: requiere revisión de procedencia, contexto y consentimiento.",
    recordedOn: "2026-08-21",
    reviewStatus: "draft",
  },
];
