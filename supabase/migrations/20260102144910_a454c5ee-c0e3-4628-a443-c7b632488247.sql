-- Campaign Billing Periods Table
CREATE TABLE IF NOT EXISTS public.campaign_billing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  month_key text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVOICED', 'PAID', 'VOID')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, month_key)
);

-- Campaign Asset Creative Changes Table
CREATE TABLE IF NOT EXISTS public.campaign_asset_creative_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_asset_id uuid NOT NULL REFERENCES campaign_assets(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES campaign_creatives(id) ON DELETE CASCADE,
  change_date date NOT NULL,
  reprint_required boolean NOT NULL DEFAULT true,
  remount_required boolean NOT NULL DEFAULT true,
  printing_cost_override numeric NULL,
  mounting_cost_override numeric NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_asset_id, creative_id)
);

-- Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_type text NOT NULL CHECK (line_type IN ('RENT', 'PRINT', 'MOUNT', 'OTHER')),
  media_asset_id text NULL REFERENCES media_assets(id),
  campaign_asset_id uuid NULL REFERENCES campaign_assets(id),
  description text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  hsn_sac_code text NULL,
  created_at timestamptz DEFAULT now()
);

-- Invoice Sequences Table
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fy_key text NOT NULL,
  prefix text NOT NULL DEFAULT 'INV',
  next_number int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, fy_key, prefix)
);

-- Add columns to existing tables
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'MONTHLY',
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true;

ALTER TABLE public.campaign_assets
ADD COLUMN IF NOT EXISTS base_rate_monthly numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS printing_cost_default numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mounting_cost_default numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 18;

ALTER TABLE public.campaign_creatives
ADD COLUMN IF NOT EXISTS creative_version int DEFAULT 1,
ADD COLUMN IF NOT EXISTS effective_from date NULL,
ADD COLUMN IF NOT EXISTS effective_to date NULL;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS billing_period_id uuid NULL,
ADD COLUMN IF NOT EXISTS place_of_supply text NULL,
ADD COLUMN IF NOT EXISTS sales_person text NULL,
ADD COLUMN IF NOT EXISTS cgst_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_no text NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_periods_campaign ON campaign_billing_periods(campaign_id);
CREATE INDEX IF NOT EXISTS idx_billing_periods_month ON campaign_billing_periods(month_key);
CREATE INDEX IF NOT EXISTS idx_creative_changes_campaign ON campaign_asset_creative_changes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Enable RLS
ALTER TABLE public.campaign_billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_asset_creative_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "billing_periods_company_access" ON campaign_billing_periods
  FOR ALL USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "creative_changes_company_access" ON campaign_asset_creative_changes
  FOR ALL USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "invoice_line_items_access" ON invoice_line_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_line_items.invoice_id 
    AND (i.company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()))
  ));

CREATE POLICY "invoice_sequences_company_access" ON invoice_sequences
  FOR ALL USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));