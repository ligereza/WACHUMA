-- External identifiers are first-class derived records. This lets an editor
-- review a Wikidata/GBIF/iNaturalist link without silently treating the link
-- as an accepted taxonomic assertion.
ALTER TABLE record_provenance
  ADD COLUMN IF NOT EXISTS external_identifier_id uuid
  REFERENCES external_identifiers(id) ON DELETE CASCADE;

ALTER TABLE record_provenance
  DROP CONSTRAINT IF EXISTS record_provenance_check;

ALTER TABLE record_provenance
  ADD CONSTRAINT record_provenance_check CHECK (num_nonnulls(
    taxon_id, biological_entity_id, specimen_id, culture_id, observation_id,
    place_id, media_id, community_id, cultural_relation_id,
    growing_guide_id, cultivation_event_id, lineage_relationship_id,
    external_identifier_id
  ) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_external_identifier_unique_idx
  ON record_provenance (source_record_id, external_identifier_id)
  WHERE external_identifier_id IS NOT NULL;
