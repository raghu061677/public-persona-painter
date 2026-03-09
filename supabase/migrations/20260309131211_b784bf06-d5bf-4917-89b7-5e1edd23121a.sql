
-- Add merge fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS matched_client_id text REFERENCES public.clients(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS merge_status text NOT NULL DEFAULT 'unmatched';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS merge_confidence integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS merge_reason text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add unique constraint for GST dedup (only when gst_number is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_company_gst_unique 
ON public.clients (company_id, lower(gst_number)) 
WHERE gst_number IS NOT NULL AND gst_number != '';
