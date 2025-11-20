-- Create trigger to auto-generate slug on company insert
CREATE OR REPLACE FUNCTION auto_generate_company_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_company_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_company_slug ON companies;

-- Create trigger
CREATE TRIGGER trigger_auto_generate_company_slug
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_company_slug();

-- Make slug nullable again for insert (trigger will fill it)
ALTER TABLE companies ALTER COLUMN slug DROP NOT NULL;