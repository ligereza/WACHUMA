ALTER TABLE cultural_relations
  ADD COLUMN IF NOT EXISTS value_text text;

ALTER TABLE cultural_relations
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES sources(id);

CREATE INDEX IF NOT EXISTS places_source_idx
  ON places (source_id);

CREATE UNIQUE INDEX IF NOT EXISTS media_uri_unique_idx
  ON media (uri);

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_taxon_unique_idx
  ON record_provenance (source_record_id, taxon_id)
  WHERE taxon_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_biological_entity_unique_idx
  ON record_provenance (source_record_id, biological_entity_id)
  WHERE biological_entity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_observation_unique_idx
  ON record_provenance (source_record_id, observation_id)
  WHERE observation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_media_unique_idx
  ON record_provenance (source_record_id, media_id)
  WHERE media_id IS NOT NULL;

ALTER TABLE growing_guides
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE growing_guides
SET public_id = guide_key || '-v' || version::text
WHERE public_id IS NULL;

ALTER TABLE growing_guides
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS growing_guides_public_id_idx
  ON growing_guides (public_id);

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE sources
SET public_id = 'source-' || id::text
WHERE public_id IS NULL;

ALTER TABLE sources
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sources_public_id_idx
  ON sources (public_id);

ALTER TABLE cultural_relations
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE cultural_relations
SET public_id = 'cultural-relation-' || id::text
WHERE public_id IS NULL;

ALTER TABLE cultural_relations
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cultural_relations_public_id_idx
  ON cultural_relations (public_id);

CREATE INDEX IF NOT EXISTS cultural_relations_taxon_public_idx
  ON cultural_relations (taxon_id, access_level, review_status);

CREATE INDEX IF NOT EXISTS cultural_relations_entity_public_idx
  ON cultural_relations (biological_entity_id, access_level, review_status);

CREATE INDEX IF NOT EXISTS external_identifiers_identifier_idx
  ON external_identifiers (namespace, identifier);
