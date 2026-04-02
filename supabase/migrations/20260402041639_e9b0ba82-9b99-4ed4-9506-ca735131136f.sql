
CREATE OR REPLACE VIEW public.gst_validation_v AS
-- B2B missing GSTIN
SELECT company_id, filing_month, filing_year,
  'blocking'::text AS severity,
  'b2b_missing_gstin'::text AS issue_code,
  'B2B invoice missing client GSTIN'::text AS issue_message,
  'invoices'::text AS source_table,
  invoice_id AS source_id,
  invoice_no AS source_document_no,
  'Add GSTIN to client or correct classification'::text AS suggested_fix
FROM gst_invoice_documents_v
WHERE party_type = 'B2B' AND (gstin IS NULL OR TRIM(gstin) = '')

UNION ALL
-- Missing place of supply
SELECT company_id, filing_month, filing_year,
  'blocking', 'missing_place_of_supply',
  'Invoice missing place of supply', 'invoices',
  invoice_id, invoice_no,
  'Set place of supply or update client billing state'
FROM gst_invoice_documents_v
WHERE place_of_supply IS NULL OR TRIM(place_of_supply) = ''

UNION ALL
-- Missing invoice number
SELECT company_id, filing_month, filing_year,
  'blocking', 'missing_invoice_number',
  'Finalized invoice has no number', 'invoices',
  invoice_id, invoice_no,
  'Re-finalize invoice'
FROM gst_invoice_documents_v
WHERE invoice_no IS NULL OR TRIM(invoice_no) = ''

UNION ALL
-- Missing tax breakup: only flag when total > taxable (tax was charged) but split is zero
SELECT company_id, filing_month, filing_year,
  'blocking', 'missing_tax_breakup',
  'Taxable value present but all tax split fields zero', 'invoices',
  invoice_id, invoice_no,
  'Verify GST rate and populate CGST/SGST/IGST'
FROM gst_invoice_documents_v
WHERE taxable_value > 0
  AND total_invoice_value > taxable_value
  AND cgst_amount = 0 AND sgst_amount = 0 AND igst_amount = 0

UNION ALL
-- Duplicate invoice number
SELECT d.company_id, d.filing_month, d.filing_year,
  'blocking', 'duplicate_invoice_number',
  'Duplicate: ' || d.invoice_no, 'invoices',
  d.invoice_id, d.invoice_no, 'Fix duplicate'
FROM gst_invoice_documents_v d
JOIN (
  SELECT company_id, invoice_no FROM gst_invoice_documents_v
  GROUP BY company_id, invoice_no HAVING count(*) > 1
) dup ON d.company_id = dup.company_id AND d.invoice_no = dup.invoice_no

UNION ALL
-- Duplicate credit note number
SELECT d.company_id, d.filing_month, d.filing_year,
  'blocking', 'duplicate_credit_note_number',
  'Duplicate CN: ' || d.credit_note_no, 'credit_notes',
  d.credit_note_uuid::text, d.credit_note_no, 'Fix duplicate'
FROM gst_credit_note_documents_v d
JOIN (
  SELECT company_id, credit_note_no FROM gst_credit_note_documents_v
  GROUP BY company_id, credit_note_no HAVING count(*) > 1
) dup ON d.company_id = dup.company_id AND d.credit_note_no = dup.credit_note_no

UNION ALL
-- Credit note linked to draft invoice
SELECT cn.company_id,
  EXTRACT(MONTH FROM cn.issued_at)::int, EXTRACT(YEAR FROM cn.issued_at)::int,
  'blocking', 'credit_note_linked_to_draft',
  'Issued CN linked to draft invoice', 'credit_notes',
  cn.credit_note_uuid::text, cn.credit_note_no,
  'Finalize the linked invoice first'
FROM gst_credit_note_documents_v cn
JOIN invoices i ON cn.invoice_id = i.id
WHERE i.is_draft = true

UNION ALL
-- WARNING: invalid GSTIN format
SELECT company_id, filing_month, filing_year,
  'warning', 'invalid_gstin_format',
  'GSTIN format invalid', 'invoices',
  invoice_id, invoice_no,
  'Correct GSTIN to 15-char alphanumeric'
FROM gst_invoice_documents_v
WHERE gstin IS NOT NULL AND TRIM(gstin) != ''
  AND gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'

UNION ALL
-- WARNING: missing HSN/SAC on invoice items
SELECT DISTINCT d.company_id, d.filing_month, d.filing_year,
  'warning', 'missing_hsn_sac',
  'Invoice item missing HSN/SAC code', 'invoice_items',
  d.invoice_id, d.invoice_no,
  'Add HSN/SAC code (998365 for advertising)'
FROM gst_invoice_documents_v d
JOIN invoice_items ii ON ii.invoice_id = d.invoice_id
WHERE ii.hsn_sac IS NULL OR TRIM(ii.hsn_sac) = ''

UNION ALL
-- WARNING: finalized invoice missing finalized_at
SELECT company_id, filing_month, filing_year,
  'warning', 'missing_finalized_at',
  'Finalized invoice missing finalized_at timestamp', 'invoices',
  invoice_id, invoice_no,
  'Set finalized_at from updated_at'
FROM gst_invoice_documents_v
WHERE finalized_at IS NULL;
