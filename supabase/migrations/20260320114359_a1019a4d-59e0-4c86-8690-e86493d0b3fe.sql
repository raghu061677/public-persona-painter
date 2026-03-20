
-- Phase: Fix SECURITY DEFINER functions missing explicit search_path
-- This prevents search_path manipulation attacks by pinning to 'public'

-- 1. auto_book_media_assets_fn (trigger)
CREATE OR REPLACE FUNCTION public.auto_book_media_assets_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT start_date, end_date, status INTO v_campaign
  FROM campaigns
  WHERE id = NEW.campaign_id;
  
  IF NEW.booking_start_date IS NULL THEN
    NEW.booking_start_date := v_campaign.start_date;
  END IF;
  
  IF NEW.booking_end_date IS NULL THEN
    NEW.booking_end_date := v_campaign.end_date;
  END IF;
  
  UPDATE media_assets
  SET 
    status = 'Booked'::media_asset_status,
    booked_from = COALESCE(NEW.booking_start_date, v_campaign.start_date),
    booked_to = COALESCE(NEW.booking_end_date, v_campaign.end_date),
    current_campaign_id = NEW.campaign_id,
    updated_at = now()
  WHERE id = NEW.asset_id
    AND status = 'Available'::media_asset_status;
  
  RETURN NEW;
END;
$function$;

-- 2. auto_release_media_assets_fn (trigger)
CREATE OR REPLACE FUNCTION public.auto_release_media_assets_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('Completed', 'Cancelled', 'Archived') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('Completed', 'Cancelled', 'Archived')) THEN
    
    UPDATE media_assets ma
    SET 
      status = 'Available'::media_asset_status,
      booked_from = NULL,
      booked_to = NULL,
      current_campaign_id = NULL,
      updated_at = now()
    WHERE ma.id IN (
      SELECT ca.asset_id 
      FROM campaign_assets ca 
      WHERE ca.campaign_id = NEW.id
    )
    AND ma.status = 'Booked'::media_asset_status
    AND (ma.current_campaign_id = NEW.id OR ma.current_campaign_id IS NULL)
    AND NOT EXISTS (
      SELECT 1 
      FROM campaign_assets ca2
      JOIN campaigns c ON c.id = ca2.campaign_id
      WHERE ca2.asset_id = ma.id
        AND c.id != NEW.id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
        AND c.end_date >= CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. auto_update_campaign_status (void)
CREATE OR REPLACE FUNCTION public.auto_update_campaign_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_campaign RECORD;
BEGIN
  FOR v_campaign IN 
    SELECT id, status, start_date, end_date 
    FROM campaigns 
    WHERE status IN ('Draft'::campaign_status, 'Upcoming'::campaign_status)
      AND start_date <= v_today
      AND end_date >= v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Running'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Running'::campaign_status, 'Auto-updated: campaign is now running');
  END LOOP;
  
  FOR v_campaign IN 
    SELECT id, status, start_date 
    FROM campaigns 
    WHERE status = 'Draft'::campaign_status
      AND start_date > v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Upcoming'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Upcoming'::campaign_status, 'Auto-updated: campaign scheduled for future');
  END LOOP;
  
  FOR v_campaign IN 
    SELECT id, status, end_date 
    FROM campaigns 
    WHERE status IN ('Running'::campaign_status, 'Upcoming'::campaign_status)
      AND end_date < v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Completed'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Completed'::campaign_status, 'Auto-updated: campaign end date passed');
  END LOOP;
  
  UPDATE media_assets ma
  SET 
    status = 'Available'::media_asset_status,
    booked_from = NULL,
    booked_to = NULL,
    current_campaign_id = NULL,
    updated_at = now()
  WHERE ma.status = 'Booked'::media_asset_status
    AND (
      (ma.booked_to IS NOT NULL AND ma.booked_to < CURRENT_DATE)
      OR
      (ma.current_campaign_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM campaigns c 
        WHERE c.id = ma.current_campaign_id 
        AND c.status IN ('Completed', 'Cancelled', 'Archived')
      ))
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM campaign_assets ca
      JOIN campaigns c ON c.id = ca.campaign_id
      WHERE ca.asset_id = ma.id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
        AND c.end_date >= CURRENT_DATE
    );
END;
$function$;

-- 4. check_subscription_limits (trigger)
CREATE OR REPLACE FUNCTION public.check_subscription_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_company_id uuid;
  v_subscription RECORD;
  v_current_count integer;
BEGIN
  v_company_id := NEW.company_id;
  
  IF is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_subscription
  FROM company_subscriptions
  WHERE company_id = v_company_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    v_subscription.asset_limit := 10;
    v_subscription.user_limit := 3;
    v_subscription.campaign_limit := 5;
  END IF;
  
  IF TG_TABLE_NAME = 'media_assets' AND v_subscription.asset_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM media_assets
    WHERE company_id = v_company_id;
    
    IF v_current_count >= v_subscription.asset_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % assets allowed', v_subscription.asset_limit;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'company_users' AND v_subscription.user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM company_users
    WHERE company_id = v_company_id AND status = 'active';
    
    IF v_current_count >= v_subscription.user_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % users allowed', v_subscription.user_limit;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'campaigns' AND v_subscription.campaign_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM campaigns
    WHERE company_id = v_company_id 
    AND status IN ('Planned', 'InProgress', 'Assigned');
    
    IF v_current_count >= v_subscription.campaign_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % active campaigns allowed', v_subscription.campaign_limit;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. create_receipt_on_payment (trigger)
CREATE OR REPLACE FUNCTION public.create_receipt_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_receipt_no TEXT;
  v_company_id UUID;
  v_client_id TEXT;
BEGIN
  SELECT company_id, client_id INTO v_company_id, v_client_id
  FROM public.invoices
  WHERE id = NEW.invoice_id;
  
  v_company_id := COALESCE(NEW.company_id, v_company_id);
  
  v_receipt_no := public.generate_receipt_number(v_company_id, NEW.payment_date);
  
  INSERT INTO public.receipts (
    receipt_no, company_id, client_id, invoice_id, payment_record_id,
    receipt_date, amount_received, payment_method, reference_no, notes, created_by
  ) VALUES (
    v_receipt_no, v_company_id, v_client_id, NEW.invoice_id, NEW.id,
    NEW.payment_date, NEW.amount, NEW.method, NEW.reference_no, NEW.notes, NEW.created_by
  );
  
  RETURN NEW;
END;
$function$;

-- 6. fn_media_availability_range
CREATE OR REPLACE FUNCTION public.fn_media_availability_range(p_company_id uuid, p_start date, p_end date, p_city text DEFAULT NULL::text, p_media_type text DEFAULT NULL::text)
 RETURNS TABLE(asset_id text, media_asset_code text, area text, location text, direction text, dimension text, sqft numeric, illumination text, card_rate numeric, city text, media_type text, primary_photo_url text, qr_code_url text, latitude numeric, longitude numeric, availability_status text, available_from date, booked_till date, current_campaign_id text, current_campaign_name text, current_client_name text, booking_start text, booking_end text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH asset_base AS (
    SELECT
      a.id AS asset_id,
      a.media_asset_code,
      a.area,
      a.location,
      a.direction,
      a.dimensions AS dimension,
      COALESCE(a.total_sqft, 0) AS sqft,
      COALESCE(a.illumination_type, '') AS illumination,
      a.card_rate,
      a.city,
      a.media_type,
      a.primary_photo_url,
      a.qr_code_url,
      a.latitude,
      a.longitude,
      a.current_campaign_id
    FROM public.media_assets a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.status::text, 'Available') NOT IN ('Inactive', 'Expired')
      AND (p_city IS NULL OR p_city = 'all' OR a.city = p_city)
      AND (p_media_type IS NULL OR p_media_type = 'all' OR a.media_type = p_media_type)
  ),
  valid_bookings AS (
    SELECT
      ca.asset_id,
      ca.booking_start_date AS b_start,
      ca.booking_end_date AS b_end,
      ca.campaign_id,
      c.campaign_name,
      c.client_name
    FROM public.campaign_assets ca
    JOIN public.campaigns c ON c.id = ca.campaign_id
    WHERE COALESCE(c.is_deleted, false) = false
      AND c.status::text NOT IN ('Cancelled','Archived')
      AND ca.booking_start_date IS NOT NULL
      AND ca.booking_end_date IS NOT NULL
      AND ca.booking_end_date >= ca.booking_start_date
      AND ca.asset_id IN (SELECT ab.asset_id FROM asset_base ab)
  ),
  last_booking_in_range AS (
    SELECT
      b.asset_id,
      MAX(b.b_end) AS booked_till,
      (array_agg(b.campaign_id ORDER BY b.b_end DESC))[1] AS latest_campaign_id,
      (array_agg(b.campaign_name ORDER BY b.b_end DESC))[1] AS latest_campaign_name,
      (array_agg(b.client_name ORDER BY b.b_end DESC))[1] AS latest_client_name,
      (array_agg(b.b_start::text ORDER BY b.b_end DESC))[1] AS latest_booking_start,
      (array_agg(b.b_end::text ORDER BY b.b_end DESC))[1] AS latest_booking_end
    FROM valid_bookings b
    WHERE b.b_end >= p_start
    GROUP BY b.asset_id
  ),
  has_overlap_in_range AS (
    SELECT DISTINCT b.asset_id
    FROM valid_bookings b
    WHERE b.b_start <= p_end
      AND b.b_end >= p_start
  ),
  availability_calc AS (
    SELECT
      ab.*,
      lb.booked_till,
      lb.latest_campaign_id,
      lb.latest_campaign_name,
      lb.latest_client_name,
      lb.latest_booking_start,
      lb.latest_booking_end,
      CASE
        WHEN ho.asset_id IS NULL THEN p_start
        WHEN lb.booked_till IS NOT NULL THEN (lb.booked_till + INTERVAL '1 day')::date
        ELSE p_start
      END AS calc_available_from
    FROM asset_base ab
    LEFT JOIN last_booking_in_range lb ON lb.asset_id = ab.asset_id
    LEFT JOIN has_overlap_in_range ho ON ho.asset_id = ab.asset_id
  )
  SELECT
    ac.asset_id,
    ac.media_asset_code,
    ac.area,
    ac.location,
    ac.direction,
    ac.dimension,
    ac.sqft,
    ac.illumination,
    ac.card_rate,
    ac.city,
    ac.media_type,
    ac.primary_photo_url,
    ac.qr_code_url,
    ac.latitude,
    ac.longitude,
    CASE
      WHEN ac.calc_available_from <= p_start THEN 'VACANT_NOW'
      WHEN ac.calc_available_from > p_start AND ac.calc_available_from <= p_end THEN 'AVAILABLE_SOON'
      ELSE 'BOOKED_THROUGH_RANGE'
    END AS availability_status,
    ac.calc_available_from AS available_from,
    ac.booked_till,
    ac.latest_campaign_id AS current_campaign_id,
    ac.latest_campaign_name AS current_campaign_name,
    ac.latest_client_name AS current_client_name,
    ac.latest_booking_start AS booking_start,
    ac.latest_booking_end AS booking_end
  FROM availability_calc ac
  WHERE ac.calc_available_from <= p_end
  ORDER BY
    CASE
      WHEN ac.calc_available_from <= p_start THEN 1
      WHEN ac.calc_available_from <= p_end THEN 2
      ELSE 3
    END,
    ac.calc_available_from ASC,
    ac.area ASC,
    ac.location ASC,
    ac.asset_id ASC;
END;
$function$;

-- 7. generate_monthly_invoices (3-param overload)
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_campaign_id text, p_company_id uuid, p_created_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
  
  v_month_start := v_start;
  
  WHILE v_month_start <= v_end LOOP
    v_month_end := LEAST(
      (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day')::date,
      v_end
    );
    
    v_days_in_month := extract(day from (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day'))::int;
    v_billable_days := (v_month_end - v_month_start + 1)::int;
    
    v_prorata_amount := ROUND((v_monthly_amount / v_days_in_month) * v_billable_days, 2);
    v_prorata_gst := ROUND(v_prorata_amount * v_gst_rate / 100, 2);
    v_prorata_total := v_prorata_amount + v_prorata_gst;
    
    SELECT generate_invoice_id(v_gst_rate) INTO v_invoice_id;
    
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
$function$;

-- 8. generate_monthly_invoices (2-param overload)
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_campaign_id text, p_created_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
      'Draft'::invoice_status,
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
$function$;

-- 9. generate_receipt_number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_company_id uuid, p_receipt_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_year_month TEXT;
  v_next_number INTEGER;
  v_receipt_no TEXT;
BEGIN
  v_year_month := to_char(p_receipt_date, 'YYYYMM');
  
  INSERT INTO public.receipt_sequences (company_id, year_month, next_number)
  VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET next_number = receipt_sequences.next_number + 1, updated_at = now()
  RETURNING next_number INTO v_next_number;
  
  v_receipt_no := 'RCT-' || v_year_month || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_receipt_no;
END;
$function$;

-- 10. sync_invoice_after_payment (trigger)
CREATE OR REPLACE FUNCTION public.sync_invoice_after_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_invoice_id TEXT;
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_total_tds NUMERIC(15,2);
  v_total_settled NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(total_amount, 0)
  INTO v_total_amount
  FROM public.invoices
  WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = v_invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_total_settled := v_total_paid + v_total_tds;

  IF v_total_settled >= v_total_amount - 0.01 THEN
    v_new_status := 'Paid';
  ELSIF v_total_paid > 0 OR v_total_tds > 0 THEN
    v_new_status := 'Partial';
  ELSE
    v_new_status := 'Sent';
  END IF;

  UPDATE public.invoices
  SET paid_amount = v_total_paid,
      balance_due = GREATEST(v_total_amount - v_total_settled, 0),
      status = v_new_status::invoice_status,
      updated_at = now()
  WHERE id = v_invoice_id
    AND status NOT IN ('Draft'::invoice_status, 'Cancelled'::invoice_status);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 11. validate_payment (trigger)
CREATE OR REPLACE FUNCTION public.validate_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_invoice_status TEXT;
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_total_tds NUMERIC(15,2);
  v_actual_balance NUMERIC(15,2);
BEGIN
  SELECT status, COALESCE(total_amount, 0)
  INTO v_invoice_status, v_total_amount
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', NEW.invoice_id;
  END IF;

  IF v_invoice_status = 'Draft' THEN
    RAISE EXCEPTION 'Cannot add payment to draft invoice. Please finalize the invoice first.';
  END IF;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = NEW.invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_actual_balance := v_total_amount - v_total_paid - v_total_tds;

  IF (NEW.amount + COALESCE(NEW.tds_amount, 0)) > v_actual_balance + 0.01 THEN
    RAISE EXCEPTION 'Payment amount + TDS (%) exceeds invoice balance (%)', 
      (NEW.amount + COALESCE(NEW.tds_amount, 0)), v_actual_balance;
  END IF;

  RETURN NEW;
END;
$function$;
