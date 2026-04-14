DROP INDEX IF EXISTS idx_invoices_unique_monthly_billing;

CREATE UNIQUE INDEX idx_invoices_unique_monthly_billing 
ON public.invoices (company_id, campaign_id, billing_month) 
WHERE (
  campaign_id IS NOT NULL 
  AND billing_month IS NOT NULL 
  AND company_id IS NOT NULL 
  AND status != 'Cancelled'
);