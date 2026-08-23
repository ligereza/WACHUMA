import type { AssertionType, Id, PublicId, Visibility } from "./types.js";

export type SceneCoordinateSystem = "local-meter" | "wgs84";

export type SceneAssetFormat =
  "glb" | "gltf" | "obj" | "blend" | "texture" | "thumbnail";

export type SceneAssetOrigin =
  "imported" | "procedural" | "specimen-capture" | "editorial";

export type SceneRepresentationType =
  | "scientific-reference"
  | "specimen-capture"
  | "cultivar-reference"
  | "procedural-interpretation"
  | "artistic-representation";

export type ProceduralAlgorithm =
  | "parametric-cactus"
  | "l-system"
  | "phyllotaxis"
  | "space-colonization"
  | "parametric-fungus"
  | "garden-layout"
  | string;

export type ProceduralAdapterBoundary = "in-process" | "external-process";

export interface ProceduralGeneratorReference {
  algorithm: ProceduralAlgorithm;
  algorithmVersion: string;
  runtime: string;
  repositoryUrl?: string;
  license: string;
  attribution: string;
}

export interface ProceduralAssetManifest {
  schemaVersion: "1.0";
  asset: string;
  format: SceneAssetFormat;
  contentHash: string;
  origin: "procedural";
  generator: ProceduralGeneratorReference;
  adapterBoundary: ProceduralAdapterBoundary;
  seed: number;
  license: string;
  attribution: string;
  representationType: SceneRepresentationType;
  taxonomicClaim: boolean;
  sourceUrl?: string;
}

export interface ProceduralAdapterRequest {
  schemaVersion: "1.0";
  recipe: {
    publicId: PublicId;
    algorithm: ProceduralAlgorithm;
    algorithmVersion: string;
    seed: number;
    parameters: Record<string, unknown>;
    constraints: Record<string, unknown>;
    targetBiologicalEntityId?: Id;
    targetSpecimenId?: Id;
    sourceIds: Id[];
  };
  output: {
    format: "glb";
    assetPath: string;
    manifestPath: string;
  };
  generator: ProceduralGeneratorReference;
}

export type ProceduralRecipeStatus =
  "draft" | "validated" | "generated" | "failed" | "archived";

export type SceneObjectType =
  | "specimen"
  | "biological-entity"
  | "planting-bed"
  | "container"
  | "terrain"
  | "decorative"
  | "marker";

export type Vector3 = readonly [number, number, number];
export type Quaternion = readonly [number, number, number, number];

export interface SceneTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface GardenScene {
  id: Id;
  publicId: PublicId;
  name: string;
  description?: string;
  locationId?: Id;
  coordinateSystem: SceneCoordinateSystem;
  units: "meters";
  visibility: Visibility;
  currentVersion: number;
  defaultSeed?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneAsset {
  id: Id;
  publicId: PublicId;
  format: SceneAssetFormat;
  origin: SceneAssetOrigin;
  uri: string;
  contentHash: string;
  title?: string;
  license: string;
  attribution: string;
  sourceId?: Id;
  visibility: Visibility;
  metadata: Record<string, unknown>;
}

export interface SceneObject {
  id: Id;
  publicId: PublicId;
  sceneId: Id;
  objectType: SceneObjectType;
  label: string;
  specimenId?: Id;
  biologicalEntityId?: Id;
  sceneAssetId: Id;
  transform: SceneTransform;
  representationType: SceneRepresentationType;
  visibility: Visibility;
  metadata: Record<string, unknown>;
}

export interface ProceduralRecipe {
  id: Id;
  publicId: PublicId;
  algorithm: ProceduralAlgorithm;
  algorithmVersion: string;
  seed: number;
  parameters: Record<string, unknown>;
  constraints: Record<string, unknown>;
  targetBiologicalEntityId?: Id;
  targetSpecimenId?: Id;
  generatedAssetId?: Id;
  sourceIds: Id[];
  status: ProceduralRecipeStatus;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface SceneSnapshot {
  id: Id;
  sceneId: Id;
  version: number;
  contentHash: string;
  scenePayload: Record<string, unknown>;
  createdAt: string;
}

export interface GeneratorVersion {
  id: Id;
  algorithm: ProceduralAlgorithm;
  version: string;
  runtime: string;
  repositoryUrl?: string;
  license: string;
  attribution: string;
}

export interface SceneAssetProvenance {
  sceneAssetId: Id;
  sourceId?: Id;
  sourceRecordId?: Id;
  assertionType: AssertionType;
  license: string;
  attribution: string;
  retrievedAt?: string;
  notes?: string;
}

export interface CactusRecipeParameters {
  height: number;
  radius: number;
  ribs: number;
  areolesPerRib: number;
  branching: number;
  maturity: number;
}

export interface GeneratedAreole {
  position: Vector3;
  rotation: Quaternion;
  heightRatio: number;
  ribIndex: number;
  index: number;
}

export interface GeneratedCactus {
  algorithm: "parametric-cactus";
  algorithmVersion: string;
  seed: number;
  parameters: CactusRecipeParameters;
  areoles: GeneratedAreole[];
}
