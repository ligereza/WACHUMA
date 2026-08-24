-- Material fixtures are public-facing visual studies, not scientific
-- reconstructions. Their bindings keep the visual layer connected to claims
-- and sources without encoding scientific meaning in PBR values.
CREATE TYPE material_fixture_representation_type AS ENUM (
  'material-study',
  'specimen-capture',
  'procedural-interpretation'
);

CREATE TYPE material_fixture_binding_layer AS ENUM (
  'morphology',
  'cultivation',
  'chemistry',
  'ecology'
);

CREATE TYPE material_fixture_binding_target AS ENUM (
  'geometry',
  'baseColor',
  'roughness',
  'transmission',
  'emission',
  'animation'
);

CREATE TYPE material_fixture_binding_interpretation AS ENUM (
  'observed',
  'measured',
  'derived',
  'symbolic'
);

CREATE TABLE material_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  representation_type material_fixture_representation_type NOT NULL,
  growth_stage text,
  scene_asset_id uuid REFERENCES scene_assets(id),
  procedural_recipe_id uuid REFERENCES procedural_recipes(id),
  material jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation jsonb NOT NULL,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(biological_entity_id, specimen_id) >= 1),
  CHECK ((interpretation->>'label') = 'material-interpretation'),
  CHECK ((interpretation->>'scientificReconstruction') = 'false')
);

CREATE TABLE material_fixture_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  material_fixture_id uuid NOT NULL REFERENCES material_fixtures(id) ON DELETE CASCADE,
  layer material_fixture_binding_layer NOT NULL,
  target material_fixture_binding_target NOT NULL,
  interpretation material_fixture_binding_interpretation NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_fixture_binding_claims (
  binding_id uuid NOT NULL REFERENCES material_fixture_bindings(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id),
  PRIMARY KEY (binding_id, claim_id)
);

CREATE TABLE material_fixture_binding_sources (
  binding_id uuid NOT NULL REFERENCES material_fixture_bindings(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id),
  PRIMARY KEY (binding_id, source_id)
);

-- Chemistry is never allowed to become an unattributed visual shortcut.
CREATE FUNCTION validate_material_fixture_chemistry_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  binding_layer material_fixture_binding_layer;
BEGIN
  SELECT layer
  INTO binding_layer
  FROM material_fixture_bindings
  WHERE id = NEW.binding_id;

  IF binding_layer = 'chemistry' THEN
    IF NOT EXISTS (
      SELECT 1 FROM material_fixture_binding_claims WHERE binding_id = NEW.binding_id
    ) OR NOT EXISTS (
      SELECT 1 FROM material_fixture_binding_sources WHERE binding_id = NEW.binding_id
    ) THEN
      RAISE EXCEPTION 'Chemical material bindings require at least one claim and source';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER material_fixture_binding_claims_chemistry_check
AFTER INSERT OR UPDATE ON material_fixture_binding_claims
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_material_fixture_chemistry_binding();

CREATE CONSTRAINT TRIGGER material_fixture_binding_sources_chemistry_check
AFTER INSERT OR UPDATE ON material_fixture_binding_sources
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_material_fixture_chemistry_binding();

CREATE CONSTRAINT TRIGGER material_fixture_binding_chemistry_check
AFTER INSERT OR UPDATE ON material_fixture_bindings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_material_fixture_chemistry_binding();

CREATE INDEX material_fixtures_entity_idx
  ON material_fixtures (biological_entity_id)
  WHERE biological_entity_id IS NOT NULL;
CREATE INDEX material_fixtures_specimen_idx
  ON material_fixtures (specimen_id)
  WHERE specimen_id IS NOT NULL;
CREATE INDEX material_fixtures_visibility_idx
  ON material_fixtures (visibility);
CREATE INDEX material_fixture_bindings_fixture_idx
  ON material_fixture_bindings (material_fixture_id);
