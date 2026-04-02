
-- SECTION A: SCHEMA CHANGES (columns only, no data updates)

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_registered boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS legal_name text;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS finalized_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reverse_charge_applicable boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_gstin_snapshot text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_name_snapshot text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_state_code_snapshot text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS supplier_state_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cess_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS round_off_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS original_invoice_no_snapshot text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS client_name_snapshot text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS client_gstin_snapshot text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS place_of_supply_snapshot text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS supplier_state_code_snapshot text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS tax_type text;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS cess_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS gst_rate numeric;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS cgst_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS sgst_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS igst_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS unit text;

-- New table
CREATE TABLE IF NOT EXISTS public.gst_return_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  filing_month integer NOT NULL CHECK (filing_month BETWEEN 1 AND 12),
  filing_year integer NOT NULL CHECK (filing_year BETWEEN 2020 AND 2099),
  period_start date NOT NULL, period_end date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(), generated_by uuid,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb, validation_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_version integer NOT NULL DEFAULT 1, source_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gst_return_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gst_snap_select" ON public.gst_return_snapshots FOR SELECT TO authenticated
  USING (company_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()));
CREATE POLICY "gst_snap_insert" ON public.gst_return_snapshots FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()));
CREATE POLICY "gst_snap_update" ON public.gst_return_snapshots FOR UPDATE TO authenticated
  USING (company_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()));
CREATE POLICY "gst_snap_delete" ON public.gst_return_snapshots FOR DELETE TO authenticated
  USING (company_id IN (SELECT cu.company_id FROM public.company_users cu WHERE cu.user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON public.invoices (company_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_company_draft_status ON public.invoices (company_id, is_draft, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_cancelled ON public.invoices (company_id, is_cancelled);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_issued ON public.credit_notes (company_id, issued_at, status);
CREATE INDEX IF NOT EXISTS idx_clients_company_gstin ON public.clients (company_id, gst_number);
CREATE INDEX IF NOT EXISTS idx_gst_snapshots_company_period ON public.gst_return_snapshots (company_id, filing_year, filing_month);

-- Helper function
CREATE OR REPLACE FUNCTION public.gst_state_code(state_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(trim(state_name))
    WHEN 'andhra pradesh' THEN '37' WHEN 'ap' THEN '37'
    WHEN 'arunachal pradesh' THEN '12' WHEN 'assam' THEN '18' WHEN 'bihar' THEN '10'
    WHEN 'chhattisgarh' THEN '22' WHEN 'chattisgarh' THEN '22'
    WHEN 'goa' THEN '30' WHEN 'gujarat' THEN '24' WHEN 'haryana' THEN '06'
    WHEN 'himachal pradesh' THEN '02' WHEN 'hp' THEN '02' WHEN 'jharkhand' THEN '20'
    WHEN 'karnataka' THEN '29' WHEN 'kerala' THEN '32'
    WHEN 'madhya pradesh' THEN '23' WHEN 'mp' THEN '23'
    WHEN 'maharashtra' THEN '27' WHEN 'maharastra' THEN '27'
    WHEN 'manipur' THEN '14' WHEN 'meghalaya' THEN '17' WHEN 'mizoram' THEN '15'
    WHEN 'nagaland' THEN '13' WHEN 'odisha' THEN '21' WHEN 'orissa' THEN '21'
    WHEN 'punjab' THEN '03' WHEN 'rajasthan' THEN '08' WHEN 'sikkim' THEN '11'
    WHEN 'tamil nadu' THEN '33' WHEN 'tamilnadu' THEN '33' WHEN 'tn' THEN '33'
    WHEN 'telangana' THEN '36' WHEN 'ts' THEN '36' WHEN 'tripura' THEN '16'
    WHEN 'uttar pradesh' THEN '09' WHEN 'up' THEN '09'
    WHEN 'uttarakhand' THEN '05' WHEN 'uttaranchal' THEN '05'
    WHEN 'west bengal' THEN '19' WHEN 'wb' THEN '19'
    WHEN 'delhi' THEN '07' WHEN 'new delhi' THEN '07' WHEN 'nct of delhi' THEN '07'
    WHEN 'jammu and kashmir' THEN '01' WHEN 'j&k' THEN '01' WHEN 'jammu & kashmir' THEN '01'
    WHEN 'ladakh' THEN '38' WHEN 'chandigarh' THEN '04'
    WHEN 'puducherry' THEN '34' WHEN 'pondicherry' THEN '34'
    WHEN 'andaman and nicobar' THEN '35' WHEN 'andaman & nicobar' THEN '35'
    WHEN 'lakshadweep' THEN '31' ELSE NULL
  END
$$;

-- Disable ONLY user-defined triggers for backfill
ALTER TABLE public.clients DISABLE TRIGGER client_audit_trigger;
ALTER TABLE public.clients DISABLE TRIGGER clients_audit_trigger;
ALTER TABLE public.clients DISABLE TRIGGER clients_search_vector_update;
ALTER TABLE public.clients DISABLE TRIGGER update_clients_updated_at;
ALTER TABLE public.invoices DISABLE TRIGGER check_invoice_overdue_on_update;
ALTER TABLE public.invoices DISABLE TRIGGER ensure_billing_month_populated;
ALTER TABLE public.invoices DISABLE TRIGGER ensure_invoice_no_populated;
ALTER TABLE public.invoices DISABLE TRIGGER trg_block_locked_invoices;
ALTER TABLE public.invoices DISABLE TRIGGER update_invoices_updated_at;
ALTER TABLE public.credit_notes DISABLE TRIGGER credit_note_apply_to_invoice;
ALTER TABLE public.credit_notes DISABLE TRIGGER validate_credit_note_trigger;
ALTER TABLE public.invoice_items DISABLE TRIGGER trg_block_locked_invoice_items;
ALTER TABLE public.invoice_line_items DISABLE TRIGGER trg_block_locked_invoice_line_items;

-- BACKFILLS

-- companies.state_code
UPDATE public.companies SET state_code = public.gst_state_code(state)
WHERE state IS NOT NULL AND (state_code IS NULL OR state_code = '');

-- clients.state_code + is_registered
UPDATE public.clients SET state_code = public.gst_state_code(COALESCE(billing_state, state))
WHERE (state_code IS NULL OR state_code = '') AND COALESCE(billing_state, state) IS NOT NULL;
UPDATE public.clients SET is_registered = true
WHERE gst_number IS NOT NULL AND trim(gst_number) != '' AND is_registered = false;

-- invoices snapshots
UPDATE public.invoices i SET place_of_supply = COALESCE(c.billing_state, c.state)
FROM public.clients c WHERE i.client_id = c.id AND (i.place_of_supply IS NULL OR trim(i.place_of_supply) = '');

UPDATE public.invoices i SET client_gstin_snapshot = c.gst_number
FROM public.clients c WHERE i.client_id = c.id
AND i.client_gstin_snapshot IS NULL AND c.gst_number IS NOT NULL AND trim(c.gst_number) != '';

UPDATE public.invoices i SET client_name_snapshot = COALESCE(c.company, c.name)
FROM public.clients c WHERE i.client_id = c.id AND i.client_name_snapshot IS NULL;

UPDATE public.invoices i SET billing_state_code_snapshot = c.state_code
FROM public.clients c WHERE i.client_id = c.id AND i.billing_state_code_snapshot IS NULL AND c.state_code IS NOT NULL;

UPDATE public.invoices i SET supplier_state_code = co.state_code
FROM public.companies co WHERE i.company_id = co.id AND i.supplier_state_code IS NULL AND co.state_code IS NOT NULL;

UPDATE public.invoices SET finalized_at = COALESCE(updated_at, created_at)
WHERE is_draft = false AND finalized_at IS NULL;

UPDATE public.invoices SET is_cancelled = true, cancelled_at = COALESCE(updated_at, now())
WHERE status = 'Cancelled' AND is_cancelled = false;

-- credit_notes snapshots
UPDATE public.credit_notes SET original_invoice_no_snapshot = invoice_id
WHERE original_invoice_no_snapshot IS NULL AND invoice_id IS NOT NULL;

UPDATE public.credit_notes cn SET client_name_snapshot = COALESCE(c.company, c.name), client_gstin_snapshot = c.gst_number
FROM public.clients c WHERE cn.client_id = c.id AND cn.client_name_snapshot IS NULL;

UPDATE public.credit_notes cn SET place_of_supply_snapshot = i.place_of_supply
FROM public.invoices i WHERE cn.invoice_id = i.id AND cn.place_of_supply_snapshot IS NULL;

UPDATE public.credit_notes cn SET supplier_state_code_snapshot = co.state_code
FROM public.companies co WHERE cn.company_id = co.id AND cn.supplier_state_code_snapshot IS NULL AND co.state_code IS NOT NULL;

UPDATE public.credit_notes SET tax_type = CASE WHEN upper(gst_mode) = 'IGST' THEN 'igst' ELSE 'cgst_sgst' END
WHERE tax_type IS NULL;

-- HSN/SAC defaults
UPDATE public.invoice_items SET hsn_sac = '998365' WHERE hsn_sac IS NULL OR trim(hsn_sac) = '';
UPDATE public.invoice_line_items SET hsn_sac_code = '998365' WHERE hsn_sac_code IS NULL OR trim(hsn_sac_code) = '';

-- RE-ENABLE triggers
ALTER TABLE public.clients ENABLE TRIGGER client_audit_trigger;
ALTER TABLE public.clients ENABLE TRIGGER clients_audit_trigger;
ALTER TABLE public.clients ENABLE TRIGGER clients_search_vector_update;
ALTER TABLE public.clients ENABLE TRIGGER update_clients_updated_at;
ALTER TABLE public.invoices ENABLE TRIGGER check_invoice_overdue_on_update;
ALTER TABLE public.invoices ENABLE TRIGGER ensure_billing_month_populated;
ALTER TABLE public.invoices ENABLE TRIGGER ensure_invoice_no_populated;
ALTER TABLE public.invoices ENABLE TRIGGER trg_block_locked_invoices;
ALTER TABLE public.invoices ENABLE TRIGGER update_invoices_updated_at;
ALTER TABLE public.credit_notes ENABLE TRIGGER credit_note_apply_to_invoice;
ALTER TABLE public.credit_notes ENABLE TRIGGER validate_credit_note_trigger;
ALTER TABLE public.invoice_items ENABLE TRIGGER trg_block_locked_invoice_items;
ALTER TABLE public.invoice_line_items ENABLE TRIGGER trg_block_locked_invoice_line_items;

-- GST VIEWS

CREATE OR REPLACE VIEW public.gst_invoice_documents_v AS
SELECT
  i.company_id, i.id AS invoice_id, i.id AS invoice_no, i.invoice_date,
  EXTRACT(MONTH FROM i.invoice_date)::integer AS filing_month,
  EXTRACT(YEAR FROM i.invoice_date)::integer AS filing_year,
  i.client_id,
  COALESCE(i.client_name_snapshot, i.client_name) AS client_name,
  COALESCE(i.client_gstin_snapshot, c.gst_number) AS gstin,
  COALESCE(i.place_of_supply, c.billing_state, c.state) AS place_of_supply,
  COALESCE(i.billing_state_code_snapshot, c.state_code, public.gst_state_code(COALESCE(i.place_of_supply, c.billing_state, c.state))) AS place_of_supply_state_code,
  COALESCE(i.supplier_state_code, co.state_code) AS supplier_state_code,
  i.invoice_type,
  CASE WHEN COALESCE(i.client_gstin_snapshot, c.gst_number) IS NOT NULL AND trim(COALESCE(i.client_gstin_snapshot, c.gst_number)) != '' THEN 'B2B' ELSE 'B2C' END AS party_type,
  CASE WHEN COALESCE(i.supplier_state_code, co.state_code) IS NOT NULL
    AND COALESCE(i.billing_state_code_snapshot, c.state_code, public.gst_state_code(COALESCE(i.place_of_supply, c.billing_state, c.state))) IS NOT NULL
    AND COALESCE(i.supplier_state_code, co.state_code) = COALESCE(i.billing_state_code_snapshot, c.state_code, public.gst_state_code(COALESCE(i.place_of_supply, c.billing_state, c.state)))
    THEN 'intra' ELSE 'inter' END AS supply_nature,
  COALESCE(i.reverse_charge_applicable, false) AS reverse_charge_applicable,
  COALESCE(i.tax_type, CASE WHEN upper(i.gst_mode) = 'IGST' THEN 'igst' ELSE 'cgst_sgst' END) AS tax_type,
  i.sub_total AS taxable_value,
  COALESCE(i.cgst_amount, 0) AS cgst_amount, COALESCE(i.sgst_amount, 0) AS sgst_amount,
  COALESCE(i.igst_amount, 0) AS igst_amount, COALESCE(i.cess_amount, 0) AS cess_amount,
  COALESCE(i.round_off_amount, 0) AS round_off_amount,
  i.total_amount AS total_invoice_value,
  COALESCE(i.credited_amount, 0) AS credited_amount,
  i.status::text AS invoice_status, i.finalized_at
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id
LEFT JOIN public.companies co ON i.company_id = co.id
WHERE i.is_draft = false AND i.is_cancelled = false AND i.status::text NOT IN ('Draft', 'Cancelled');

CREATE OR REPLACE VIEW public.gst_credit_note_documents_v AS
SELECT
  cn.company_id, cn.id AS credit_note_uuid, cn.credit_note_id AS credit_note_no,
  cn.issued_at,
  EXTRACT(MONTH FROM cn.issued_at)::integer AS filing_month,
  EXTRACT(YEAR FROM cn.issued_at)::integer AS filing_year,
  cn.invoice_id, COALESCE(cn.original_invoice_no_snapshot, cn.invoice_id) AS original_invoice_no,
  cn.client_id,
  COALESCE(cn.client_name_snapshot, c.company, c.name) AS client_name,
  COALESCE(cn.client_gstin_snapshot, c.gst_number) AS gstin,
  COALESCE(cn.place_of_supply_snapshot, i.place_of_supply) AS place_of_supply,
  COALESCE(cn.supplier_state_code_snapshot, co.state_code) AS supplier_state_code,
  CASE WHEN COALESCE(cn.client_gstin_snapshot, c.gst_number) IS NOT NULL AND trim(COALESCE(cn.client_gstin_snapshot, c.gst_number)) != '' THEN 'B2B' ELSE 'B2C' END AS party_type,
  CASE WHEN COALESCE(cn.supplier_state_code_snapshot, co.state_code) IS NOT NULL
    AND COALESCE(i.billing_state_code_snapshot, c.state_code) IS NOT NULL
    AND COALESCE(cn.supplier_state_code_snapshot, co.state_code) = COALESCE(i.billing_state_code_snapshot, c.state_code)
    THEN 'intra' ELSE 'inter' END AS supply_nature,
  cn.reason,
  COALESCE(cn.tax_type, CASE WHEN upper(cn.gst_mode) = 'IGST' THEN 'igst' ELSE 'cgst_sgst' END) AS tax_type,
  cn.subtotal AS taxable_adjustment,
  COALESCE(cn.cgst_amount, 0) AS cgst_adjustment, COALESCE(cn.sgst_amount, 0) AS sgst_adjustment,
  COALESCE(cn.igst_amount, 0) AS igst_adjustment, COALESCE(cn.cess_amount, 0) AS cess_adjustment,
  cn.total_amount AS total_adjustment_value, cn.status
FROM public.credit_notes cn
LEFT JOIN public.clients c ON cn.client_id = c.id
LEFT JOIN public.invoices i ON cn.invoice_id = i.id
LEFT JOIN public.companies co ON cn.company_id = co.id
WHERE cn.status = 'Issued' AND cn.issued_at IS NOT NULL AND cn.is_cancelled = false;

CREATE OR REPLACE VIEW public.gst_b2b_v AS SELECT * FROM public.gst_invoice_documents_v WHERE party_type = 'B2B';
CREATE OR REPLACE VIEW public.gst_b2c_v AS SELECT * FROM public.gst_invoice_documents_v WHERE party_type = 'B2C';

CREATE OR REPLACE VIEW public.gst_hsn_summary_v AS
SELECT inv.company_id, inv.filing_month, inv.filing_year,
  COALESCE(ii.hsn_sac, '998365') AS hsn_sac_code, 'SAC' AS hsn_sac_type,
  MAX(ii.description) AS item_description,
  SUM(COALESCE(ii.quantity, 1)) AS total_quantity, SUM(ii.line_total) AS taxable_value,
  SUM(COALESCE(ii.cgst_amount, 0)) AS cgst_amount, SUM(COALESCE(ii.sgst_amount, 0)) AS sgst_amount,
  SUM(COALESCE(ii.igst_amount, 0)) AS igst_amount, 0::numeric AS cess_amount,
  SUM(ii.line_total + COALESCE(ii.cgst_amount,0) + COALESCE(ii.sgst_amount,0) + COALESCE(ii.igst_amount,0)) AS total_value,
  COUNT(DISTINCT inv.invoice_id) AS invoice_count
FROM public.gst_invoice_documents_v inv
JOIN public.invoice_items ii ON ii.invoice_id = inv.invoice_id
GROUP BY inv.company_id, inv.filing_month, inv.filing_year, COALESCE(ii.hsn_sac, '998365');

CREATE OR REPLACE VIEW public.gst_statewise_summary_v AS
SELECT company_id, filing_month, filing_year, place_of_supply_state_code, place_of_supply,
  SUM(CASE WHEN party_type='B2B' THEN taxable_value ELSE 0 END) AS b2b_taxable_value,
  SUM(CASE WHEN party_type='B2C' THEN taxable_value ELSE 0 END) AS b2c_taxable_value,
  SUM(taxable_value) AS total_taxable_value,
  SUM(cgst_amount) AS cgst_amount, SUM(sgst_amount) AS sgst_amount, SUM(igst_amount) AS igst_amount,
  SUM(total_invoice_value) AS total_invoice_value, COUNT(*) AS invoice_count
FROM public.gst_invoice_documents_v
GROUP BY company_id, filing_month, filing_year, place_of_supply_state_code, place_of_supply;

CREATE OR REPLACE VIEW public.gst_monthly_summary_v AS
WITH inv_agg AS (
  SELECT company_id, filing_month, filing_year,
    SUM(taxable_value) AS gross_invoice_taxable_value,
    SUM(cgst_amount) AS gross_cgst_amount, SUM(sgst_amount) AS gross_sgst_amount,
    SUM(igst_amount) AS gross_igst_amount, SUM(total_invoice_value) AS gross_total_invoice_value,
    SUM(CASE WHEN party_type='B2B' THEN taxable_value ELSE 0 END) AS b2b_taxable_value,
    SUM(CASE WHEN party_type='B2C' THEN taxable_value ELSE 0 END) AS b2c_taxable_value,
    COUNT(*) AS invoice_count
  FROM public.gst_invoice_documents_v GROUP BY company_id, filing_month, filing_year
), cn_agg AS (
  SELECT company_id, filing_month, filing_year,
    SUM(taxable_adjustment) AS cn_tax_red, SUM(cgst_adjustment) AS cn_cgst_red,
    SUM(sgst_adjustment) AS cn_sgst_red, SUM(igst_adjustment) AS cn_igst_red,
    SUM(total_adjustment_value) AS cn_total_red, COUNT(*) AS credit_note_count
  FROM public.gst_credit_note_documents_v GROUP BY company_id, filing_month, filing_year
)
SELECT i.company_id, i.filing_month, i.filing_year,
  i.gross_invoice_taxable_value, i.gross_cgst_amount, i.gross_sgst_amount, i.gross_igst_amount, i.gross_total_invoice_value,
  COALESCE(cn.cn_tax_red,0) AS credit_note_taxable_reduction,
  COALESCE(cn.cn_cgst_red,0) AS credit_note_cgst_reduction,
  COALESCE(cn.cn_sgst_red,0) AS credit_note_sgst_reduction,
  COALESCE(cn.cn_igst_red,0) AS credit_note_igst_reduction,
  COALESCE(cn.cn_total_red,0) AS credit_note_total_reduction,
  i.gross_invoice_taxable_value - COALESCE(cn.cn_tax_red,0) AS net_taxable_value,
  i.gross_cgst_amount - COALESCE(cn.cn_cgst_red,0) AS net_cgst_amount,
  i.gross_sgst_amount - COALESCE(cn.cn_sgst_red,0) AS net_sgst_amount,
  i.gross_igst_amount - COALESCE(cn.cn_igst_red,0) AS net_igst_amount,
  i.gross_total_invoice_value - COALESCE(cn.cn_total_red,0) AS net_total_value,
  i.b2b_taxable_value, i.b2c_taxable_value,
  i.invoice_count, COALESCE(cn.credit_note_count,0) AS credit_note_count
FROM inv_agg i LEFT JOIN cn_agg cn ON i.company_id=cn.company_id AND i.filing_month=cn.filing_month AND i.filing_year=cn.filing_year;

CREATE OR REPLACE VIEW public.gst_invoice_register_v AS
SELECT company_id, 'invoice'::text AS document_kind, invoice_id AS document_id,
  invoice_no AS document_no, invoice_date AS document_date, NULL::text AS original_invoice_no,
  client_id, client_name, gstin, place_of_supply, place_of_supply_state_code,
  supplier_state_code, party_type, supply_nature, tax_type, reverse_charge_applicable,
  taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount, round_off_amount,
  total_invoice_value AS total_document_value, credited_amount, invoice_status AS status,
  finalized_at, filing_month, filing_year
FROM public.gst_invoice_documents_v;

CREATE OR REPLACE VIEW public.gst_credit_note_register_v AS
SELECT company_id, 'credit_note'::text AS document_kind, credit_note_uuid::text AS document_id,
  credit_note_no AS document_no, issued_at::date AS document_date,
  original_invoice_no, client_id, client_name, gstin, place_of_supply,
  supplier_state_code, party_type, supply_nature, tax_type, reason,
  taxable_adjustment, cgst_adjustment, sgst_adjustment, igst_adjustment,
  cess_adjustment, total_adjustment_value, status, filing_month, filing_year
FROM public.gst_credit_note_documents_v;

CREATE OR REPLACE VIEW public.gst_validation_v AS
SELECT company_id, filing_month, filing_year, 'blocking'::text AS severity,
  'b2b_missing_gstin'::text AS issue_code, 'B2B invoice missing client GSTIN'::text AS issue_message,
  'invoices'::text AS source_table, invoice_id AS source_id, invoice_no AS source_document_no,
  'Add GSTIN to client or correct classification'::text AS suggested_fix
FROM public.gst_invoice_documents_v WHERE party_type='B2B' AND (gstin IS NULL OR trim(gstin)='')
UNION ALL
SELECT company_id, filing_month, filing_year, 'blocking', 'missing_place_of_supply',
  'Invoice missing place of supply', 'invoices', invoice_id, invoice_no,
  'Set place of supply or update client billing state'
FROM public.gst_invoice_documents_v WHERE place_of_supply IS NULL OR trim(place_of_supply)=''
UNION ALL
SELECT company_id, filing_month, filing_year, 'blocking', 'missing_invoice_number',
  'Finalized invoice has no number', 'invoices', invoice_id, invoice_no, 'Re-finalize invoice'
FROM public.gst_invoice_documents_v WHERE invoice_no IS NULL OR trim(invoice_no)=''
UNION ALL
SELECT company_id, filing_month, filing_year, 'blocking', 'missing_tax_breakup',
  'Taxable value present but all tax zero', 'invoices', invoice_id, invoice_no, 'Verify GST rate'
FROM public.gst_invoice_documents_v WHERE taxable_value > 0 AND cgst_amount=0 AND sgst_amount=0 AND igst_amount=0
UNION ALL
SELECT d.company_id, d.filing_month, d.filing_year, 'blocking', 'duplicate_invoice_number',
  'Duplicate: '||d.invoice_no, 'invoices', d.invoice_id, d.invoice_no, 'Fix duplicate'
FROM public.gst_invoice_documents_v d
JOIN (SELECT company_id, invoice_no FROM public.gst_invoice_documents_v GROUP BY company_id, invoice_no HAVING COUNT(*)>1) dup ON d.company_id=dup.company_id AND d.invoice_no=dup.invoice_no
UNION ALL
SELECT d.company_id, d.filing_month, d.filing_year, 'blocking', 'duplicate_credit_note_number',
  'Duplicate CN: '||d.credit_note_no, 'credit_notes', d.credit_note_uuid::text, d.credit_note_no, 'Fix duplicate'
FROM public.gst_credit_note_documents_v d
JOIN (SELECT company_id, credit_note_no FROM public.gst_credit_note_documents_v GROUP BY company_id, credit_note_no HAVING COUNT(*)>1) dup ON d.company_id=dup.company_id AND d.credit_note_no=dup.credit_note_no
UNION ALL
SELECT cn.company_id, EXTRACT(MONTH FROM cn.issued_at)::integer, EXTRACT(YEAR FROM cn.issued_at)::integer,
  'blocking', 'credit_note_linked_to_draft', 'CN linked to draft invoice: '||cn.invoice_id,
  'credit_notes', cn.id::text, cn.credit_note_id, 'Finalize linked invoice'
FROM public.credit_notes cn JOIN public.invoices i ON cn.invoice_id=i.id
WHERE cn.status='Issued' AND cn.issued_at IS NOT NULL AND i.is_draft=true
UNION ALL
SELECT company_id, filing_month, filing_year, 'warning', 'invalid_gstin_format',
  'Invalid GSTIN: '||gstin, 'invoices', invoice_id, invoice_no, 'Verify 15-char GSTIN format'
FROM public.gst_invoice_documents_v WHERE gstin IS NOT NULL AND trim(gstin)!='' AND (length(trim(gstin))!=15 OR trim(gstin) !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$')
UNION ALL
SELECT DISTINCT inv.company_id, inv.filing_month, inv.filing_year, 'warning', 'missing_hsn_sac',
  'Items without HSN/SAC', 'invoices', inv.invoice_id, inv.invoice_no, 'Add SAC 998365'
FROM public.gst_invoice_documents_v inv JOIN public.invoice_items ii ON ii.invoice_id=inv.invoice_id WHERE ii.hsn_sac IS NULL OR trim(ii.hsn_sac)=''
UNION ALL
SELECT company_id, filing_month, filing_year, 'warning', 'negative_taxable_value',
  'Negative taxable: '||taxable_value::text, 'invoices', invoice_id, invoice_no, 'Review amounts'
FROM public.gst_invoice_documents_v WHERE taxable_value < 0
UNION ALL
SELECT company_id, filing_month, filing_year, 'warning', 'missing_finalized_at',
  'Missing finalized_at', 'invoices', invoice_id, invoice_no, 'Backfill finalized_at'
FROM public.gst_invoice_documents_v WHERE finalized_at IS NULL
UNION ALL
SELECT i.company_id, EXTRACT(MONTH FROM i.invoice_date)::integer, EXTRACT(YEAR FROM i.invoice_date)::integer,
  'warning', 'credited_amount_mismatch',
  'credited_amount('||COALESCE(i.credited_amount,0)::text||') != CN sum('||COALESCE(s.t,0)::text||')',
  'invoices', i.id, i.id, 'Reconcile'
FROM public.invoices i
LEFT JOIN (SELECT invoice_id, SUM(total_amount) AS t FROM public.credit_notes WHERE status='Issued' AND is_cancelled=false GROUP BY invoice_id) s ON i.id=s.invoice_id
WHERE i.is_draft=false AND i.is_cancelled=false AND i.status::text NOT IN ('Draft','Cancelled') AND COALESCE(i.credited_amount,0)!=COALESCE(s.t,0);
