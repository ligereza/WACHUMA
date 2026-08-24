import type { Sql } from "postgres";
import type {
  Id,
  MaterialFixture,
  MaterialFixtureBinding,
  PublicId,
} from "@wachuma/shared";

type FixtureRow = {
  id: string;
  public_id: string;
  biological_entity_id: string | null;
  biological_entity_public_id: string | null;
  specimen_id: string | null;
  specimen_public_id: string | null;
  representation_type: MaterialFixture["representationType"];
  growth_stage: string | null;
  scene_asset_id: string | null;
  procedural_recipe_id: string | null;
  material: MaterialFixture["material"];
  interpretation: MaterialFixture["interpretation"];
  visibility: "public";
};

type BindingRow = {
  id: string;
  public_id: string;
  layer: MaterialFixtureBinding["layer"];
  target: MaterialFixtureBinding["target"];
  interpretation: MaterialFixtureBinding["interpretation"];
  claim_ids: string[];
  claim_public_ids: string[];
  source_ids: string[];
  source_public_ids: string[];
  notes: string | null;
};

export function createMaterialFixtureRepository(sql: Sql) {
  return {
    async getPublicMaterialFixture(
      subjectPublicId: string,
    ): Promise<MaterialFixture | null> {
      const [fixture] = await sql<FixtureRow[]>`
        SELECT
          mf.id,
          mf.public_id,
          mf.biological_entity_id,
          be.public_id AS biological_entity_public_id,
          mf.specimen_id,
          specimen.public_id AS specimen_public_id,
          mf.representation_type,
          mf.growth_stage,
          mf.scene_asset_id,
          mf.procedural_recipe_id,
          mf.material,
          mf.interpretation,
          mf.visibility
        FROM material_fixtures AS mf
        LEFT JOIN biological_entities AS be
          ON be.id = mf.biological_entity_id
         AND be.visibility = 'public'
        LEFT JOIN specimens AS specimen
          ON specimen.id = mf.specimen_id
         AND specimen.visibility = 'public'
        WHERE mf.visibility = 'public'
          AND (
            be.public_id = ${subjectPublicId}
            OR specimen.public_id = ${subjectPublicId}
            OR mf.public_id = ${subjectPublicId}
          )
          AND (
            mf.biological_entity_id IS NULL
            OR be.id IS NOT NULL
          )
          AND (
            mf.specimen_id IS NULL
            OR specimen.id IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM material_fixture_bindings AS chemistry_binding
            JOIN material_fixture_binding_claims AS chemistry_claim
              ON chemistry_claim.binding_id = chemistry_binding.id
            JOIN claims AS chemistry_claim_record
              ON chemistry_claim_record.id = chemistry_claim.claim_id
            WHERE chemistry_binding.material_fixture_id = mf.id
              AND chemistry_binding.layer = 'chemistry'
              AND chemistry_claim_record.visibility <> 'public'
          )
        ORDER BY mf.created_at ASC
        LIMIT 1
      `;

      if (!fixture) return null;

      const bindings = await sql<BindingRow[]>`
        SELECT
          mfb.id,
          mfb.public_id,
          mfb.layer,
          mfb.target,
          mfb.interpretation,
          COALESCE(
            ARRAY_AGG(DISTINCT claim.id::text)
              FILTER (WHERE claim.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS claim_ids,
          COALESCE(
            ARRAY_AGG(DISTINCT claim.public_id)
              FILTER (WHERE claim.public_id IS NOT NULL),
            ARRAY[]::text[]
          ) AS claim_public_ids,
          COALESCE(
            ARRAY_AGG(DISTINCT source.id::text)
              FILTER (WHERE source.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS source_ids,
          COALESCE(
            ARRAY_AGG(DISTINCT source.public_id)
              FILTER (WHERE source.public_id IS NOT NULL),
            ARRAY[]::text[]
          ) AS source_public_ids,
          mfb.notes
        FROM material_fixture_bindings AS mfb
        LEFT JOIN material_fixture_binding_claims AS binding_claim
          ON binding_claim.binding_id = mfb.id
        LEFT JOIN claims AS claim
          ON claim.id = binding_claim.claim_id
         AND claim.visibility = 'public'
        LEFT JOIN material_fixture_binding_sources AS binding_source
          ON binding_source.binding_id = mfb.id
        LEFT JOIN sources AS source
          ON source.id = binding_source.source_id
        WHERE mfb.material_fixture_id = ${fixture.id}
        GROUP BY mfb.id
        ORDER BY mfb.created_at ASC
      `;

      return {
        $schema:
          "https://wachuma.org/schemas/material-fixture.schema.json" as const,
        schemaVersion: "1.0" as const,
        publicId: fixture.public_id as PublicId,
        subject: {
          ...(fixture.biological_entity_id
            ? { biologicalEntityId: fixture.biological_entity_id as Id }
            : {}),
          ...(fixture.specimen_id
            ? { specimenId: fixture.specimen_id as Id }
            : {}),
        },
        representationType: fixture.representation_type,
        ...(fixture.growth_stage ? { growthStage: fixture.growth_stage } : {}),
        ...(fixture.scene_asset_id
          ? { sceneAssetId: fixture.scene_asset_id as Id }
          : {}),
        ...(fixture.procedural_recipe_id
          ? { recipeId: fixture.procedural_recipe_id as Id }
          : {}),
        material: fixture.material,
        bindings: bindings.map((binding): MaterialFixtureBinding => ({
          id: binding.public_id as PublicId,
          layer: binding.layer,
          target: binding.target,
          interpretation: binding.interpretation,
          claimIds: binding.claim_ids as Id[],
          claimPublicIds: binding.claim_public_ids as PublicId[],
          sourceIds: binding.source_ids as Id[],
          sourcePublicIds: binding.source_public_ids as PublicId[],
          ...(binding.notes ? { notes: binding.notes } : {}),
        })),
        interpretation: fixture.interpretation,
        visibility: fixture.visibility,
      };
    },
  };
}
