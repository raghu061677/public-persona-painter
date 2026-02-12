
-- Phase-5: Fix storage policies with correct path convention
-- Path convention: company/{company_id}/campaign/{campaign_id}/...
-- foldername[1] = 'company', foldername[2] = {company_id}

-- =====================================================
-- BUCKET: campaign-proofs (Private)
-- =====================================================

-- Ensure bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-proofs', 'campaign-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop all existing policies for campaign-proofs
DROP POLICY IF EXISTS "company_upload_campaign_proofs" ON storage.objects;
DROP POLICY IF EXISTS "company_read_campaign_proofs" ON storage.objects;
DROP POLICY IF EXISTS "company_update_campaign_proofs" ON storage.objects;
DROP POLICY IF EXISTS "company_delete_campaign_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read campaign proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload campaign proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read campaign proofs" ON storage.objects;

-- Create strict policies: foldername[1]='company', foldername[2]=user's company_id
CREATE POLICY "cp_insert_company_scoped" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cp_select_company_scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cp_update_company_scoped" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cp_delete_company_scoped" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- =====================================================
-- BUCKET: operations-photos (Private)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('operations-photos', 'operations-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "company_upload_operations_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_read_operations_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_update_operations_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_delete_operations_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload operations photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read operations photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload operations photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read operations photos" ON storage.objects;

CREATE POLICY "op_insert_company_scoped" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'operations-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "op_select_company_scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'operations-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "op_update_company_scoped" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'operations-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "op_delete_company_scoped" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'operations-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- =====================================================
-- BUCKET: campaign-photos (Private)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-photos', 'campaign-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "company_upload_campaign_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_read_campaign_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_update_campaign_photos" ON storage.objects;
DROP POLICY IF EXISTS "company_delete_campaign_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read campaign photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload campaign photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read campaign photos" ON storage.objects;

CREATE POLICY "cph_insert_company_scoped" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cph_select_company_scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cph_update_company_scoped" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'campaign-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "cph_delete_company_scoped" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);
