-- A source record can substantiate a growing guide only once. The cleanup is
-- scoped to duplicate source-record/guide links created before this invariant.
DELETE FROM record_provenance AS duplicate
WHERE duplicate.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY source_record_id, growing_guide_id
        ORDER BY created_at ASC, id ASC
      ) AS duplicate_rank
    FROM record_provenance
    WHERE growing_guide_id IS NOT NULL
  ) AS ranked
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS record_provenance_growing_guide_unique_idx
  ON record_provenance (source_record_id, growing_guide_id)
  WHERE growing_guide_id IS NOT NULL;
