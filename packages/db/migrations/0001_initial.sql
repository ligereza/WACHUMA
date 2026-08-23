CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE visibility_level AS ENUM (
  'public',
  'restricted',
  'sensitive',
  'community-controlled'
);

CREATE TYPE assertion_type AS ENUM (
  'taxonomic_fact',
  'contemporary_observation',
  'historical_source',
  'archaeological_evidence',
  'academic_publication',
  'community_knowledge',
  'editorial_interpretation'
);

CREATE TYPE source_record_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'superseded'
);

CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  name text NOT NULL,
  source_type text NOT NULL,
  base_url text,
  terms_url text,
  default_license_uri text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES data_sources(id),
  source_record_id text NOT NULL,
  source_url text,
  retrieved_at timestamptz NOT NULL,
  license_uri text NOT NULL DEFAULT 'unknown',
  attribution text NOT NULL,
  assertion_type assertion_type NOT NULL,
  raw_payload jsonb NOT NULL,
  raw_checksum text,
  importer_version text NOT NULL,
  status source_record_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data_source_id, source_record_id, retrieved_at)
);

CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL CHECK (agent_type IN ('person', 'community', 'organization', 'editorial')),
  public_name text NOT NULL,
  orcid text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN (
    'scientific_publication',
    'historical_account',
    'archaeological_evidence',
    'community_knowledge',
    'external_dataset',
    'editorial'
  )),
  title text NOT NULL,
  citation text NOT NULL,
  url text,
  doi text,
  publisher text,
  author_agent_id uuid REFERENCES agents(id),
  license_uri text NOT NULL DEFAULT 'unknown',
  attribution text NOT NULL,
  published_on date,
  accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE historical_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  starts_on date,
  ends_on date,
  source_id uuid REFERENCES sources(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  name text NOT NULL,
  place_type text NOT NULL,
  country_code text,
  geometry_public geometry(Geometry, 4326),
  geometry_exact geometry(Geometry, 4326),
  visibility visibility_level NOT NULL DEFAULT 'public',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE taxa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  scientific_name text NOT NULL,
  rank text NOT NULL,
  taxonomic_status text NOT NULL DEFAULT 'unresolved',
  accepted_name text,
  parent_taxon_id uuid REFERENCES taxa(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE biological_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'species', 'subspecies', 'variety', 'cultivar', 'hybrid', 'clone', 'strain'
  )),
  display_name text NOT NULL,
  taxon_id uuid REFERENCES taxa(id),
  authority_note text,
  visibility visibility_level NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE specimens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  specimen_type text NOT NULL CHECK (specimen_type IN (
    'plant-live', 'cutting', 'seed', 'agar-culture', 'liquid-culture', 'spawn', 'sample'
  )),
  biological_entity_id uuid NOT NULL REFERENCES biological_entities(id),
  status text NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'stored', 'archived', 'lost', 'deceased')),
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  acquired_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cultures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_id uuid NOT NULL REFERENCES specimens(id),
  culture_type text NOT NULL CHECK (culture_type IN ('agar', 'liquid', 'spawn', 'tissue', 'other')),
  generation_label text,
  medium text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  name text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('garden', 'bed', 'greenhouse', 'shelf', 'container', 'lab', 'other')),
  parent_location_id uuid REFERENCES locations(id),
  geometry_public geometry(Geometry, 4326),
  geometry_exact geometry(Geometry, 4326),
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE specimen_locations (
  specimen_id uuid NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  PRIMARY KEY (specimen_id, location_id, starts_at),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  specimen_id uuid REFERENCES specimens(id),
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  place_id uuid REFERENCES places(id),
  location_id uuid REFERENCES locations(id),
  observed_at timestamptz NOT NULL,
  observation_basis text NOT NULL CHECK (observation_basis IN ('human', 'photo', 'specimen', 'external')),
  geometry_public geometry(Geometry, 4326),
  geometry_exact geometry(Geometry, 4326),
  environment jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  visibility visibility_level NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(specimen_id, taxon_id, biological_entity_id) >= 1)
);

CREATE TABLE growing_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  title text NOT NULL,
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  author_agent_id uuid REFERENCES agents(id),
  climate_context text,
  technique_context text,
  region_context text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_key, version),
  CHECK (num_nonnulls(taxon_id, biological_entity_id) = 1)
);

CREATE TABLE growing_guide_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  growing_guide_id uuid NOT NULL REFERENCES growing_guides(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN (
    'propagation', 'substrate', 'watering', 'light', 'temperature', 'humidity',
    'nutrition', 'calendar', 'pests', 'diseases', 'transplant', 'fruiting',
    'harvest', 'observations', 'bibliography'
  )),
  statement text NOT NULL,
  evidence_level text NOT NULL DEFAULT 'reported',
  source_id uuid REFERENCES sources(id),
  assertion_type assertion_type NOT NULL DEFAULT 'editorial_interpretation',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cultivation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_id uuid NOT NULL REFERENCES specimens(id),
  location_id uuid REFERENCES locations(id),
  event_type text NOT NULL CHECK (event_type IN (
    'propagation', 'watering', 'feeding', 'transplant', 'pest', 'disease',
    'fruiting', 'harvest', 'observation', 'move', 'other'
  )),
  occurred_at timestamptz NOT NULL,
  notes text,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_id uuid REFERENCES sources(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lineage_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_type text NOT NULL CHECK (relationship_type IN (
    'parent_of', 'cutting_of', 'clone_of', 'seed_from', 'culture_from', 'isolate_from', 'cross_of'
  )),
  parent_entity_id uuid REFERENCES biological_entities(id),
  parent_specimen_id uuid REFERENCES specimens(id),
  child_entity_id uuid REFERENCES biological_entities(id),
  child_specimen_id uuid REFERENCES specimens(id),
  generation_label text,
  occurred_at timestamptz,
  source_id uuid REFERENCES sources(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(parent_entity_id, parent_specimen_id) = 1),
  CHECK (num_nonnulls(child_entity_id, child_specimen_id) = 1)
);

CREATE TABLE cultural_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_type text NOT NULL CHECK (relation_type IN (
    'vernacular_name', 'food', 'medicine', 'ritual', 'symbolism', 'material',
    'cultivation', 'trade', 'mythology', 'art', 'archaeology',
    'ecological_management', 'historical_account'
  )),
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  culture_id uuid REFERENCES cultures(id),
  community_id uuid REFERENCES communities(id),
  place_id uuid REFERENCES places(id),
  historical_period_id uuid REFERENCES historical_periods(id),
  source_id uuid NOT NULL REFERENCES sources(id),
  description text NOT NULL,
  evidence_level text NOT NULL DEFAULT 'reported',
  assertion_type assertion_type NOT NULL DEFAULT 'community_knowledge',
  author_perspective text NOT NULL,
  sensitivity text NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'sensitive', 'sacred')),
  access_level visibility_level NOT NULL DEFAULT 'restricted',
  license_uri text NOT NULL DEFAULT 'unknown',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'under-review', 'accepted', 'rejected')),
  documented_by_agent_id uuid REFERENCES agents(id),
  recorded_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(taxon_id, biological_entity_id) = 1),
  CHECK (num_nonnulls(culture_id, community_id) >= 1)
);

CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'document')),
  uri text NOT NULL,
  title text,
  alt_text text,
  license_uri text NOT NULL DEFAULT 'unknown',
  attribution text NOT NULL,
  source_id uuid REFERENCES sources(id),
  visibility visibility_level NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_attachments (
  media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  observation_id uuid REFERENCES observations(id),
  growing_guide_id uuid REFERENCES growing_guides(id),
  cultural_relation_id uuid REFERENCES cultural_relations(id),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (media_id, sort_order),
  CHECK (num_nonnulls(taxon_id, biological_entity_id, specimen_id, observation_id, growing_guide_id, cultural_relation_id) = 1)
);

CREATE TABLE external_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  identifier text NOT NULL,
  canonical_url text,
  retrieved_at timestamptz,
  license_uri text,
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  place_id uuid REFERENCES places(id),
  UNIQUE (namespace, identifier),
  CHECK (num_nonnulls(taxon_id, biological_entity_id, specimen_id, place_id) = 1)
);

CREATE TABLE record_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES source_records(id),
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  culture_id uuid REFERENCES cultures(id),
  observation_id uuid REFERENCES observations(id),
  place_id uuid REFERENCES places(id),
  media_id uuid REFERENCES media(id),
  source_id uuid REFERENCES sources(id),
  community_id uuid REFERENCES communities(id),
  cultural_relation_id uuid REFERENCES cultural_relations(id),
  growing_guide_id uuid REFERENCES growing_guides(id),
  cultivation_event_id uuid REFERENCES cultivation_events(id),
  assertion_type assertion_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(
    taxon_id, biological_entity_id, specimen_id, culture_id, observation_id,
    place_id, media_id, source_id, community_id, cultural_relation_id,
    growing_guide_id, cultivation_event_id
  ) = 1)
);

CREATE INDEX taxa_scientific_name_trgm_idx ON taxa USING gin (scientific_name gin_trgm_ops);
CREATE INDEX biological_entities_display_name_trgm_idx ON biological_entities USING gin (display_name gin_trgm_ops);
CREATE INDEX observations_geometry_public_gist_idx ON observations USING gist (geometry_public);
CREATE INDEX places_geometry_public_gist_idx ON places USING gist (geometry_public);
CREATE INDEX locations_geometry_public_gist_idx ON locations USING gist (geometry_public);
CREATE INDEX source_records_lookup_idx ON source_records (data_source_id, source_record_id);
