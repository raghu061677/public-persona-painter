
-- Create plan_ro_tokens table for digital signing links
CREATE TABLE public.plan_ro_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Index for fast token lookup
CREATE INDEX idx_plan_ro_tokens_token ON public.plan_ro_tokens(token);
CREATE INDEX idx_plan_ro_tokens_plan_id ON public.plan_ro_tokens(plan_id);

-- Enable RLS
ALTER TABLE public.plan_ro_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users in the company can create/read tokens
CREATE POLICY "Company members can manage RO tokens"
ON public.plan_ro_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_ro_tokens.plan_id
    AND p.company_id = public.current_company_id()
  )
);

-- Anonymous users can read valid (unexpired, unused) tokens for signing
CREATE POLICY "Public can validate RO tokens"
ON public.plan_ro_tokens
FOR SELECT
TO anon
USING (
  expires_at > now()
  AND used_at IS NULL
);

-- Create ro-signatures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ro-signatures', 'ro-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ro-signatures bucket
CREATE POLICY "Authenticated users can upload RO signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ro-signatures');

CREATE POLICY "Authenticated users can read RO signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ro-signatures');

-- Allow anon to upload signatures (for public signing page)
CREATE POLICY "Anon can upload RO signatures"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'ro-signatures');

-- Allow anon to update RO tokens (mark as used)
CREATE POLICY "Anon can mark tokens as used"
ON public.plan_ro_tokens
FOR UPDATE
TO anon
USING (
  expires_at > now()
  AND used_at IS NULL
)
WITH CHECK (
  used_at IS NOT NULL
);
