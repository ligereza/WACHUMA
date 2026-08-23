import type { Claim, DerivationMaterial } from "./types.js";

export interface KnowledgeValidationIssue {
  code: string;
  message: string;
  index?: number;
}

type DerivationMaterialInput = Pick<DerivationMaterial, "direction"> &
  Partial<
    Pick<
      DerivationMaterial,
      "biologicalEntityId" | "specimenId" | "cultureId" | "label"
    >
  >;

/**
 * A derivation event is only useful for provenance when its material graph is
 * complete: at least one input and one output, with one unambiguous identity
 * per material row. The database repeats these rules with CHECK constraints;
 * this function gives importers and API boundaries the same early feedback.
 */
export function validateDerivationMaterials(
  materials: readonly DerivationMaterialInput[],
): KnowledgeValidationIssue[] {
  const issues: KnowledgeValidationIssue[] = [];
  if (!materials.some((material) => material.direction === "input")) {
    issues.push({
      code: "missing_input",
      message: "A derivation event needs at least one input material",
    });
  }
  if (!materials.some((material) => material.direction === "output")) {
    issues.push({
      code: "missing_output",
      message: "A derivation event needs at least one output material",
    });
  }

  materials.forEach((material, index) => {
    const identifiers = [
      material.biologicalEntityId,
      material.specimenId,
      material.cultureId,
      material.label,
    ].filter((value) => value !== undefined && value !== null);
    if (identifiers.length !== 1) {
      issues.push({
        code: "material_identity_cardinality",
        message: "Each material needs exactly one biological identity",
        index,
      });
    }
    if (typeof material.label === "string" && material.label.trim() === "") {
      issues.push({
        code: "empty_material_label",
        message: "A material label cannot be blank",
        index,
      });
    }
  });
  return issues;
}

export function validateClaimPublication(claim: {
  visibility: Claim["visibility"];
  reviewStatus: Claim["reviewStatus"];
  sourceId?: string;
  license: string;
}): KnowledgeValidationIssue[] {
  if (claim.visibility !== "public") return [];
  const issues: KnowledgeValidationIssue[] = [];
  if (claim.reviewStatus !== "accepted") {
    issues.push({
      code: "public_claim_not_accepted",
      message: "A public claim must be accepted before publication",
    });
  }
  if (!claim.sourceId) {
    issues.push({
      code: "public_claim_missing_source",
      message: "A public claim must retain a source identifier",
    });
  }
  if (
    !claim.license.trim() ||
    claim.license.trim().toLowerCase() === "unknown"
  ) {
    issues.push({
      code: "public_claim_unknown_license",
      message: "A public claim must declare a usable license or restriction",
    });
  }
  return issues;
}
