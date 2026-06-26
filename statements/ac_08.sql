DROP TRIGGER IF EXISTS update_training_module_pages_updated_at ON training_module_pages;
DROP FUNCTION IF EXISTS update_training_module_pages_updated_at();

CREATE OR REPLACE FUNCTION update_training_module_pages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION update_training_module_pages_updated_at() TO authenticated;

CREATE TRIGGER update_training_module_pages_updated_at
  BEFORE UPDATE ON training_module_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_training_module_pages_updated_at();