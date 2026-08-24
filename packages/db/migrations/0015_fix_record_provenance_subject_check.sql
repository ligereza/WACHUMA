-- `source_id` is provenance metadata, not the documented subject. The original
-- check incorrectly counted it as a second entity and blocked source-linked
-- specimens, observations and other records.
ALTER TABLE record_provenance
  DROP CONSTRAINT IF EXISTS record_provenance_check;

ALTER TABLE record_provenance
  ADD CONSTRAINT record_provenance_check CHECK (num_nonnulls(
    taxon_id, biological_entity_id, specimen_id, culture_id, observation_id,
    place_id, media_id, community_id, cultural_relation_id,
    growing_guide_id, cultivation_event_id
  ) = 1);
