
-- Fix Campaign RLS: Sales users can only update their own campaigns
-- Admin can update all company campaigns

-- Drop existing overly permissive update policy
DROP POLICY IF EXISTS "Users can update campaigns" ON campaigns;

-- Recreate with ownership check for non-admin roles
CREATE POLICY "campaigns_update_authorized" ON campaigns
FOR UPDATE
USING (
  is_platform_admin(auth.uid())
  OR (
    company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR created_by = auth.uid()
      OR owner_id = auth.uid()
      OR auth.uid() = ANY(secondary_owner_ids)
    )
  )
)
WITH CHECK (
  is_platform_admin(auth.uid())
  OR (
    company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR created_by = auth.uid()
      OR owner_id = auth.uid()
      OR auth.uid() = ANY(secondary_owner_ids)
    )
  )
);

-- Drop existing overly permissive delete policy  
DROP POLICY IF EXISTS "Users can delete campaigns" ON campaigns;

-- Recreate with ownership check
CREATE POLICY "campaigns_delete_authorized" ON campaigns
FOR DELETE
USING (
  is_platform_admin(auth.uid())
  OR (
    company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR created_by = auth.uid()
      OR owner_id = auth.uid()
    )
  )
);

-- Fix campaign_assets: restrict updates to campaign owners
-- First check what policies exist
DROP POLICY IF EXISTS "campaign_assets_update_authorized" ON campaign_assets;
CREATE POLICY "campaign_assets_update_authorized" ON campaign_assets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_assets.campaign_id
    AND (
      is_platform_admin(auth.uid())
      OR (
        c.company_id = current_company_id()
        AND (
          has_company_role(ARRAY['admin'::app_role])
          OR c.created_by = auth.uid()
          OR c.owner_id = auth.uid()
          OR auth.uid() = ANY(c.secondary_owner_ids)
        )
      )
    )
  )
);

-- Restrict campaign_assets insert to campaign owners
DROP POLICY IF EXISTS "campaign_assets_insert_authorized" ON campaign_assets;
CREATE POLICY "campaign_assets_insert_authorized" ON campaign_assets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_assets.campaign_id
    AND (
      is_platform_admin(auth.uid())
      OR (
        c.company_id = current_company_id()
        AND (
          has_company_role(ARRAY['admin'::app_role])
          OR c.created_by = auth.uid()
          OR c.owner_id = auth.uid()
          OR auth.uid() = ANY(c.secondary_owner_ids)
        )
      )
    )
  )
);

-- Restrict campaign_assets delete to campaign owners
DROP POLICY IF EXISTS "campaign_assets_delete_authorized" ON campaign_assets;
CREATE POLICY "campaign_assets_delete_authorized" ON campaign_assets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_assets.campaign_id
    AND (
      is_platform_admin(auth.uid())
      OR (
        c.company_id = current_company_id()
        AND (
          has_company_role(ARRAY['admin'::app_role])
          OR c.created_by = auth.uid()
          OR c.owner_id = auth.uid()
          OR auth.uid() = ANY(c.secondary_owner_ids)
        )
      )
    )
  )
);
