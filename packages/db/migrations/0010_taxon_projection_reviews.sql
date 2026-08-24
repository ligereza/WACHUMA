ALTER TABLE source_record_reviews
  ADD COLUMN IF NOT EXISTS review_kind text NOT NULL DEFAULT 'publication',
  ADD COLUMN IF NOT EXISTS taxonomy_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE source_record_reviews
  DROP CONSTRAINT IF EXISTS source_record_reviews_review_kind_check;

ALTER TABLE source_record_reviews
  ADD CONSTRAINT source_record_reviews_review_kind_check
  CHECK (review_kind IN ('publication', 'taxonomic_promotion'));

CREATE INDEX IF NOT EXISTS source_record_reviews_kind_idx
  ON source_record_reviews (source_record_id, review_kind, reviewed_at DESC);
