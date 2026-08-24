-- Garden intake is idempotent per source record and specimen.
-- The source record remains immutable; a later publication review only changes
-- the projection visibility of the linked specimen.
CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_specimen_unique_idx
  ON record_provenance (source_record_id, specimen_id)
  WHERE specimen_id IS NOT NULL;
