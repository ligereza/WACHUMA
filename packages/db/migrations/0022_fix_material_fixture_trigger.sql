CREATE OR REPLACE FUNCTION validate_material_fixture_chemistry_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  binding_layer material_fixture_binding_layer;
  binding_key uuid;
BEGIN
  IF TG_TABLE_NAME = 'material_fixture_bindings' THEN
    binding_key := NEW.id;
  ELSE
    binding_key := NEW.binding_id;
  END IF;

  SELECT layer
  INTO binding_layer
  FROM material_fixture_bindings
  WHERE id = binding_key;

  IF binding_layer = 'chemistry' THEN
    IF NOT EXISTS (
      SELECT 1 FROM material_fixture_binding_claims WHERE binding_id = binding_key
    ) OR NOT EXISTS (
      SELECT 1 FROM material_fixture_binding_sources WHERE binding_id = binding_key
    ) THEN
      RAISE EXCEPTION 'Chemical material bindings require at least one claim and source';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
