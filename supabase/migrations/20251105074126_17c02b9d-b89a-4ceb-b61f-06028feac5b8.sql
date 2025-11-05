-- ============================================
-- Fix PUBLIC_DATA_EXPOSURE: Campaign Data
-- ============================================
-- Drop existing overly permissive policies that allow any authenticated user to view all campaigns

DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaign assets" ON public.campaign_assets;

-- ============================================
-- Create role-based access policies for campaigns
-- ============================================

-- Admin and sales can view all campaigns
CREATE POLICY "Admin and sales can view all campaigns"
ON public.campaigns FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'sales'::app_role)
);

-- Operations staff can view campaigns assigned to them
CREATE POLICY "Operations can view assigned campaigns"
ON public.campaigns FOR SELECT
USING (
  has_role(auth.uid(), 'operations'::app_role) AND 
  assigned_to = auth.uid()
);

-- Finance can view all campaigns for invoicing purposes
CREATE POLICY "Finance can view campaigns for invoicing"
ON public.campaigns FOR SELECT
USING (has_role(auth.uid(), 'finance'::app_role));

-- Campaign creators can view their own campaigns
CREATE POLICY "Users can view campaigns they created"
ON public.campaigns FOR SELECT
USING (created_by = auth.uid());

-- ============================================
-- Create role-based access policies for campaign_assets
-- ============================================

-- Admin and sales can view all campaign assets
CREATE POLICY "Admin and sales can view all campaign assets"
ON public.campaign_assets FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'sales'::app_role)
);

-- Operations can view assets from campaigns assigned to them
CREATE POLICY "Operations can view assigned campaign assets"
ON public.campaign_assets FOR SELECT
USING (
  has_role(auth.uid(), 'operations'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND campaigns.assigned_to = auth.uid()
  )
);

-- Finance can view all campaign assets for invoicing
CREATE POLICY "Finance can view campaign assets"
ON public.campaign_assets FOR SELECT
USING (has_role(auth.uid(), 'finance'::app_role));

-- Users can view campaign assets from campaigns they created
CREATE POLICY "Users can view campaign assets they created"
ON public.campaign_assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND campaigns.created_by = auth.uid()
  )
);