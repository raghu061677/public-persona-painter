-- Add INSERT policy for campaign_status_history
CREATE POLICY "Company users can insert campaign status history"
ON public.campaign_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND c.company_id = get_current_user_company_id()
  )
  OR is_platform_admin(auth.uid())
);

-- Add UPDATE policy for campaign_status_history  
CREATE POLICY "Company users can update campaign status history"
ON public.campaign_status_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND c.company_id = get_current_user_company_id()
  )
  OR is_platform_admin(auth.uid())
);

-- Add DELETE policy for campaign_status_history (admin only)
CREATE POLICY "Admins can delete campaign status history"
ON public.campaign_status_history
FOR DELETE
USING (is_platform_admin(auth.uid()));