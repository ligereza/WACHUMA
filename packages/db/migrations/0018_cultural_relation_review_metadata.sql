ALTER TABLE cultural_relations
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS cultural_relations_reviewed_idx
  ON cultural_relations (review_status, reviewed_at DESC);
