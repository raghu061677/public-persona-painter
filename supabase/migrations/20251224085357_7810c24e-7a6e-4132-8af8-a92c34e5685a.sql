-- Add is_gst_applicable column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_gst_applicable boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.is_gst_applicable IS 'Whether GST is applicable for this client. Set to false for non-GST clients.';