
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS signed_ro_url text,
ADD COLUMN IF NOT EXISTS signed_ro_uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS signed_ro_uploaded_by uuid;
