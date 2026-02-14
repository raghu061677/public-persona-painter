CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_campaign_id TEXT, p_created_by UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_gst_rate NUMERIC;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND COALESCE(is_deleted, false) = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  v_company_id := v_campaign.company_id;
  v_gst_rate := COALESCE(v_campaign.gst_percent, 0);
  
  v_total_months := EXTRACT(MONTH FROM AGE(v_campaign.end_date, v_campaign.start_date)) + 1;
  IF v_total_months < 1 THEN v_total_months := 1; END IF;
  
  v_monthly_amount := v_campaign.total_amount / v_total_months;
  v_monthly_gst := COALESCE(v_campaign.gst_amount, 0) / v_total_months;
  
  v_month_start := v_campaign.start_date;
  
  WHILE v_month_start <= v_campaign.end_date LOOP
    v_month_end := LEAST(
      (DATE_TRUNC('MONTH', v_month_start) + INTERVAL '1 month - 1 day')::DATE,
      v_campaign.end_date
    );
    
    -- Call with explicit gst_rate parameter to avoid ambiguity
    SELECT generate_invoice_id(v_gst_rate) INTO v_invoice_id;
    
    INSERT INTO invoices (
      id, invoice_no, campaign_id, client_id, client_name, 
      invoice_date, due_date, status,
      sub_total, gst_percent, gst_amount, total_amount, balance_due,
      invoice_period_start, invoice_period_end, is_monthly_split,
      created_by, company_id,
      invoice_series_prefix,
      items
    ) VALUES (
      v_invoice_id, v_invoice_id, p_campaign_id, v_campaign.client_id, v_campaign.client_name,
      v_month_start, v_month_start + INTERVAL '30 days',
      'Pending',
      v_monthly_amount, v_gst_rate, v_monthly_gst, 
      v_monthly_amount + v_monthly_gst, v_monthly_amount + v_monthly_gst,
      v_month_start, v_month_end, true,
      p_created_by, v_company_id,
      CASE WHEN v_gst_rate = 0 THEN 'INV-Z' ELSE 'INV' END,
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
$$;