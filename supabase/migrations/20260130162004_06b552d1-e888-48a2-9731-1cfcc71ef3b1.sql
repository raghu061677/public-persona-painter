-- Add template fields to invoices table (backward compatible)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS pdf_template_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pdf_template_version INTEGER DEFAULT 1;

-- Add index for template queries
CREATE INDEX IF NOT EXISTS idx_invoices_pdf_template_key ON invoices(pdf_template_key);

-- Add comment explaining the logic
COMMENT ON COLUMN invoices.pdf_template_key IS 'Template key for PDF generation. NULL or default_existing uses the existing template.';
COMMENT ON COLUMN invoices.pdf_template_version IS 'Version of the template used for this invoice';