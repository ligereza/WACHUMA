ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE agents
SET public_id = 'agent-' || id::text
WHERE public_id IS NULL;

ALTER TABLE agents
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agents_public_id_idx
  ON agents (public_id);

ALTER TABLE cultures
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE cultures
SET public_id = 'culture-' || id::text
WHERE public_id IS NULL;

ALTER TABLE cultures
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cultures_public_id_idx
  ON cultures (public_id);

ALTER TABLE historical_periods
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE historical_periods
SET public_id = 'period-' || id::text
WHERE public_id IS NULL;

ALTER TABLE historical_periods
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS historical_periods_public_id_idx
  ON historical_periods (public_id);

CREATE INDEX IF NOT EXISTS cultural_relations_culture_public_idx
  ON cultural_relations (culture_id, access_level, review_status);

CREATE INDEX IF NOT EXISTS cultural_relations_period_public_idx
  ON cultural_relations (historical_period_id, access_level, review_status);

CREATE INDEX IF NOT EXISTS cultural_relations_documenter_idx
  ON cultural_relations (documented_by_agent_id);
