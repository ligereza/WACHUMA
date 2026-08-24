import type { Id, PublicId, Visibility } from "./types.js";

export type MaterialFixtureRepresentation =
  "material-study" | "specimen-capture" | "procedural-interpretation";

export type MaterialFixtureLayer =
  "morphology" | "cultivation" | "chemistry" | "ecology";

export type MaterialFixtureTarget =
  | "geometry"
  | "baseColor"
  | "roughness"
  | "transmission"
  | "emission"
  | "animation";

export type MaterialFixtureInterpretation =
  "observed" | "measured" | "derived" | "symbolic";

export interface MaterialFixtureMaterial {
  baseColor?: string;
  roughness?: number;
  metallic?: number;
  transmission?: number;
  ior?: number;
  emissiveColor?: string;
  emissiveStrength?: number;
}

export interface MaterialFixtureBinding {
  id: PublicId;
  layer: MaterialFixtureLayer;
  target: MaterialFixtureTarget;
  interpretation: MaterialFixtureInterpretation;
  claimIds: Id[];
  claimPublicIds?: PublicId[];
  sourceIds: Id[];
  sourcePublicIds?: PublicId[];
  notes?: string;
}

export interface MaterialFixture {
  $schema: "https://wachuma.org/schemas/material-fixture.schema.json";
  schemaVersion: "1.0";
  publicId: PublicId;
  subject: {
    biologicalEntityId?: Id;
    specimenId?: Id;
  };
  representationType: MaterialFixtureRepresentation;
  growthStage?: string;
  sceneAssetId?: Id;
  recipeId?: Id;
  material: MaterialFixtureMaterial;
  bindings: MaterialFixtureBinding[];
  interpretation: {
    label: "material-interpretation";
    scientificReconstruction: false;
    notes?: string;
  };
  visibility: Visibility;
}

export function createMaterialFixture(input: {
  publicId: PublicId;
  biologicalEntityId?: Id;
  specimenId?: Id;
  representationType: MaterialFixtureRepresentation;
  growthStage?: string;
  sceneAssetId?: Id;
  recipeId?: Id;
  material?: MaterialFixtureMaterial;
  bindings?: MaterialFixtureBinding[];
  notes?: string;
  visibility: Visibility;
}): MaterialFixture {
  if (!input.biologicalEntityId && !input.specimenId) {
    throw new Error(
      "A material fixture must reference a biological entity or specimen",
    );
  }

  for (const binding of input.bindings ?? []) {
    if (
      binding.layer === "chemistry" &&
      (binding.claimIds.length === 0 || binding.sourceIds.length === 0)
    ) {
      throw new Error(
        `Chemical material binding ${binding.id} requires claimIds and sourceIds`,
      );
    }
  }

  return {
    $schema: "https://wachuma.org/schemas/material-fixture.schema.json",
    schemaVersion: "1.0",
    publicId: input.publicId,
    subject: {
      ...(input.biologicalEntityId
        ? { biologicalEntityId: input.biologicalEntityId }
        : {}),
      ...(input.specimenId ? { specimenId: input.specimenId } : {}),
    },
    representationType: input.representationType,
    ...(input.growthStage ? { growthStage: input.growthStage } : {}),
    ...(input.sceneAssetId ? { sceneAssetId: input.sceneAssetId } : {}),
    ...(input.recipeId ? { recipeId: input.recipeId } : {}),
    material: { ...(input.material ?? {}) },
    bindings: (input.bindings ?? []).map((binding) => ({
      ...binding,
      claimIds: [...binding.claimIds],
      sourceIds: [...binding.sourceIds],
    })),
    interpretation: {
      label: "material-interpretation",
      scientificReconstruction: false,
      ...(input.notes ? { notes: input.notes } : {}),
    },
    visibility: input.visibility,
  };
}
