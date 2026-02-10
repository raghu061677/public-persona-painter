
-- ============================================================================
-- GLOBAL LIST VIEW SYSTEM — page_field_catalog + list_view_presets
-- ============================================================================

-- 1) page_field_catalog — Field definitions per page (drives column chooser)
CREATE TABLE IF NOT EXISTS public.page_field_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  group_name text NOT NULL,
  data_type text NOT NULL DEFAULT 'text',
  is_default boolean NOT NULL DEFAULT false,
  is_exportable boolean NOT NULL DEFAULT true,
  is_filterable boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  width int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_page_field_catalog
ON public.page_field_catalog(page_key, field_key);

DROP TRIGGER IF EXISTS trg_page_field_catalog_updated_at ON public.page_field_catalog;
CREATE TRIGGER trg_page_field_catalog_updated_at
BEFORE UPDATE ON public.page_field_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.page_field_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_field_catalog_select"
ON public.page_field_catalog FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "page_field_catalog_admin_write"
ON public.page_field_catalog FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) list_view_presets — Saved views per page per tenant
CREATE TABLE IF NOT EXISTS public.list_view_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  page_key text NOT NULL,
  preset_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid,
  search_query text DEFAULT '',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort jsonb NOT NULL DEFAULT '{"field":"created_at","direction":"desc"}'::jsonb,
  selected_fields text[] NOT NULL DEFAULT array[]::text[],
  field_order text[] NOT NULL DEFAULT array[]::text[],
  export_format text NOT NULL DEFAULT 'xlsx',
  export_style jsonb NOT NULL DEFAULT '{"rowColors":true,"headerBranding":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_list_view_presets_company_page
ON public.list_view_presets(company_id, page_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_list_view_presets_default
ON public.list_view_presets(company_id, page_key)
WHERE is_default = true;

DROP TRIGGER IF EXISTS trg_list_view_presets_updated_at ON public.list_view_presets;
CREATE TRIGGER trg_list_view_presets_updated_at
BEFORE UPDATE ON public.list_view_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.list_view_presets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read presets (shared + own)
CREATE POLICY "list_view_presets_select"
ON public.list_view_presets FOR SELECT
TO authenticated
USING (
  is_shared = true 
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Users can create their own presets
CREATE POLICY "list_view_presets_insert"
ON public.list_view_presets FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update their own, admins can update shared
CREATE POLICY "list_view_presets_update"
ON public.list_view_presets FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete their own, admins can delete any
CREATE POLICY "list_view_presets_delete"
ON public.list_view_presets FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Seed page_field_catalog for all pages

-- reports.vacant_media
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('reports.vacant_media', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('reports.vacant_media', 'asset_id', 'Asset ID', 'Core', 'text', true, 2, 20),
('reports.vacant_media', 'area', 'Area', 'Location', 'text', true, 3, 15),
('reports.vacant_media', 'location', 'Location', 'Location', 'text', true, 4, 30),
('reports.vacant_media', 'direction', 'Direction', 'Location', 'text', true, 5, 12),
('reports.vacant_media', 'city', 'City', 'Location', 'text', false, 6, 14),
('reports.vacant_media', 'dimension', 'Dimension', 'Specifications', 'text', true, 7, 14),
('reports.vacant_media', 'sqft', 'Sq.Ft', 'Specifications', 'number', true, 8, 10),
('reports.vacant_media', 'illumination', 'Illumination', 'Specifications', 'text', true, 9, 14),
('reports.vacant_media', 'media_type', 'Media Type', 'Specifications', 'text', false, 10, 16),
('reports.vacant_media', 'availability_status', 'Availability Status', 'Availability', 'text', true, 11, 18),
('reports.vacant_media', 'available_from', 'Available From', 'Availability', 'date', true, 12, 14),
('reports.vacant_media', 'booked_till', 'Booked Till', 'Availability', 'date', true, 13, 14),
('reports.vacant_media', 'card_rate', 'Card Rate', 'Pricing', 'currency', true, 14, 14),
('reports.vacant_media', 'campaign_name', 'Campaign Name', 'Campaign & Client', 'text', false, 15, 24),
('reports.vacant_media', 'client_name', 'Client Name', 'Campaign & Client', 'text', false, 16, 24),
('reports.vacant_media', 'latitude', 'Latitude', 'Geo Coordinates', 'number', false, 17, 14),
('reports.vacant_media', 'longitude', 'Longitude', 'Geo Coordinates', 'number', false, 18, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- plans.list
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('plans.list', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('plans.list', 'plan_id', 'Plan ID', 'Core', 'text', true, 2, 20),
('plans.list', 'plan_name', 'Plan Name', 'Core', 'text', true, 3, 24),
('plans.list', 'client_name', 'Client Name', 'Client', 'text', true, 4, 24),
('plans.list', 'status', 'Status', 'Status', 'text', true, 5, 14),
('plans.list', 'start_date', 'Start Date', 'Dates', 'date', true, 6, 14),
('plans.list', 'end_date', 'End Date', 'Dates', 'date', true, 7, 14),
('plans.list', 'total_amount', 'Total Amount', 'Pricing', 'currency', true, 8, 16),
('plans.list', 'discount_amount', 'Discount', 'Pricing', 'currency', false, 9, 14),
('plans.list', 'taxable_amount', 'Taxable Amount', 'Pricing', 'currency', false, 10, 16),
('plans.list', 'cgst_amount', 'CGST', 'Tax', 'currency', false, 11, 12),
('plans.list', 'sgst_amount', 'SGST', 'Tax', 'currency', false, 12, 12),
('plans.list', 'asset_count', 'Assets Count', 'Details', 'number', false, 13, 12),
('plans.list', 'created_at', 'Created On', 'Meta', 'date', false, 14, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- campaigns.list
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('campaigns.list', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('campaigns.list', 'campaign_id', 'Campaign ID', 'Core', 'text', true, 2, 20),
('campaigns.list', 'campaign_name', 'Campaign Name', 'Core', 'text', true, 3, 24),
('campaigns.list', 'client_name', 'Client Name', 'Client', 'text', true, 4, 24),
('campaigns.list', 'status', 'Status', 'Status', 'text', true, 5, 14),
('campaigns.list', 'start_date', 'Start Date', 'Dates', 'date', true, 6, 14),
('campaigns.list', 'end_date', 'End Date', 'Dates', 'date', true, 7, 14),
('campaigns.list', 'total_amount', 'Total Amount', 'Pricing', 'currency', true, 8, 16),
('campaigns.list', 'asset_count', 'Assets Count', 'Details', 'number', false, 9, 12),
('campaigns.list', 'city', 'City', 'Location', 'text', false, 10, 14),
('campaigns.list', 'created_at', 'Created On', 'Meta', 'date', false, 11, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- finance.invoices
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('finance.invoices', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('finance.invoices', 'invoice_id', 'Invoice ID', 'Core', 'text', true, 2, 20),
('finance.invoices', 'invoice_date', 'Invoice Date', 'Dates', 'date', true, 3, 14),
('finance.invoices', 'due_date', 'Due Date', 'Dates', 'date', true, 4, 14),
('finance.invoices', 'client_name', 'Client Name', 'Client & Campaign', 'text', true, 5, 24),
('finance.invoices', 'campaign_name', 'Campaign', 'Client & Campaign', 'text', false, 6, 24),
('finance.invoices', 'status', 'Status', 'Status', 'text', true, 7, 14),
('finance.invoices', 'subtotal', 'Subtotal', 'Amounts', 'currency', false, 8, 14),
('finance.invoices', 'total_amount', 'Total Amount', 'Amounts', 'currency', true, 9, 16),
('finance.invoices', 'paid_amount', 'Paid Amount', 'Amounts', 'currency', false, 10, 14),
('finance.invoices', 'balance_due', 'Balance Due', 'Amounts', 'currency', true, 11, 14),
('finance.invoices', 'cgst_amount', 'CGST', 'Tax', 'currency', false, 12, 12),
('finance.invoices', 'sgst_amount', 'SGST', 'Tax', 'currency', false, 13, 12),
('finance.invoices', 'igst_amount', 'IGST', 'Tax', 'currency', false, 14, 12),
('finance.invoices', 'created_at', 'Created On', 'Meta', 'date', false, 15, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- finance.expenses
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('finance.expenses', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('finance.expenses', 'expense_date', 'Date', 'Core', 'date', true, 2, 14),
('finance.expenses', 'category', 'Category', 'Core', 'text', true, 3, 16),
('finance.expenses', 'description', 'Description', 'Core', 'text', true, 4, 30),
('finance.expenses', 'vendor_name', 'Vendor', 'Details', 'text', false, 5, 20),
('finance.expenses', 'amount', 'Amount', 'Amounts', 'currency', true, 6, 14),
('finance.expenses', 'gst_amount', 'GST', 'Amounts', 'currency', false, 7, 12),
('finance.expenses', 'total_amount', 'Total', 'Amounts', 'currency', true, 8, 14),
('finance.expenses', 'payment_status', 'Status', 'Status', 'text', true, 9, 14),
('finance.expenses', 'campaign_name', 'Campaign', 'Linked', 'text', false, 10, 24),
('finance.expenses', 'client_name', 'Client', 'Linked', 'text', false, 11, 24),
('finance.expenses', 'created_at', 'Created On', 'Meta', 'date', false, 12, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- finance.power_bills
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('finance.power_bills', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('finance.power_bills', 'asset_id', 'Asset ID', 'Core', 'text', true, 2, 20),
('finance.power_bills', 'bill_month', 'Bill Month', 'Core', 'text', true, 3, 14),
('finance.power_bills', 'service_number', 'Service No', 'Details', 'text', true, 4, 16),
('finance.power_bills', 'consumer_name', 'Consumer Name', 'Details', 'text', false, 5, 20),
('finance.power_bills', 'area', 'Area', 'Location', 'text', true, 6, 15),
('finance.power_bills', 'location', 'Location', 'Location', 'text', false, 7, 30),
('finance.power_bills', 'bill_amount', 'Bill Amount', 'Amounts', 'currency', true, 8, 14),
('finance.power_bills', 'units', 'Units', 'Amounts', 'number', false, 9, 10),
('finance.power_bills', 'arrears', 'Arrears', 'Amounts', 'currency', false, 10, 12),
('finance.power_bills', 'total_due', 'Total Due', 'Amounts', 'currency', true, 11, 14),
('finance.power_bills', 'payment_status', 'Payment Status', 'Status', 'text', true, 12, 14),
('finance.power_bills', 'due_date', 'Due Date', 'Dates', 'date', false, 13, 14),
('finance.power_bills', 'payment_date', 'Payment Date', 'Dates', 'date', false, 14, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;

-- ops.campaign_assets
INSERT INTO public.page_field_catalog (page_key, field_key, label, group_name, data_type, is_default, sort_order, width) VALUES
('ops.campaign_assets', 'sno', 'S.No', 'Core', 'number', true, 1, 6),
('ops.campaign_assets', 'asset_id', 'Asset ID', 'Core', 'text', true, 2, 20),
('ops.campaign_assets', 'campaign_name', 'Campaign', 'Campaign', 'text', true, 3, 24),
('ops.campaign_assets', 'client_name', 'Client', 'Campaign', 'text', false, 4, 24),
('ops.campaign_assets', 'area', 'Area', 'Location', 'text', true, 5, 15),
('ops.campaign_assets', 'location', 'Location', 'Location', 'text', true, 6, 30),
('ops.campaign_assets', 'city', 'City', 'Location', 'text', false, 7, 14),
('ops.campaign_assets', 'media_type', 'Media Type', 'Specs', 'text', true, 8, 16),
('ops.campaign_assets', 'dimensions', 'Dimensions', 'Specs', 'text', false, 9, 14),
('ops.campaign_assets', 'status', 'Installation Status', 'Status', 'text', true, 10, 16),
('ops.campaign_assets', 'mounter_name', 'Mounter', 'Operations', 'text', false, 11, 16),
('ops.campaign_assets', 'start_date', 'Start Date', 'Dates', 'date', true, 12, 14),
('ops.campaign_assets', 'end_date', 'End Date', 'Dates', 'date', true, 13, 14),
('ops.campaign_assets', 'negotiated_rate', 'Rate', 'Pricing', 'currency', false, 14, 14),
('ops.campaign_assets', 'printing_cost', 'Printing Cost', 'Pricing', 'currency', false, 15, 14),
('ops.campaign_assets', 'mounting_cost', 'Mounting Cost', 'Pricing', 'currency', false, 16, 14)
ON CONFLICT (page_key, field_key) DO NOTHING;
