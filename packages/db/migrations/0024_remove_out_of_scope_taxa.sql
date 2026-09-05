-- Remove records that were imported before the monographic scope was adopted.
-- This is deliberately a deletion migration: Opuntia ficus-indica and
-- Pleurotus ostreatus are out of scope, not restricted records. The migration
-- is transactional, targets only their accepted names/public IDs, preserves
-- shared bibliographic sources, and leaves no orphaned source records when a
-- source record has no remaining provenance or review references.
--
-- Recovery: restore the database from a backup taken before this migration.
-- The deleted payloads are not re-created by seed; source-record exports should
-- be archived before applying the release to a database that contains them.

DO $$
DECLARE
  retired_taxa uuid[];
  retired_entities uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}')
  INTO retired_taxa
  FROM taxa
  WHERE lower(scientific_name) IN ('opuntia ficus-indica', 'pleurotus ostreatus')
     OR public_id IN (
       'taxon-opuntia-ficus-indica',
       'taxon-pleurotus-ostreatus'
     );

  SELECT COALESCE(array_agg(id), '{}')
  INTO retired_entities
  FROM biological_entities
  WHERE lower(display_name) IN ('opuntia ficus-indica', 'pleurotus ostreatus')
     OR public_id IN (
       'biological-entity-opuntia-ficus-indica',
       'biological-entity-pleurotus-ostreatus'
     )
     OR taxon_id = ANY(retired_taxa);

  IF cardinality(retired_taxa) = 0 AND cardinality(retired_entities) = 0 THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE retired_specimens ON COMMIT DROP AS
    SELECT id FROM specimens WHERE biological_entity_id = ANY(retired_entities);
  CREATE TEMP TABLE retired_cultures ON COMMIT DROP AS
    SELECT id FROM cultures WHERE specimen_id IN (SELECT id FROM retired_specimens);
  CREATE TEMP TABLE retired_observations ON COMMIT DROP AS
    SELECT id FROM observations
    WHERE taxon_id = ANY(retired_taxa)
       OR biological_entity_id = ANY(retired_entities)
       OR specimen_id IN (SELECT id FROM retired_specimens);
  CREATE TEMP TABLE retired_relations ON COMMIT DROP AS
    SELECT id FROM cultural_relations
    WHERE taxon_id = ANY(retired_taxa)
       OR biological_entity_id = ANY(retired_entities)
       OR culture_id IN (SELECT id FROM retired_cultures);
  CREATE TEMP TABLE retired_guides ON COMMIT DROP AS
    SELECT id FROM growing_guides
    WHERE taxon_id = ANY(retired_taxa)
       OR biological_entity_id = ANY(retired_entities);
  CREATE TEMP TABLE retired_media ON COMMIT DROP AS
    SELECT DISTINCT media_id FROM media_attachments
    WHERE taxon_id = ANY(retired_taxa)
       OR biological_entity_id = ANY(retired_entities)
       OR specimen_id IN (SELECT id FROM retired_specimens)
       OR observation_id IN (SELECT id FROM retired_observations)
       OR growing_guide_id IN (SELECT id FROM retired_guides)
       OR cultural_relation_id IN (SELECT id FROM retired_relations);
  CREATE TEMP TABLE retired_fixtures ON COMMIT DROP AS
    SELECT id FROM material_fixtures
    WHERE biological_entity_id = ANY(retired_entities)
       OR specimen_id IN (SELECT id FROM retired_specimens);
  CREATE TEMP TABLE retired_lineages ON COMMIT DROP AS
    SELECT id FROM lineage_relationships
    WHERE parent_entity_id = ANY(retired_entities)
       OR child_entity_id = ANY(retired_entities)
       OR parent_specimen_id IN (SELECT id FROM retired_specimens)
       OR child_specimen_id IN (SELECT id FROM retired_specimens);
  CREATE TEMP TABLE retired_source_records ON COMMIT DROP AS
    SELECT DISTINCT source_record_id AS id FROM record_provenance
    WHERE taxon_id = ANY(retired_taxa)
       OR biological_entity_id = ANY(retired_entities)
       OR specimen_id IN (SELECT id FROM retired_specimens)
       OR culture_id IN (SELECT id FROM retired_cultures)
       OR observation_id IN (SELECT id FROM retired_observations)
       OR cultural_relation_id IN (SELECT id FROM retired_relations)
       OR growing_guide_id IN (SELECT id FROM retired_guides)
    UNION
    SELECT id FROM source_records
    WHERE raw_payload::text ILIKE ANY (
      ARRAY['%Opuntia ficus-indica%', '%Pleurotus ostreatus%']
    );

  -- Material fixture bindings must go before their fixtures and claims.
  DELETE FROM material_fixture_binding_claims
  WHERE binding_id IN (
    SELECT id FROM material_fixture_bindings
    WHERE material_fixture_id IN (SELECT id FROM retired_fixtures)
  );
  DELETE FROM material_fixture_binding_sources
  WHERE binding_id IN (
    SELECT id FROM material_fixture_bindings
    WHERE material_fixture_id IN (SELECT id FROM retired_fixtures)
  );
  DELETE FROM material_fixture_bindings
  WHERE material_fixture_id IN (SELECT id FROM retired_fixtures);
  DELETE FROM material_fixtures
  WHERE id IN (SELECT id FROM retired_fixtures);

  DELETE FROM claim_sources
  WHERE claim_id IN (
    SELECT id FROM claims
    WHERE source_record_id IN (SELECT id FROM retired_source_records)
       OR (subject_type = 'taxon' AND subject_id = ANY(retired_taxa))
       OR (subject_type = 'biological_entity' AND subject_id = ANY(retired_entities))
  )
  OR source_record_id IN (SELECT id FROM retired_source_records);
  UPDATE claims
  SET superseded_by = NULL
  WHERE superseded_by IN (
    SELECT id FROM claims
    WHERE source_record_id IN (SELECT id FROM retired_source_records)
       OR (subject_type = 'taxon' AND subject_id = ANY(retired_taxa))
       OR (subject_type = 'biological_entity' AND subject_id = ANY(retired_entities))
  );
  DELETE FROM claims
  WHERE source_record_id IN (SELECT id FROM retired_source_records)
     OR (subject_type = 'taxon' AND subject_id = ANY(retired_taxa))
     OR (subject_type = 'biological_entity' AND subject_id = ANY(retired_entities));

  DELETE FROM growing_guide_claims
  WHERE growing_guide_id IN (SELECT id FROM retired_guides);
  DELETE FROM growing_guides WHERE id IN (SELECT id FROM retired_guides);

  DELETE FROM media_attachments
  WHERE media_id IN (SELECT media_id FROM retired_media)
     OR taxon_id = ANY(retired_taxa)
     OR biological_entity_id = ANY(retired_entities)
     OR observation_id IN (SELECT id FROM retired_observations)
     OR growing_guide_id IN (SELECT id FROM retired_guides)
     OR cultural_relation_id IN (SELECT id FROM retired_relations);

  DELETE FROM trait_measurements
  WHERE taxon_id = ANY(retired_taxa)
     OR biological_entity_id = ANY(retired_entities)
     OR specimen_id IN (SELECT id FROM retired_specimens)
     OR observation_id IN (SELECT id FROM retired_observations);
  DELETE FROM external_identifiers
  WHERE taxon_id = ANY(retired_taxa)
     OR biological_entity_id = ANY(retired_entities)
     OR specimen_id IN (SELECT id FROM retired_specimens);

  DELETE FROM record_provenance
  WHERE source_record_id IN (SELECT id FROM retired_source_records)
     OR taxon_id = ANY(retired_taxa)
     OR biological_entity_id = ANY(retired_entities)
     OR specimen_id IN (SELECT id FROM retired_specimens)
     OR culture_id IN (SELECT id FROM retired_cultures)
     OR observation_id IN (SELECT id FROM retired_observations)
     OR cultural_relation_id IN (SELECT id FROM retired_relations)
     OR growing_guide_id IN (SELECT id FROM retired_guides);
  DELETE FROM record_provenance
  WHERE media_id IN (SELECT media_id FROM retired_media)
     OR lineage_relationship_id IN (SELECT id FROM retired_lineages);
  DELETE FROM media WHERE id IN (SELECT media_id FROM retired_media);

  DELETE FROM source_record_quality_flags
  WHERE source_record_id IN (SELECT id FROM retired_source_records);
  DELETE FROM source_record_reviews
  WHERE source_record_id IN (SELECT id FROM retired_source_records);
  DELETE FROM scene_asset_provenance
  WHERE source_record_id IN (SELECT id FROM retired_source_records);

  DELETE FROM observations WHERE id IN (SELECT id FROM retired_observations);
  DELETE FROM cultural_relations WHERE id IN (SELECT id FROM retired_relations);
  DELETE FROM cultivation_events
  WHERE specimen_id IN (SELECT id FROM retired_specimens);
  DELETE FROM specimen_locations
  WHERE specimen_id IN (SELECT id FROM retired_specimens);
  DELETE FROM derivation_event_materials
  WHERE biological_entity_id = ANY(retired_entities)
     OR specimen_id IN (SELECT id FROM retired_specimens)
     OR culture_id IN (SELECT id FROM retired_cultures);
  DELETE FROM procedural_recipe_sources
  WHERE procedural_recipe_id IN (
    SELECT id FROM procedural_recipes
    WHERE target_biological_entity_id = ANY(retired_entities)
       OR target_specimen_id IN (SELECT id FROM retired_specimens)
  );
  DELETE FROM procedural_recipes
  WHERE target_biological_entity_id = ANY(retired_entities)
     OR target_specimen_id IN (SELECT id FROM retired_specimens);
  DELETE FROM scene_objects
  WHERE biological_entity_id = ANY(retired_entities)
     OR specimen_id IN (SELECT id FROM retired_specimens);
  DELETE FROM lineage_relationships
  WHERE id IN (SELECT id FROM retired_lineages);
  DELETE FROM cultures WHERE id IN (SELECT id FROM retired_cultures);
  DELETE FROM specimens WHERE id IN (SELECT id FROM retired_specimens);

  -- Keep shared bibliographic sources. Remove only source records that no
  -- longer have any FK-backed review, claim, provenance or scene reference.
  DELETE FROM source_records sr
  WHERE sr.id IN (SELECT id FROM retired_source_records)
    AND NOT EXISTS (SELECT 1 FROM claims WHERE source_record_id = sr.id)
    AND NOT EXISTS (SELECT 1 FROM claim_sources WHERE source_record_id = sr.id)
    AND NOT EXISTS (SELECT 1 FROM record_provenance WHERE source_record_id = sr.id)
    AND NOT EXISTS (SELECT 1 FROM scene_asset_provenance WHERE source_record_id = sr.id);

  DELETE FROM biological_entities WHERE id = ANY(retired_entities);
  DELETE FROM taxa WHERE id = ANY(retired_taxa);
END;
$$;
