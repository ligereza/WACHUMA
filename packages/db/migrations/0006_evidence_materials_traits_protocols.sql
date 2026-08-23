-- Evidence and knowledge graph foundations.
-- This migration keeps PostgreSQL as the source of truth while making every
-- new layer exportable to JSON-LD/RDF later through stable references.

CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  subject_type text NOT NULL CHECK (subject_type IN (
    'taxon', 'biological_entity', 'specimen', 'culture', 'observation',
    'place', 'cultural_relation', 'growing_guide', 'media'
  )),
  subject_id uuid NOT NULL,
  predicate text NOT NULL,
  object_type text,
  object_id uuid,
  object_uri text,
  object_text text,
  value_json jsonb,
  assertion_type assertion_type NOT NULL,
  evidence_level text NOT NULL DEFAULT 'reported' CHECK (evidence_level IN (
    'unverified', 'reported', 'documented', 'peer-reviewed',
    'community-verified', 'modeled'
  )),
  author_agent_id uuid REFERENCES agents(id),
  source_id uuid NOT NULL REFERENCES sources(id),
  source_record_id uuid REFERENCES source_records(id),
  author_perspective text,
  recorded_on date,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  license_uri text NOT NULL DEFAULT 'unknown',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN (
    'draft', 'under-review', 'accepted', 'rejected', 'superseded'
  )),
  superseded_by uuid REFERENCES claims(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(object_id, object_uri, object_text, value_json) = 1)
);

CREATE TABLE claim_sources (
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id),
  source_record_id uuid REFERENCES source_records(id),
  role text NOT NULL DEFAULT 'supporting' CHECK (role IN (
    'primary', 'supporting', 'contradicting', 'context'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE derivation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN (
    'parenting', 'cutting', 'cloning', 'seed_collection',
    'culture_transfer', 'isolation', 'crossing', 'grafting',
    'spawn_transfer', 'other'
  )),
  method text,
  occurred_at timestamptz NOT NULL,
  operator_agent_id uuid REFERENCES agents(id),
  location_id uuid REFERENCES locations(id),
  source_id uuid REFERENCES sources(id),
  notes text,
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE derivation_event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  derivation_event_id uuid NOT NULL REFERENCES derivation_events(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('input', 'output')),
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  culture_id uuid REFERENCES cultures(id),
  label text,
  quantity numeric,
  unit text,
  notes text,
  CHECK (num_nonnulls(biological_entity_id, specimen_id, culture_id) = 1)
);

CREATE TABLE protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  protocol_type text NOT NULL CHECK (protocol_type IN (
    'observation', 'cultivation', 'community', 'identification', 'measurement'
  )),
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  description text,
  community_id uuid REFERENCES communities(id),
  source_id uuid REFERENCES sources(id),
  license_uri text NOT NULL DEFAULT 'unknown',
  access_level visibility_level NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'review', 'published', 'retired'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE observations
  ADD COLUMN protocol_id uuid REFERENCES protocols(id),
  ADD COLUMN uncertainty jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cultural_relations
  ADD COLUMN protocol_id uuid REFERENCES protocols(id);

CREATE TABLE trait_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  identifier text NOT NULL,
  label text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN (
    'boolean', 'numeric', 'text', 'category', 'range', 'json'
  )),
  preferred_unit text,
  description text,
  source_id uuid REFERENCES sources(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, identifier)
);

CREATE TABLE trait_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  trait_definition_id uuid NOT NULL REFERENCES trait_definitions(id),
  taxon_id uuid REFERENCES taxa(id),
  biological_entity_id uuid REFERENCES biological_entities(id),
  specimen_id uuid REFERENCES specimens(id),
  observation_id uuid REFERENCES observations(id),
  value_numeric numeric,
  value_text text,
  value_json jsonb,
  unit text,
  measured_at timestamptz NOT NULL,
  method text,
  uncertainty jsonb NOT NULL DEFAULT '{}'::jsonb,
  protocol_id uuid REFERENCES protocols(id),
  source_id uuid NOT NULL REFERENCES sources(id),
  visibility visibility_level NOT NULL DEFAULT 'restricted',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(taxon_id, biological_entity_id, specimen_id, observation_id) = 1),
  CHECK (num_nonnulls(value_numeric, value_text, value_json) = 1)
);

CREATE TABLE source_record_quality_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  flag_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  field_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id, flag_code, field_name)
);

CREATE INDEX claims_subject_idx ON claims (subject_type, subject_id);
CREATE INDEX claims_public_review_idx ON claims (visibility, review_status, recorded_on);
CREATE INDEX claim_sources_source_idx ON claim_sources (source_id);
CREATE INDEX derivation_events_visibility_idx ON derivation_events (visibility, occurred_at);
CREATE INDEX derivation_materials_event_idx ON derivation_event_materials (derivation_event_id, direction);
CREATE INDEX protocols_public_status_idx ON protocols (access_level, status);
CREATE INDEX trait_measurements_subject_idx ON trait_measurements (specimen_id, observation_id);
CREATE INDEX trait_measurements_trait_idx ON trait_measurements (trait_definition_id, measured_at);
CREATE INDEX source_record_quality_flags_record_idx ON source_record_quality_flags (source_record_id);
