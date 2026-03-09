-- ============================================================
-- 1. Standardize asset_bookings table with proper columns
-- ============================================================

ALTER TABLE public.asset_bookings
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS source_item_id uuid,
  ADD COLUMN IF NOT EXISTS booking_start_date date,
  ADD COLUMN IF NOT EXISTS booking_end_date date,
  ADD COLUMN IF NOT EXISTS booking_status text,
  ADD COLUMN IF NOT EXISTS priority int DEFAULT 0;

-- Migrate existing data to new columns
UPDATE public.asset_bookings
SET
  booking_start_date = COALESCE(booking_start_date, start_date),
  booking_end_date = COALESCE(booking_end_date, end_date),
  booking_status = COALESCE(booking_status, status, 'confirmed'),
  source_type = COALESCE(source_type, 
    CASE 
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN plan_id IS NOT NULL THEN 'plan'
      ELSE 'manual_block'
    END
  ),
  source_id = COALESCE(source_id, 
    CASE 
      WHEN campaign_id IS NOT NULL THEN campaign_id::uuid
      WHEN plan_id IS NOT NULL THEN plan_id::uuid
      ELSE NULL
    END
  )
WHERE booking_start_date IS NULL OR booking_end_date IS NULL OR booking_status IS NULL OR source_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_bookings_company ON public.asset_bookings (company_id);
CREATE INDEX IF NOT EXISTS idx_asset_bookings_source ON public.asset_bookings (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_asset_bookings_booking_dates ON public.asset_bookings (booking_start_date, booking_end_date);
CREATE INDEX IF NOT EXISTS idx_asset_bookings_status ON public.asset_bookings (booking_status);

-- ============================================================
-- 2. Create document_sequences table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  doc_type text NOT NULL,
  period_key text NOT NULL,
  last_number int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, doc_type, period_key)
);

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sequences"
  ON public.document_sequences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. generate_plan_number(company_id) - atomic, server-side only
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_plan_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_next_number int;
  v_max_existing int;
BEGIN
  v_period := to_char(now(), 'YYYYMM');
  
  UPDATE document_sequences
  SET last_number = last_number + 1, updated_at = now()
  WHERE company_id = p_company_id AND doc_type = 'PLAN' AND period_key = v_period
  RETURNING last_number INTO v_next_number;
  
  IF NOT FOUND THEN
    SELECT COALESCE(MAX(
      CASE WHEN id ~ '-[0-9]+$' THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS integer) ELSE 0 END
    ), 0) INTO v_max_existing
    FROM plans WHERE id LIKE 'PLAN-' || v_period || '-%' AND company_id = p_company_id;
    
    v_next_number := v_max_existing + 1;
    
    INSERT INTO document_sequences (company_id, doc_type, period_key, last_number)
    VALUES (p_company_id, 'PLAN', v_period, v_next_number)
    ON CONFLICT (company_id, doc_type, period_key)
    DO UPDATE SET last_number = GREATEST(document_sequences.last_number + 1, EXCLUDED.last_number), updated_at = now()
    RETURNING last_number INTO v_next_number;
  END IF;
  
  RETURN 'PLAN-' || v_period || '-' || lpad(v_next_number::text, 4, '0');
END;
$$;

-- ============================================================
-- 4. generate_campaign_number(company_id) - atomic, server-side only
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_campaign_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_next_number int;
  v_max_existing int;
BEGIN
  v_period := to_char(now(), 'YYYYMM');
  
  UPDATE document_sequences
  SET last_number = last_number + 1, updated_at = now()
  WHERE company_id = p_company_id AND doc_type = 'CAMPAIGN' AND period_key = v_period
  RETURNING last_number INTO v_next_number;
  
  IF NOT FOUND THEN
    SELECT COALESCE(MAX(
      CASE WHEN id ~ '-[0-9]+$' THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS integer) ELSE 0 END
    ), 0) INTO v_max_existing
    FROM campaigns WHERE id LIKE 'CAM-' || v_period || '-%' AND company_id = p_company_id;
    
    v_next_number := v_max_existing + 1;
    
    INSERT INTO document_sequences (company_id, doc_type, period_key, last_number)
    VALUES (p_company_id, 'CAMPAIGN', v_period, v_next_number)
    ON CONFLICT (company_id, doc_type, period_key)
    DO UPDATE SET last_number = GREATEST(document_sequences.last_number + 1, EXCLUDED.last_number), updated_at = now()
    RETURNING last_number INTO v_next_number;
  END IF;
  
  RETURN 'CMP-' || v_period || '-' || lpad(v_next_number::text, 4, '0');
END;
$$;

-- ============================================================
-- 5. check_booking_conflict - uses asset_bookings as single source
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_asset_id text,
  p_start_date date,
  p_end_date date,
  p_exclude_source_type text DEFAULT NULL,
  p_exclude_source_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_conflict', EXISTS (
      SELECT 1 FROM asset_bookings ab
      WHERE ab.asset_id = p_asset_id
      AND ab.booking_status IN ('tentative', 'confirmed', 'running', 'blocked')
      AND (p_exclude_source_id IS NULL OR ab.source_id::text != p_exclude_source_id)
      AND daterange(ab.booking_start_date, ab.booking_end_date, '[]')
        && daterange(p_start_date, p_end_date, '[]')
    ),
    'conflicting_bookings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'booking_id', ab.id,
        'source_type', ab.source_type,
        'source_id', ab.source_id,
        'start_date', ab.booking_start_date,
        'end_date', ab.booking_end_date,
        'status', ab.booking_status
      ))
      FROM asset_bookings ab
      WHERE ab.asset_id = p_asset_id
      AND ab.booking_status IN ('tentative', 'confirmed', 'running', 'blocked')
      AND (p_exclude_source_id IS NULL OR ab.source_id::text != p_exclude_source_id)
      AND daterange(ab.booking_start_date, ab.booking_end_date, '[]')
        && daterange(p_start_date, p_end_date, '[]')
    ), '[]'::jsonb)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- 6. derive_asset_display_status - for UI display only
-- ============================================================

CREATE OR REPLACE FUNCTION public.derive_asset_display_status(p_asset_id text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM asset_bookings WHERE asset_id = p_asset_id AND booking_status = 'blocked'
    AND booking_start_date <= CURRENT_DATE AND booking_end_date >= CURRENT_DATE
  ) THEN RETURN 'Blocked'; END IF;
  
  IF EXISTS (
    SELECT 1 FROM asset_bookings WHERE asset_id = p_asset_id AND booking_status IN ('confirmed', 'running')
    AND booking_start_date <= CURRENT_DATE AND booking_end_date >= CURRENT_DATE
  ) THEN RETURN 'Booked'; END IF;
  
  IF EXISTS (
    SELECT 1 FROM asset_bookings WHERE asset_id = p_asset_id AND booking_status IN ('tentative', 'confirmed')
    AND booking_start_date > CURRENT_DATE
  ) THEN RETURN 'Upcoming'; END IF;
  
  RETURN 'Available';
END;
$$;