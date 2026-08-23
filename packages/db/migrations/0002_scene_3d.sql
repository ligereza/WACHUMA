CREATE TYPE scene_coordinate_system AS ENUM ('local-meter', 'wgs84');

CREATE TYPE scene_asset_format AS ENUM ('glb', 'gltf', 'obj', 'blend', 'texture', 'thumbnail');

CREATE TYPE scene_asset_origin AS ENUM (
  'imported',
  'procedural',
  'specimen-capture',
  'editorial'
);

CREATE TYPE scene_representation_type AS ENUM (
  'scientific-reference',
  'specimen-capture',
  'cultivar-reference',
  'procedural-interpretation',
  'artistic-representation'
);

CREATE TYPE procedural_recipe_status AS ENUM (
  'draft',
  'validated',
  'generated',
  'failed',
  'archived'
);

CREATE TYPE scene_object_type AS ENUM (
  'specimen',
  'biological-entity',
  'planting-bed',
  'container',
  'terrain',
  'decorative',
  'marker'
);

ALTER TABLE media DROP CONSTRAINT IF EXISTS media_media_type_check;
ALTER TABLE media ADD CONSTRAINT media_media_type_check CHECK (
  media_type IN ('image', 'audio', 'video', 'document', 'model3d', 'texture')
);

CREATE TABLE generator_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_key text NOT NULL,
  version text NOT NULL,
  runtime text NOT NULL,
  repository_url text,
  license_uri text NOT NULL,
  attribution text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (algorithm_key, version)
);

CREATE TABLE garden_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  location_id uuid REFERENCES locations(id),
  coordinate_system scene_coordinate_system NOT NULL DEFAULT 'local-meter',
  units text NOT NULL DEFAULT 'meters' CHECK (units = 'meters'),
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  default_seed integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scene_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  format scene_asset_format NOT NULL,
  origin scene_asset_origin NOT NULL,
  content_hash text NOT NULL,
  title text,
  source_id uuid REFERENCES sources(id),
  generator_version_id uuid REFERENCES generator_versions(id),
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_hash, format)
);

CREATE TABLE garden_scene_assets (
  scene_id uuid NOT NULL REFERENCES garden_scenes(id) ON DELETE CASCADE,
  scene_asset_id uuid NOT NULL REFERENCES scene_assets(id) ON DELETE CASCADE,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scene_id, scene_asset_id)
);

CREATE TABLE procedural_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  algorithm_key text NOT NULL,
  algorithm_version text NOT NULL,
  seed integer NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_biological_entity_id uuid REFERENCES biological_entities(id),
  target_specimen_id uuid REFERENCES specimens(id),
  generated_asset_id uuid REFERENCES scene_assets(id),
  status procedural_recipe_status NOT NULL DEFAULT 'draft',
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(target_biological_entity_id, target_specimen_id) = 1)
);

CREATE TABLE procedural_recipe_sources (
  procedural_recipe_id uuid NOT NULL REFERENCES procedural_recipes(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id),
  PRIMARY KEY (procedural_recipe_id, source_id)
);

CREATE TABLE scene_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  scene_id uuid NOT NULL REFERENCES garden_scenes(id) ON DELETE CASCADE,
  object_type scene_object_type NOT NULL,
  label text NOT NULL,
  specimen_id uuid REFERENCES specimens(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  scene_asset_id uuid NOT NULL REFERENCES scene_assets(id),
  transform jsonb NOT NULL,
  representation_type scene_representation_type NOT NULL,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(specimen_id, biological_entity_id) <= 1)
);

CREATE TABLE scene_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES garden_scenes(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  content_hash text NOT NULL,
  scene_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, version)
);

CREATE TABLE scene_asset_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_asset_id uuid NOT NULL REFERENCES scene_assets(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sources(id),
  source_record_id uuid REFERENCES source_records(id),
  assertion_type assertion_type NOT NULL DEFAULT 'editorial_interpretation',
  license_uri text NOT NULL,
  attribution text NOT NULL,
  retrieved_at timestamptz,
  notes text,
  CHECK (num_nonnulls(source_id, source_record_id) >= 1)
);

CREATE INDEX garden_scenes_location_idx ON garden_scenes (location_id);
CREATE INDEX garden_scene_assets_asset_idx ON garden_scene_assets (scene_asset_id);
CREATE INDEX scene_objects_scene_idx ON scene_objects (scene_id);
CREATE INDEX scene_objects_specimen_idx ON scene_objects (specimen_id);
CREATE INDEX scene_objects_biological_entity_idx ON scene_objects (biological_entity_id);
CREATE INDEX procedural_recipes_target_entity_idx ON procedural_recipes (target_biological_entity_id);
CREATE INDEX procedural_recipes_target_specimen_idx ON procedural_recipes (target_specimen_id);
