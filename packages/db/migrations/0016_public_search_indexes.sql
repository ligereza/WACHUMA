-- Public search is a projection over canonical tables. These indexes keep
-- substring lookup viable as the reviewed corpus grows without duplicating
-- knowledge into a second search database.
CREATE INDEX IF NOT EXISTS growing_guides_title_trgm_idx
  ON growing_guides USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS growing_guides_summary_trgm_idx
  ON growing_guides USING gin (summary gin_trgm_ops);

CREATE INDEX IF NOT EXISTS growing_guide_claims_statement_trgm_idx
  ON growing_guide_claims USING gin (statement gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_title_trgm_idx
  ON sources USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_citation_trgm_idx
  ON sources USING gin (citation gin_trgm_ops);

CREATE INDEX IF NOT EXISTS cultural_relations_value_text_trgm_idx
  ON cultural_relations USING gin (value_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS cultural_relations_description_trgm_idx
  ON cultural_relations USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS places_name_trgm_idx
  ON places USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS places_description_trgm_idx
  ON places USING gin (description gin_trgm_ops);
