-- ================================
-- UNUSED ASSET CODE TRACKING SYSTEM
-- ================================

-- Create table to track unused asset codes (for debugging only)
CREATE TABLE IF NOT EXISTS public.unused_asset_codes (
  generated_code TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  used BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.unused_asset_codes ENABLE ROW LEVEL SECURITY;

-- Admin can view all unused codes
CREATE POLICY "Admins can view unused codes"
  ON public.unused_asset_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.role = 'admin'
      AND cu.status = 'active'
    )
  );

-- ================================
-- DEBUGGING FUNCTION: Get Asset Code Health
-- ================================

CREATE OR REPLACE FUNCTION public.get_asset_code_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_generated INTEGER;
  v_total_used INTEGER;
  v_total_unused INTEGER;
  v_unused_codes JSONB;
  v_result JSONB;
BEGIN
  -- Count total generated codes (from sequences table)
  SELECT COUNT(*)
  INTO v_total_generated
  FROM media_asset_sequences;
  
  -- Count total used codes (assets with media_asset_code)
  SELECT COUNT(*)
  INTO v_total_used
  FROM media_assets
  WHERE media_asset_code IS NOT NULL;
  
  -- Count unused codes
  SELECT COUNT(*)
  INTO v_total_unused
  FROM unused_asset_codes
  WHERE used = FALSE;
  
  -- Get array of unused codes
  SELECT COALESCE(jsonb_agg(generated_code ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_unused_codes
  FROM unused_asset_codes
  WHERE used = FALSE
  LIMIT 100;
  
  -- Build result
  v_result := jsonb_build_object(
    'total_sequences', v_total_generated,
    'total_used_codes', v_total_used,
    'total_unused_codes', v_total_unused,
    'unused_codes_sample', v_unused_codes,
    'checked_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ================================
-- HELPER: Get unused codes list
-- ================================

CREATE OR REPLACE FUNCTION public.get_unused_asset_codes()
RETURNS TABLE (generated_code TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT generated_code, created_at
  FROM unused_asset_codes
  WHERE used = FALSE
  ORDER BY created_at DESC;
$$;

-- ================================
-- COMMENTS
-- ================================

COMMENT ON TABLE public.unused_asset_codes IS 'Tracks asset codes that were generated but never used (for debugging only)';
COMMENT ON FUNCTION public.get_asset_code_health() IS 'Returns health metrics for asset code generation system';
COMMENT ON FUNCTION public.get_unused_asset_codes() IS 'Returns list of asset codes that were generated but never assigned to assets';