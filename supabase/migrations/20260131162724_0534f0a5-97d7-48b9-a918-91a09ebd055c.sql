-- Add snapshot fields for stable invoice PDFs (nullable for backwards compatibility)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS illumination TEXT,
  ADD COLUMN IF NOT EXISTS dimension_text TEXT,
  ADD COLUMN IF NOT EXISTS hsn_sac TEXT;

-- Helpful indexes for backfill and lookups
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_campaign_asset_id ON public.invoice_items(campaign_asset_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_asset_id ON public.invoice_items(asset_id);
