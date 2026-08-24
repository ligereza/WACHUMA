ALTER TABLE source_record_reviews
  ADD COLUMN IF NOT EXISTS taxonomy_confirmed boolean NOT NULL DEFAULT false;
