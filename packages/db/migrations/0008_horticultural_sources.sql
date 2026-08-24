-- Source classification for institutional and authored cultivation guidance.
-- Keeping this distinct from scientific publications avoids overstating the
-- evidence level of a horticultural manual while retaining its provenance.

ALTER TYPE assertion_type
  ADD VALUE IF NOT EXISTS 'horticultural_guidance';

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_source_type_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_source_type_check CHECK (source_type IN (
    'scientific_publication',
    'historical_account',
    'archaeological_evidence',
    'community_knowledge',
    'external_dataset',
    'horticultural_guide',
    'editorial'
  ));
