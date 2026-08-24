-- Lineage edges are first-class records and need the same provenance boundary
-- as specimens, observations and cultural relations. Existing seed edges are
-- backfilled by the idempotent seed; new garden edges are created through the
-- protected intake flow.
ALTER TABLE record_provenance
  ADD COLUMN IF NOT EXISTS lineage_relationship_id uuid
  REFERENCES lineage_relationships(id);

ALTER TABLE record_provenance
  DROP CONSTRAINT IF EXISTS record_provenance_check;

ALTER TABLE record_provenance
  ADD CONSTRAINT record_provenance_check CHECK (num_nonnulls(
    taxon_id, biological_entity_id, specimen_id, culture_id, observation_id,
    place_id, media_id, community_id, cultural_relation_id,
    growing_guide_id, cultivation_event_id, lineage_relationship_id
  ) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_lineage_unique_idx
  ON record_provenance (source_record_id, lineage_relationship_id)
  WHERE lineage_relationship_id IS NOT NULL;
