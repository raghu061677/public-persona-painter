
-- Add campaign_code column
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS campaign_code text;

-- Unique index per company
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_company_campaign_code_uniq
ON public.campaigns(company_id, campaign_code)
WHERE campaign_code IS NOT NULL;

-- Function to generate campaign_code
CREATE OR REPLACE FUNCTION public.generate_campaign_code(p_company_id uuid, p_start_date date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yyyymm text;
  v_key text;
  v_seq int;
  v_code text;
BEGIN
  v_yyyymm := to_char(p_start_date, 'YYYYMM');
  v_key := p_company_id::text || ':' || v_yyyymm;
  
  INSERT INTO public.code_counters (counter_type, counter_key, period, current_value)
  VALUES ('campaign_code', v_key, v_yyyymm, 1)
  ON CONFLICT (counter_type, counter_key, period)
  DO UPDATE SET current_value = code_counters.current_value + 1
  RETURNING current_value INTO v_seq;
  
  v_code := 'CAM-' || v_yyyymm || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_code;
END;
$$;

-- Backfill: Step 1 - campaigns already in CAM-YYYYMM-NNNN format get their id as campaign_code
UPDATE public.campaigns
SET campaign_code = id
WHERE campaign_code IS NULL
  AND id ~ '^CAM-\d{6}-\d{4}$';

-- Backfill: Step 2 - Seed counters to account for already-assigned codes
-- This prevents collisions when assigning codes to legacy campaigns
INSERT INTO public.code_counters (counter_type, counter_key, period, current_value)
SELECT 
  'campaign_code',
  company_id::text || ':' || substring(campaign_code from 5 for 6),
  substring(campaign_code from 5 for 6),
  max(substring(campaign_code from 12)::int)
FROM public.campaigns
WHERE campaign_code ~ '^CAM-\d{6}-\d{4}$'
GROUP BY company_id, substring(campaign_code from 5 for 6)
ON CONFLICT (counter_type, counter_key, period)
DO UPDATE SET current_value = GREATEST(code_counters.current_value, EXCLUDED.current_value);

-- Backfill: Step 3 - legacy format campaigns
DO $$
DECLARE
  rec RECORD;
  v_yyyymm text;
  v_code text;
  v_key text;
  v_seq int;
BEGIN
  FOR rec IN
    SELECT id, company_id, start_date, created_at
    FROM public.campaigns
    WHERE campaign_code IS NULL
    ORDER BY company_id, created_at
  LOOP
    v_yyyymm := to_char(COALESCE(rec.start_date, rec.created_at::date), 'YYYYMM');
    v_key := rec.company_id::text || ':' || v_yyyymm;
    
    INSERT INTO public.code_counters (counter_type, counter_key, period, current_value)
    VALUES ('campaign_code', v_key, v_yyyymm, 1)
    ON CONFLICT (counter_type, counter_key, period)
    DO UPDATE SET current_value = code_counters.current_value + 1
    RETURNING current_value INTO v_seq;
    
    v_code := 'CAM-' || v_yyyymm || '-' || lpad(v_seq::text, 4, '0');
    
    UPDATE public.campaigns SET campaign_code = v_code WHERE id = rec.id;
  END LOOP;
END;
$$;
