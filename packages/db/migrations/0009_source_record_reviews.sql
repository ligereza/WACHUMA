ALTER TABLE source_records
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS source_record_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  reviewer text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('accepted', 'rejected')),
  note text NOT NULL,
  license_confirmed boolean NOT NULL DEFAULT false,
  attribution_confirmed boolean NOT NULL DEFAULT false,
  privacy_confirmed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_record_reviews_record_idx
  ON source_record_reviews (source_record_id, reviewed_at DESC);
