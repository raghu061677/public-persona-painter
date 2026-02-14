
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(
  p_campaign_id text,
  p_company_id uuid,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_start date;
  v_end date;
  v_month_start date;
  v_month_end date;
  v_invoice_id text;
  v_invoices jsonb := '[]'::jsonb;
  v_total_months int := 0;
  v_gst_rate numeric;
  v_monthly_amount numeric;
  v_monthly_gst numeric;
  v_monthly_total numeric;
  v_days_in_month int;
  v_billable_days int;
  v_prorata_amount numeric;
  v_prorata_gst numeric;
  v_prorata_total numeric;
BEGIN
  -- Get campaign details
  SELECT c.*, cl.name as client_name, cl.gstin as client_gstin
  INTO v_campaign
  FROM campaigns c
  LEFT JOIN clients cl ON cl.id = c.client_id
  WHERE c.id = p_campaign_id AND c.company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  v_start := v_campaign.start_date;
  v_end := v_campaign.end_date;
  v_gst_rate := COALESCE(v_campaign.gst_rate, 18);
  v_monthly_amount := COALESCE(v_campaign.total_amount, 0);
  
  -- Calculate number of full months
  v_month_start := v_start;
  
  WHILE v_month_start <= v_end LOOP
    v_month_end := LEAST(
      (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day')::date,
      v_end
    );
    
    v_days_in_month := extract(day from (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day'))::int;
    v_billable_days := (v_month_end - v_month_start + 1)::int;
    
    -- Pro-rata calculation
    v_prorata_amount := ROUND((v_monthly_amount / v_days_in_month) * v_billable_days, 2);
    v_prorata_gst := ROUND(v_prorata_amount * v_gst_rate / 100, 2);
    v_prorata_total := v_prorata_amount + v_prorata_gst;
    
    -- Generate invoice ID
    SELECT generate_invoice_id(v_gst_rate) INTO v_invoice_id;
    
    -- Check if invoice already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM invoices 
      WHERE campaign_id = p_campaign_id 
      AND company_id = p_company_id
      AND billing_month = to_char(v_month_start, 'YYYY-MM')
    ) THEN
      INSERT INTO invoices (
        id, invoice_no, company_id, campaign_id, client_id, client_name,
        billing_month, invoice_date, due_date,
        subtotal, gst_rate, gst_amount, total_amount,
        status, created_by, invoice_series_prefix,
        period_start, period_end
      ) VALUES (
        v_invoice_id, v_invoice_id, p_company_id, p_campaign_id, 
        v_campaign.client_id, v_campaign.client_name,
        to_char(v_month_start, 'YYYY-MM'), CURRENT_DATE, CURRENT_DATE + 30,
        v_prorata_amount, v_gst_rate, v_prorata_gst, v_prorata_total,
        'Draft'::invoice_status, p_created_by,
        CASE WHEN v_gst_rate = 0 THEN 'INV-Z' ELSE 'INV' END,
        v_month_start, v_month_end
      );
      
      v_invoices := v_invoices || jsonb_build_object(
        'id', v_invoice_id,
        'month', to_char(v_month_start, 'YYYY-MM'),
        'amount', v_prorata_amount,
        'gst', v_prorata_gst,
        'total', v_prorata_total,
        'period_start', v_month_start,
        'period_end', v_month_end
      );
      
      v_total_months := v_total_months + 1;
    END IF;
    
    v_month_start := (date_trunc('month', v_month_start) + interval '1 month')::date;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_invoices', v_total_months,
    'invoices', v_invoices
  );
END;
$$;
