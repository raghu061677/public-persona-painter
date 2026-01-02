-- Generate Invoice Number Function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company_id uuid,
  p_invoice_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy_key text;
  v_company_code text;
  v_next_number int;
  v_invoice_no text;
  v_year int;
  v_month int;
BEGIN
  v_year := EXTRACT(YEAR FROM p_invoice_date);
  v_month := EXTRACT(MONTH FROM p_invoice_date);
  
  IF v_month >= 4 THEN
    v_fy_key := 'FY' || SUBSTRING(v_year::text, 3, 2) || '-' || SUBSTRING((v_year + 1)::text, 3, 2);
  ELSE
    v_fy_key := 'FY' || SUBSTRING((v_year - 1)::text, 3, 2) || '-' || SUBSTRING(v_year::text, 3, 2);
  END IF;
  
  SELECT COALESCE(UPPER(SUBSTRING(name, 1, 3)), 'MNS') INTO v_company_code
  FROM companies WHERE id = p_company_id;
  
  INSERT INTO invoice_sequences (company_id, fy_key, prefix, next_number)
  VALUES (p_company_id, v_fy_key, 'INV', 1)
  ON CONFLICT (company_id, fy_key, prefix)
  DO UPDATE SET next_number = invoice_sequences.next_number + 1, updated_at = now()
  RETURNING next_number INTO v_next_number;
  
  v_invoice_no := 'INV-' || v_company_code || '-' || v_fy_key || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_invoice_no;
END;
$$;

-- Create Billing Period and Invoice Function
CREATE OR REPLACE FUNCTION public.create_billing_period_and_invoice(
  p_campaign_id text,
  p_month_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_billing_period_id uuid;
  v_invoice_id text;
  v_invoice_no text;
  v_period_start date;
  v_period_end date;
  v_asset RECORD;
  v_creative_change RECORD;
  v_is_first_month boolean;
  v_subtotal numeric := 0;
  v_tax_percent numeric := 18;
  v_is_same_state boolean;
  v_cgst_amount numeric := 0;
  v_sgst_amount numeric := 0;
  v_igst_amount numeric := 0;
  v_total numeric := 0;
  v_company_state text;
  v_client_state text;
  v_line_amount numeric;
BEGIN
  SELECT c.*, cl.state as client_state, co.state as company_state
  INTO v_campaign
  FROM campaigns c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE c.id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  v_period_start := (p_month_key || '-01')::date;
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;
  
  IF EXISTS (SELECT 1 FROM campaign_billing_periods WHERE campaign_id = p_campaign_id AND month_key = p_month_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billing period already exists');
  END IF;
  
  INSERT INTO campaign_billing_periods (company_id, campaign_id, period_start, period_end, month_key, status)
  VALUES (v_campaign.company_id, p_campaign_id, v_period_start, v_period_end, p_month_key, 'OPEN')
  RETURNING id INTO v_billing_period_id;
  
  v_invoice_no := generate_invoice_number(v_campaign.company_id, v_period_start);
  
  v_company_state := UPPER(TRIM(COALESCE(v_campaign.company_state, '')));
  v_client_state := UPPER(TRIM(COALESCE(v_campaign.client_state, '')));
  v_is_same_state := (v_company_state = v_client_state AND v_company_state != '');
  
  v_invoice_id := 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  v_is_first_month := (v_period_start <= v_campaign.start_date AND v_period_end >= v_campaign.start_date);
  
  INSERT INTO invoices (
    id, company_id, campaign_id, billing_period_id, client_id, client_name,
    invoice_date, due_date, status, invoice_no, place_of_supply, sub_total, 
    gst_percent, gst_amount, total_amount, balance_due, invoice_period_start, 
    invoice_period_end, created_by, cgst_percent, sgst_percent, igst_percent,
    cgst_amount, sgst_amount, igst_amount
  ) VALUES (
    v_invoice_id, v_campaign.company_id, p_campaign_id, v_billing_period_id,
    v_campaign.client_id, v_campaign.client_name, CURRENT_DATE, CURRENT_DATE + 30,
    'Draft', v_invoice_no, v_client_state, 0, v_tax_percent, 0, 0, 0,
    v_period_start, v_period_end, auth.uid(),
    CASE WHEN v_is_same_state THEN v_tax_percent / 2 ELSE 0 END,
    CASE WHEN v_is_same_state THEN v_tax_percent / 2 ELSE 0 END,
    CASE WHEN NOT v_is_same_state THEN v_tax_percent ELSE 0 END, 0, 0, 0
  );
  
  FOR v_asset IN
    SELECT ca.*, ma.id as asset_code, ma.location, ma.city, ma.dimensions
    FROM campaign_assets ca
    LEFT JOIN media_assets ma ON ma.id = ca.asset_id
    WHERE ca.campaign_id = p_campaign_id
    AND (ca.booking_start_date IS NULL OR ca.booking_start_date <= v_period_end)
    AND (ca.booking_end_date IS NULL OR ca.booking_end_date >= v_period_start)
  LOOP
    v_line_amount := COALESCE(v_asset.negotiated_rate, v_asset.card_rate, v_asset.base_rate_monthly, 0);
    v_subtotal := v_subtotal + v_line_amount;
    
    INSERT INTO invoice_line_items (invoice_id, line_type, media_asset_id, campaign_asset_id, description, qty, rate, amount, hsn_sac_code)
    VALUES (v_invoice_id, 'RENT', v_asset.asset_id, v_asset.id,
      'Display Rent: ' || COALESCE(v_asset.asset_code, v_asset.asset_id) || ' - ' || COALESCE(v_asset.location, '') || ' (' || p_month_key || ')',
      1, v_line_amount, v_line_amount, '998362');
    
    IF v_is_first_month THEN
      IF COALESCE(v_asset.printing_charges, v_asset.printing_cost_default, 0) > 0 THEN
        v_line_amount := COALESCE(v_asset.printing_charges, v_asset.printing_cost_default, 0);
        v_subtotal := v_subtotal + v_line_amount;
        INSERT INTO invoice_line_items (invoice_id, line_type, media_asset_id, campaign_asset_id, description, qty, rate, amount, hsn_sac_code)
        VALUES (v_invoice_id, 'PRINT', v_asset.asset_id, v_asset.id, 'Printing: ' || COALESCE(v_asset.asset_code, v_asset.asset_id), 1, v_line_amount, v_line_amount, '998361');
      END IF;
      
      IF COALESCE(v_asset.mounting_charges, v_asset.mounting_cost_default, 0) > 0 THEN
        v_line_amount := COALESCE(v_asset.mounting_charges, v_asset.mounting_cost_default, 0);
        v_subtotal := v_subtotal + v_line_amount;
        INSERT INTO invoice_line_items (invoice_id, line_type, media_asset_id, campaign_asset_id, description, qty, rate, amount, hsn_sac_code)
        VALUES (v_invoice_id, 'MOUNT', v_asset.asset_id, v_asset.id, 'Mounting: ' || COALESCE(v_asset.asset_code, v_asset.asset_id), 1, v_line_amount, v_line_amount, '998361');
      END IF;
    ELSE
      SELECT ccc.* INTO v_creative_change
      FROM campaign_asset_creative_changes ccc
      WHERE ccc.campaign_asset_id = v_asset.id AND ccc.change_date >= v_period_start AND ccc.change_date <= v_period_end
      ORDER BY ccc.change_date DESC LIMIT 1;
      
      IF FOUND THEN
        IF v_creative_change.reprint_required THEN
          v_line_amount := COALESCE(v_creative_change.printing_cost_override, v_asset.printing_charges, v_asset.printing_cost_default, 0);
          IF v_line_amount > 0 THEN
            v_subtotal := v_subtotal + v_line_amount;
            INSERT INTO invoice_line_items (invoice_id, line_type, media_asset_id, campaign_asset_id, description, qty, rate, amount, hsn_sac_code)
            VALUES (v_invoice_id, 'PRINT', v_asset.asset_id, v_asset.id, 'Reprint (Creative Change): ' || COALESCE(v_asset.asset_code, v_asset.asset_id), 1, v_line_amount, v_line_amount, '998361');
          END IF;
        END IF;
        
        IF v_creative_change.remount_required THEN
          v_line_amount := COALESCE(v_creative_change.mounting_cost_override, v_asset.mounting_charges, v_asset.mounting_cost_default, 0);
          IF v_line_amount > 0 THEN
            v_subtotal := v_subtotal + v_line_amount;
            INSERT INTO invoice_line_items (invoice_id, line_type, media_asset_id, campaign_asset_id, description, qty, rate, amount, hsn_sac_code)
            VALUES (v_invoice_id, 'MOUNT', v_asset.asset_id, v_asset.id, 'Remount (Creative Change): ' || COALESCE(v_asset.asset_code, v_asset.asset_id), 1, v_line_amount, v_line_amount, '998361');
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  IF v_is_same_state THEN
    v_cgst_amount := ROUND(v_subtotal * (v_tax_percent / 2) / 100, 2);
    v_sgst_amount := ROUND(v_subtotal * (v_tax_percent / 2) / 100, 2);
  ELSE
    v_igst_amount := ROUND(v_subtotal * v_tax_percent / 100, 2);
  END IF;
  
  v_total := v_subtotal + v_cgst_amount + v_sgst_amount + v_igst_amount;
  
  UPDATE invoices SET sub_total = v_subtotal, gst_amount = v_cgst_amount + v_sgst_amount + v_igst_amount,
    total_amount = v_total, balance_due = v_total, cgst_amount = v_cgst_amount, sgst_amount = v_sgst_amount, igst_amount = v_igst_amount
  WHERE id = v_invoice_id;
  
  UPDATE campaign_billing_periods SET status = 'INVOICED' WHERE id = v_billing_period_id;
  
  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'invoice_no', v_invoice_no, 'billing_period_id', v_billing_period_id, 'subtotal', v_subtotal, 'total', v_total);
END;
$$;

-- Add Creative Version Function
CREATE OR REPLACE FUNCTION public.add_creative_version(
  p_campaign_id text,
  p_effective_from date,
  p_name text,
  p_notes text DEFAULT NULL,
  p_affected_assets jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_creative_id uuid;
  v_next_version int;
  v_asset_data jsonb;
  v_asset_record RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  SELECT COALESCE(MAX(creative_version), 0) + 1 INTO v_next_version
  FROM campaign_creatives WHERE campaign_id = p_campaign_id;
  
  UPDATE campaign_creatives SET effective_to = p_effective_from - 1
  WHERE campaign_id = p_campaign_id AND effective_to IS NULL AND creative_version < v_next_version;
  
  INSERT INTO campaign_creatives (campaign_id, file_name, file_url, file_type, status, notes, creative_version, effective_from)
  VALUES (p_campaign_id, p_name, '', 'version', 'approved', p_notes, v_next_version, p_effective_from)
  RETURNING id INTO v_creative_id;
  
  FOR v_asset_data IN SELECT * FROM jsonb_array_elements(p_affected_assets)
  LOOP
    SELECT ca.* INTO v_asset_record FROM campaign_assets ca
    WHERE ca.id = (v_asset_data->>'campaign_asset_id')::uuid AND ca.campaign_id = p_campaign_id;
    
    IF FOUND THEN
      INSERT INTO campaign_asset_creative_changes (company_id, campaign_id, campaign_asset_id, creative_id, change_date, reprint_required, remount_required, printing_cost_override, mounting_cost_override)
      VALUES (v_campaign.company_id, p_campaign_id, v_asset_record.id, v_creative_id, p_effective_from,
        COALESCE((v_asset_data->>'reprint_required')::boolean, true),
        COALESCE((v_asset_data->>'remount_required')::boolean, true),
        (v_asset_data->>'printing_cost_override')::numeric,
        (v_asset_data->>'mounting_cost_override')::numeric);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'creative_id', v_creative_id, 'creative_version', v_next_version, 'affected_assets', jsonb_array_length(p_affected_assets));
END;
$$;

-- Get Campaign Billing Summary Function
CREATE OR REPLACE FUNCTION public.get_campaign_billing_summary(p_campaign_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'campaign_id', c.id,
    'campaign_name', c.campaign_name,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'total_assets', c.total_assets,
    'billing_periods', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', bp.id, 'month_key', bp.month_key, 'period_start', bp.period_start,
        'period_end', bp.period_end, 'status', bp.status, 'invoice_id', i.id,
        'invoice_no', i.invoice_no, 'invoice_total', i.total_amount, 'invoice_status', i.status
      ) ORDER BY bp.month_key), '[]'::jsonb)
      FROM campaign_billing_periods bp LEFT JOIN invoices i ON i.billing_period_id = bp.id WHERE bp.campaign_id = c.id
    ),
    'creative_versions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cc.id, 'version', cc.creative_version, 'name', cc.file_name,
        'effective_from', cc.effective_from, 'effective_to', cc.effective_to,
        'affected_assets', (SELECT COUNT(*) FROM campaign_asset_creative_changes ccc WHERE ccc.creative_id = cc.id)
      ) ORDER BY cc.creative_version), '[]'::jsonb)
      FROM campaign_creatives cc WHERE cc.campaign_id = c.id
    )
  ) INTO v_result FROM campaigns c WHERE c.id = p_campaign_id;
  
  RETURN v_result;
END;
$$;