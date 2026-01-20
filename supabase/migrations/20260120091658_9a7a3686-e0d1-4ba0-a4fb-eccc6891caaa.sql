-- Add RLS policy to allow public read access to companies for marketplace
-- This enables anon users to see company names on public asset listings

CREATE POLICY "Public can view companies with public assets"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM media_assets 
    WHERE media_assets.company_id = companies.id 
    AND media_assets.is_public = true
  )
);