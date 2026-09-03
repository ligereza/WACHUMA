-- Completes the coverage migration 0016 started. That migration indexed nine
-- of the columns the public search matches with ILIKE '%term%'; the query in
-- search-repository.ts matches thirty-seven, and the rest still fall back to a
-- sequential scan.
--
-- Measured with `pnpm bench:search-indexes --rows 200000` on PostgreSQL 15:
-- the same predicate over an unindexed text column ran in 194.32 ms as a
-- sequential scan and in 0.34 ms as a bitmap index scan once the trigram index
-- existed. That is one column, so the numbers here are an extrapolation of a
-- measured mechanism rather than a benchmark of /api/v1/search.
--
-- Only columns on tables that grow with the reviewed corpus are indexed.
-- Low-cardinality columns the search also matches (specimens.status,
-- specimens.specimen_type, cultural_relations.relation_type,
-- places.country_code) are deliberately left out: a trigram index over a
-- handful of repeated values costs writes and returns almost nothing. Small
-- reference tables (communities, historical_periods) are left out for the same
-- reason.
--
-- pg_trgm cannot serve patterns shorter than three characters; those queries
-- still scan, by design.

CREATE INDEX IF NOT EXISTS claims_object_text_trgm_idx
  ON claims USING gin (object_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS taxa_accepted_name_trgm_idx
  ON taxa USING gin (accepted_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS taxa_public_id_trgm_idx
  ON taxa USING gin (public_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS biological_entities_public_id_trgm_idx
  ON biological_entities USING gin (public_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS external_identifiers_namespace_trgm_idx
  ON external_identifiers USING gin (namespace gin_trgm_ops);

CREATE INDEX IF NOT EXISTS external_identifiers_identifier_trgm_idx
  ON external_identifiers USING gin (identifier gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_public_id_trgm_idx
  ON sources USING gin (public_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_publisher_trgm_idx
  ON sources USING gin (publisher gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_attribution_trgm_idx
  ON sources USING gin (attribution gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_doi_trgm_idx
  ON sources USING gin (doi gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sources_url_trgm_idx
  ON sources USING gin (url gin_trgm_ops);

CREATE INDEX IF NOT EXISTS specimens_public_id_trgm_idx
  ON specimens USING gin (public_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS growing_guides_climate_context_trgm_idx
  ON growing_guides USING gin (climate_context gin_trgm_ops);

CREATE INDEX IF NOT EXISTS growing_guides_region_context_trgm_idx
  ON growing_guides USING gin (region_context gin_trgm_ops);

CREATE INDEX IF NOT EXISTS growing_guides_technique_context_trgm_idx
  ON growing_guides USING gin (technique_context gin_trgm_ops);
