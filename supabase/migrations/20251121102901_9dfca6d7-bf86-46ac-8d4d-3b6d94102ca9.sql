
-- Add company_id to media_photos table for multi-tenant isolation
ALTER TABLE media_photos 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_media_photos_company_id ON media_photos(company_id);

-- Enable RLS on media_photos
ALTER TABLE media_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view photos from their company's assets
CREATE POLICY "Users can view their company photos"
ON media_photos
FOR SELECT
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
  OR campaign_id IN (
    SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
  )
);

-- RLS Policy: Users can insert photos for their company's assets
CREATE POLICY "Users can upload photos for their company"
ON media_photos
FOR INSERT
WITH CHECK (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
);

-- RLS Policy: Users can update their company photos
CREATE POLICY "Users can update their company photos"
ON media_photos
FOR UPDATE
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
);

-- RLS Policy: Admins can delete their company photos
CREATE POLICY "Admins can delete their company photos"
ON media_photos
FOR DELETE
USING (
  (company_id = get_current_user_company_id() AND has_role(auth.uid(), 'admin'::app_role))
  OR is_platform_admin(auth.uid())
);

-- Update existing records to set company_id from asset's company
UPDATE media_photos mp
SET company_id = ma.company_id
FROM media_assets ma
WHERE mp.asset_id = ma.id
AND mp.company_id IS NULL;

-- Make company_id NOT NULL after migration
ALTER TABLE media_photos 
ALTER COLUMN company_id SET NOT NULL;
