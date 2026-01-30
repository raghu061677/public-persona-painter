-- Add invoice_generated_months array to campaign_assets for duplicate prevention
ALTER TABLE campaign_assets 
ADD COLUMN IF NOT EXISTS invoice_generated_months TEXT[] DEFAULT '{}';

-- Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_campaign_assets_invoice_months 
ON campaign_assets USING GIN (invoice_generated_months);

-- Create invoice_items table for detailed per-asset invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  campaign_asset_id UUID REFERENCES campaign_assets(id) ON DELETE SET NULL,
  asset_id TEXT,
  asset_code TEXT,
  description TEXT,
  bill_start_date DATE NOT NULL,
  bill_end_date DATE NOT NULL,
  billable_days INTEGER NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'monthly_prorata' CHECK (rate_type IN ('monthly_prorata', 'daily')),
  rate_value NUMERIC NOT NULL DEFAULT 0,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  printing_cost NUMERIC DEFAULT 0,
  mounting_cost NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policy for invoice_items - allow access through invoice ownership
CREATE POLICY "invoice_items_access_via_invoice" ON invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_items.invoice_id
    AND i.company_id = get_current_user_company_id()
  )
);

-- Add billing_month column to invoices for easier duplicate detection
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS billing_month TEXT;

-- Add comment for documentation
COMMENT ON COLUMN campaign_assets.invoice_generated_months IS 'Array of YYYY-MM months for which invoices have been generated, prevents double billing';
COMMENT ON TABLE invoice_items IS 'Detailed per-asset line items for monthly invoicing with overlap-based billing';