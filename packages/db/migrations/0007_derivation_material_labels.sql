ALTER TABLE derivation_event_materials
  DROP CONSTRAINT derivation_event_materials_check;

ALTER TABLE derivation_event_materials
  ADD CONSTRAINT derivation_event_materials_check
  CHECK (num_nonnulls(biological_entity_id, specimen_id, culture_id) = 1);
