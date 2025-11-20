-- Add slug field to companies for subdomain routing
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Add index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- Add function to generate slug from company name
CREATE OR REPLACE FUNCTION generate_company_slug(company_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert name to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'company';
  END IF;
  
  final_slug := base_slug;
  
  -- Check if slug exists and add counter if needed
  WHILE EXISTS (SELECT 1 FROM companies WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing companies with slugs
UPDATE companies 
SET slug = generate_company_slug(name)
WHERE slug IS NULL;

-- Make slug required for new companies
ALTER TABLE companies ALTER COLUMN slug SET NOT NULL;