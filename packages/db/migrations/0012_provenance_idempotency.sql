-- Keep source-to-cultural-relation provenance idempotent during repeated seeds
-- and snapshot rebuilds.
CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_cultural_relation_unique_idx
  ON record_provenance (source_record_id, cultural_relation_id)
  WHERE cultural_relation_id IS NOT NULL;
