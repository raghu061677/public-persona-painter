-- SECTION 1: Add soft delete and audit fields to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS is_historical_entry BOOLEAN DEFAULT false;

-- Create index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_is_deleted ON campaigns(is_deleted) WHERE is_deleted = false;

-- SECTION 2: Add invoice period tracking to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS campaign_id TEXT REFERENCES campaigns(id),
ADD COLUMN IF NOT EXISTS invoice_period_start DATE,
ADD COLUMN IF NOT EXISTS invoice_period_end DATE,
ADD COLUMN IF NOT EXISTS is_monthly_split BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_invoice_id TEXT;

-- Create index for campaign invoices
CREATE INDEX IF NOT EXISTS idx_invoices_campaign_id ON invoices(campaign_id);

-- SECTION 3: Create campaign deletion audit log
CREATE TABLE IF NOT EXISTS campaign_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  client_name TEXT,
  deleted_by UUID NOT NULL,
  deletion_reason TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  campaign_data JSONB,
  assets_released INTEGER DEFAULT 0
);

-- Enable RLS on campaign_deletions
ALTER TABLE campaign_deletions ENABLE ROW LEVEL SECURITY;

-- RLS policy for campaign_deletions
CREATE POLICY "Admins can view campaign deletions"
ON campaign_deletions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert campaign deletions"
ON campaign_deletions
FOR INSERT
WITH CHECK (true);

-- SECTION 4: Update conflict check function to exclude deleted campaigns
CREATE OR REPLACE FUNCTION public.check_asset_conflict(
  p_asset_id text, 
  p_start_date date, 
  p_end_date date, 
  p_exclude_campaign_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_conflict', EXISTS (
      SELECT 1 
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND COALESCE(c.is_deleted, false) = false
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ),
    'conflicting_campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.campaign_name,
        'client_name', c.client_name,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'status', c.status
      ))
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND COALESCE(c.is_deleted, false) = false
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ), '[]'::jsonb)
  ) INTO v_conflict;
  
  RETURN v_conflict;
END;
$function$;

-- SECTION 5: Create soft delete campaign function
CREATE OR REPLACE FUNCTION public.soft_delete_campaign(
  p_campaign_id TEXT,
  p_deletion_reason TEXT,
  p_deleted_by UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign RECORD;
  v_has_invoices BOOLEAN;
  v_has_payments BOOLEAN;
  v_assets_count INTEGER;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  IF v_campaign.is_deleted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign already deleted');
  END IF;
  
  -- Check for invoices
  SELECT EXISTS(
    SELECT 1 FROM invoices 
    WHERE campaign_id = p_campaign_id 
    AND status NOT IN ('Cancelled', 'Draft')
  ) INTO v_has_invoices;
  
  IF v_has_invoices THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete campaign with issued invoices');
  END IF;
  
  -- Check for payments
  SELECT EXISTS(
    SELECT 1 FROM invoices 
    WHERE campaign_id = p_campaign_id 
    AND balance_due < total_amount
  ) INTO v_has_payments;
  
  IF v_has_payments THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete campaign with recorded payments');
  END IF;
  
  -- Get assets count
  SELECT COUNT(*) INTO v_assets_count FROM campaign_assets WHERE campaign_id = p_campaign_id;
  
  -- Log deletion
  INSERT INTO campaign_deletions (
    campaign_id, campaign_name, client_name, deleted_by, deletion_reason, 
    campaign_data, assets_released
  ) VALUES (
    p_campaign_id, v_campaign.campaign_name, v_campaign.client_name, 
    p_deleted_by, p_deletion_reason,
    to_jsonb(v_campaign), v_assets_count
  );
  
  -- Soft delete the campaign
  UPDATE campaigns SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = p_deleted_by,
    deletion_reason = p_deletion_reason
  WHERE id = p_campaign_id;
  
  -- Release asset bookings
  DELETE FROM asset_bookings WHERE campaign_id = p_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Campaign deleted successfully',
    'assets_released', v_assets_count
  );
END;
$function$;

-- SECTION 6: Create function to generate monthly invoices from campaign
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(
  p_campaign_id TEXT,
  p_created_by UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign RECORD;
  v_month_start DATE;
  v_month_end DATE;
  v_invoice_id TEXT;
  v_total_months INTEGER;
  v_monthly_amount NUMERIC;
  v_monthly_gst NUMERIC;
  v_invoices_created INTEGER := 0;
  v_company_id UUID;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND COALESCE(is_deleted, false) = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  v_company_id := v_campaign.company_id;
  
  -- Calculate number of months
  v_total_months := EXTRACT(MONTH FROM AGE(v_campaign.end_date, v_campaign.start_date)) + 1;
  IF v_total_months < 1 THEN v_total_months := 1; END IF;
  
  -- Calculate monthly amounts
  v_monthly_amount := v_campaign.total_amount / v_total_months;
  v_monthly_gst := v_campaign.gst_amount / v_total_months;
  
  -- Generate invoice for each month
  v_month_start := v_campaign.start_date;
  
  WHILE v_month_start <= v_campaign.end_date LOOP
    v_month_end := LEAST(
      (DATE_TRUNC('MONTH', v_month_start) + INTERVAL '1 month - 1 day')::DATE,
      v_campaign.end_date
    );
    
    -- Generate invoice ID
    SELECT generate_invoice_id() INTO v_invoice_id;
    
    -- Create invoice
    INSERT INTO invoices (
      id, campaign_id, client_id, client_name, 
      invoice_date, due_date, status,
      sub_total, gst_percent, gst_amount, total_amount, balance_due,
      invoice_period_start, invoice_period_end, is_monthly_split,
      created_by, company_id,
      items
    ) VALUES (
      v_invoice_id, p_campaign_id, v_campaign.client_id, v_campaign.client_name,
      v_month_start, v_month_start + INTERVAL '30 days',
      'Pending',
      v_monthly_amount, v_campaign.gst_percent, v_monthly_gst, 
      v_monthly_amount + v_monthly_gst, v_monthly_amount + v_monthly_gst,
      v_month_start, v_month_end, true,
      p_created_by, v_company_id,
      jsonb_build_array(jsonb_build_object(
        'description', 'Campaign: ' || v_campaign.campaign_name || ' (' || TO_CHAR(v_month_start, 'Mon YYYY') || ')',
        'quantity', 1,
        'rate', v_monthly_amount,
        'amount', v_monthly_amount
      ))
    );
    
    v_invoices_created := v_invoices_created + 1;
    v_month_start := (DATE_TRUNC('MONTH', v_month_start) + INTERVAL '1 month')::DATE;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoices_created', v_invoices_created,
    'monthly_amount', v_monthly_amount,
    'monthly_gst', v_monthly_gst
  );
END;
$function$;

-- SECTION 7: Create asset revenue view
CREATE OR REPLACE VIEW asset_revenue_summary AS
SELECT 
  ma.id as asset_id,
  ma.media_asset_code,
  ma.location,
  ma.city,
  ma.area,
  ma.media_type,
  ma.company_id,
  COALESCE(SUM(ca.negotiated_rate + COALESCE(ca.printing_charges, 0) + COALESCE(ca.mounting_charges, 0)), 0) as total_revenue,
  COALESCE(SUM(CASE 
    WHEN c.start_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '3 months') 
    THEN ca.negotiated_rate + COALESCE(ca.printing_charges, 0) + COALESCE(ca.mounting_charges, 0)
    ELSE 0 
  END), 0) as fy_revenue,
  COUNT(DISTINCT ca.campaign_id) as total_campaigns,
  COUNT(DISTINCT CASE 
    WHEN c.start_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '3 months') 
    THEN ca.campaign_id 
  END) as fy_campaigns
FROM media_assets ma
LEFT JOIN campaign_assets ca ON ma.id = ca.asset_id
LEFT JOIN campaigns c ON ca.campaign_id = c.id AND COALESCE(c.is_deleted, false) = false
GROUP BY ma.id, ma.media_asset_code, ma.location, ma.city, ma.area, ma.media_type, ma.company_id;

-- Grant access to the view
GRANT SELECT ON asset_revenue_summary TO authenticated;

-- SECTION 8: Create asset expense summary view
CREATE OR REPLACE VIEW asset_expense_summary AS
SELECT 
  ae.asset_id,
  ma.media_asset_code,
  ma.location,
  ma.city,
  ma.area,
  ma.company_id,
  COALESCE(SUM(ae.amount), 0) as total_expenses,
  COALESCE(SUM(CASE 
    WHEN ae.expense_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '3 months') 
    THEN ae.amount 
    ELSE 0 
  END), 0) as fy_expenses,
  COUNT(*) as total_expense_records,
  jsonb_object_agg(ae.category, COALESCE(ae.amount, 0)) FILTER (WHERE ae.category IS NOT NULL) as expenses_by_category
FROM asset_expenses ae
JOIN media_assets ma ON ae.asset_id = ma.id
GROUP BY ae.asset_id, ma.media_asset_code, ma.location, ma.city, ma.area, ma.company_id;

-- Grant access to the view
GRANT SELECT ON asset_expense_summary TO authenticated;

-- SECTION 9: Create combined asset profitability view
CREATE OR REPLACE VIEW asset_profitability AS
SELECT 
  r.asset_id,
  r.media_asset_code,
  r.location,
  r.city,
  r.area,
  r.media_type,
  r.company_id,
  r.total_revenue,
  r.fy_revenue,
  r.total_campaigns,
  r.fy_campaigns,
  COALESCE(e.total_expenses, 0) as total_expenses,
  COALESCE(e.fy_expenses, 0) as fy_expenses,
  r.total_revenue - COALESCE(e.total_expenses, 0) as net_profit,
  r.fy_revenue - COALESCE(e.fy_expenses, 0) as fy_net_profit,
  CASE WHEN r.total_revenue > 0 
    THEN ((r.total_revenue - COALESCE(e.total_expenses, 0)) / r.total_revenue * 100)
    ELSE 0 
  END as profit_margin_percent
FROM asset_revenue_summary r
LEFT JOIN asset_expense_summary e ON r.asset_id = e.asset_id;

-- Grant access to the view
GRANT SELECT ON asset_profitability TO authenticated;