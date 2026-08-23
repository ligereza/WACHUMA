import type { Sql } from "postgres";

export interface PublicSceneSummary {
  publicId: string;
  name: string;
  visibility: "public";
  version: number;
  objectCount: number;
}

export interface PublicSceneDocument {
  schemaVersion: "1.0";
  scene: Record<string, unknown>;
  assets: Record<string, unknown>[];
  objects: Record<string, unknown>[];
  recipes: Record<string, unknown>[];
}

type SceneRow = {
  id: string;
  public_id: string;
  name: string;
  description: string | null;
  location_id: string | null;
  coordinate_system: string;
  units: string;
  visibility: "public";
  current_version: number;
  default_seed: number | null;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  public_id: string;
  format: string;
  origin: string;
  uri: string;
  content_hash: string;
  title: string | null;
  license_uri: string;
  attribution: string;
  visibility: "public";
  metadata: Record<string, unknown>;
};

type ObjectRow = {
  id: string;
  public_id: string;
  object_type: string;
  label: string;
  specimen_id: string | null;
  biological_entity_id: string | null;
  scene_asset_id: string;
  transform: Record<string, unknown>;
  representation_type: string;
  visibility: "public";
  metadata: Record<string, unknown>;
};

type RecipeRow = {
  id: string;
  public_id: string;
  algorithm_key: string;
  algorithm_version: string;
  seed: number;
  parameters: Record<string, unknown>;
  constraints: Record<string, unknown>;
  target_biological_entity_id: string | null;
  target_specimen_id: string | null;
  generated_asset_id: string | null;
  source_ids: string[];
  status: string;
  visibility: "public";
};

export function createSceneRepository(sql: Sql) {
  return {
    async listPublicScenes(): Promise<PublicSceneSummary[]> {
      const rows = await sql<
        Array<{
          public_id: string;
          name: string;
          current_version: number;
          object_count: number | string;
        }>
      >`
        SELECT
          gs.public_id,
          gs.name,
          gs.current_version,
          COUNT(so.id) FILTER (
            WHERE gsa.scene_id IS NOT NULL
              AND sa.id IS NOT NULL
              AND m.id IS NOT NULL
          )::int AS object_count
        FROM garden_scenes AS gs
        LEFT JOIN scene_objects AS so
          ON so.scene_id = gs.id
         AND so.visibility = 'public'
          LEFT JOIN scene_assets AS sa
            ON sa.id = so.scene_asset_id
           AND sa.visibility = 'public'
          LEFT JOIN garden_scene_assets AS gsa
            ON gsa.scene_id = gs.id
           AND gsa.scene_asset_id = sa.id
           AND gsa.visibility = 'public'
          LEFT JOIN media AS m
            ON m.id = sa.media_id
           AND m.visibility = 'public'
        WHERE gs.visibility = 'public'
        GROUP BY gs.id
        ORDER BY gs.name ASC
      `;

      return rows.map((row) => ({
        publicId: row.public_id,
        name: row.name,
        visibility: "public",
        version: row.current_version,
        objectCount: Number(row.object_count),
      }));
    },

    async getPublicScene(
      publicId: string,
    ): Promise<PublicSceneDocument | null> {
      const [scene] = await sql<SceneRow[]>`
        SELECT
          id,
          public_id,
          name,
          description,
          location_id,
          coordinate_system,
          units,
          visibility,
          current_version,
          default_seed,
          created_at,
          updated_at
        FROM garden_scenes
        WHERE public_id = ${publicId}
          AND visibility = 'public'
        LIMIT 1
      `;

      if (!scene) return null;

      const [assets, objects, recipes] = await Promise.all([
        sql<AssetRow[]>`
          SELECT
            sa.id,
            sa.public_id,
            sa.format,
            sa.origin,
            m.uri,
            sa.content_hash,
            m.title,
            m.license_uri,
            m.attribution,
            sa.visibility,
            sa.metadata
          FROM scene_assets AS sa
          JOIN garden_scene_assets AS gsa
            ON gsa.scene_asset_id = sa.id
          JOIN media AS m ON m.id = sa.media_id
          WHERE gsa.scene_id = ${scene.id}
            AND gsa.visibility = 'public'
            AND sa.visibility = 'public'
            AND m.visibility = 'public'
        `,
        sql<ObjectRow[]>`
          SELECT
            so.id,
            so.public_id,
            so.object_type,
            so.label,
            so.specimen_id,
            so.biological_entity_id,
            so.scene_asset_id,
            so.transform,
            so.representation_type,
            so.visibility,
            so.metadata
          FROM scene_objects AS so
          JOIN scene_assets AS sa ON sa.id = so.scene_asset_id
          JOIN garden_scene_assets AS gsa
            ON gsa.scene_id = so.scene_id
           AND gsa.scene_asset_id = sa.id
          JOIN media AS m ON m.id = sa.media_id
          WHERE so.scene_id = ${scene.id}
            AND so.visibility = 'public'
            AND gsa.visibility = 'public'
            AND sa.visibility = 'public'
            AND m.visibility = 'public'
        `,
        sql<RecipeRow[]>`
          SELECT
            pr.id,
            pr.public_id,
            pr.algorithm_key,
            pr.algorithm_version,
            pr.seed,
            pr.parameters,
            pr.constraints,
            pr.target_biological_entity_id,
            pr.target_specimen_id,
            pr.generated_asset_id,
            COALESCE(
              ARRAY_AGG(prs.source_id) FILTER (WHERE prs.source_id IS NOT NULL),
              ARRAY[]::uuid[]
            )::text[] AS source_ids,
            pr.status,
            pr.visibility
          FROM procedural_recipes AS pr
          LEFT JOIN procedural_recipe_sources AS prs
            ON prs.procedural_recipe_id = pr.id
          LEFT JOIN scene_assets AS sa
            ON sa.id = pr.generated_asset_id
          WHERE pr.visibility = 'public'
            AND sa.visibility = 'public'
            AND EXISTS (
              SELECT 1
              FROM garden_scene_assets AS recipe_scene_assets
              WHERE recipe_scene_assets.scene_id = ${scene.id}
                AND recipe_scene_assets.scene_asset_id = pr.generated_asset_id
                AND recipe_scene_assets.visibility = 'public'
            )
            AND EXISTS (
              SELECT 1
              FROM media AS recipe_media
              WHERE recipe_media.id = sa.media_id
                AND recipe_media.visibility = 'public'
            )
          GROUP BY pr.id
        `,
      ]);

      return {
        schemaVersion: "1.0",
        scene: {
          id: scene.id,
          publicId: scene.public_id,
          name: scene.name,
          ...(scene.description ? { description: scene.description } : {}),
          ...(scene.location_id ? { locationId: scene.location_id } : {}),
          coordinateSystem: scene.coordinate_system,
          units: scene.units,
          visibility: scene.visibility,
          version: scene.current_version,
          ...(scene.default_seed === null
            ? {}
            : { defaultSeed: scene.default_seed }),
          createdAt: scene.created_at,
          updatedAt: scene.updated_at,
        },
        assets: assets.map((asset) => ({
          id: asset.id,
          publicId: asset.public_id,
          format: asset.format,
          origin: asset.origin,
          uri: asset.uri,
          contentHash: asset.content_hash,
          ...(asset.title ? { title: asset.title } : {}),
          license: asset.license_uri,
          attribution: asset.attribution,
          visibility: asset.visibility,
          metadata: asset.metadata,
        })),
        objects: objects.map((object) => ({
          id: object.id,
          publicId: object.public_id,
          objectType: object.object_type,
          label: object.label,
          ...(object.specimen_id ? { specimenId: object.specimen_id } : {}),
          ...(object.biological_entity_id
            ? { biologicalEntityId: object.biological_entity_id }
            : {}),
          sceneAssetId: object.scene_asset_id,
          transform: object.transform,
          representationType: object.representation_type,
          visibility: object.visibility,
          metadata: object.metadata,
        })),
        recipes: recipes.map((recipe) => ({
          id: recipe.id,
          publicId: recipe.public_id,
          algorithm: recipe.algorithm_key,
          algorithmVersion: recipe.algorithm_version,
          seed: recipe.seed,
          parameters: recipe.parameters,
          constraints: recipe.constraints,
          ...(recipe.target_biological_entity_id
            ? { targetBiologicalEntityId: recipe.target_biological_entity_id }
            : {}),
          ...(recipe.target_specimen_id
            ? { targetSpecimenId: recipe.target_specimen_id }
            : {}),
          ...(recipe.generated_asset_id
            ? { generatedAssetId: recipe.generated_asset_id }
            : {}),
          sourceIds: recipe.source_ids,
          status: recipe.status,
          visibility: recipe.visibility,
        })),
      };
    },
  };
}
