-- Growing guides declare the editorial coverage of every cultivation section.
-- This keeps an omitted section distinguishable from a researched negative or
-- an unpublished claim without inventing horticultural content.
ALTER TABLE growing_guides
  ADD COLUMN IF NOT EXISTS coverage jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE growing_guides
SET coverage = '[]'::jsonb
WHERE coverage IS NULL;
