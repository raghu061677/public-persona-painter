

## Plan: Fix Duplicate Key Constraint Error on Monthly Invoice Re-generation

### Problem
Campaign CAM-202604-0016 has a **Cancelled** invoice (`INV/2026-27/0012`) for `billing_month = '2026-04'`. When trying to generate a new invoice for the same month, the unique constraint `idx_invoices_unique_monthly_billing` blocks the insert because it doesn't exclude cancelled/void invoices.

### Root Cause
The database unique index:
```sql
CREATE UNIQUE INDEX idx_invoices_unique_monthly_billing 
ON public.invoices (company_id, campaign_id, billing_month) 
WHERE (campaign_id IS NOT NULL AND billing_month IS NOT NULL AND company_id IS NOT NULL)
```
...does **not** filter out `Cancelled` or `Void` status invoices. So a cancelled invoice still "occupies" the unique slot.

### Fix (2 changes)

**1. Database Migration — Update the unique index to exclude cancelled/void invoices**

```sql
DROP INDEX IF EXISTS idx_invoices_unique_monthly_billing;

CREATE UNIQUE INDEX idx_invoices_unique_monthly_billing 
ON public.invoices (company_id, campaign_id, billing_month) 
WHERE (
  campaign_id IS NOT NULL 
  AND billing_month IS NOT NULL 
  AND company_id IS NOT NULL 
  AND status NOT IN ('Cancelled', 'Void')
);
```

This is safe — it only loosens the constraint to allow re-generation after cancellation.

**2. `src/components/campaigns/billing/CampaignBillingTab.tsx` — Fix app-level duplicate check**

Update the `existingInvoice` check (around line 354) to exclude `Cancelled` and `Void` statuses, so the app doesn't try to update a cancelled invoice:

```typescript
const existingInvoice = existingInvoices
  .filter(inv => !['Cancelled', 'Void'].includes(inv.status))
  .find(inv => {
    if (inv.billing_month) {
      return inv.billing_month === period.monthKey;
    }
    const invStart = inv.invoice_period_start;
    const periodStartStr = format(period.periodStart, 'yyyy-MM-dd');
    return invStart === periodStartStr;
  });
```

### What Stays Unchanged
- No existing invoice data modified
- Asset Cycle Billing untouched
- Single Invoice mode untouched
- No finance calculations changed

### Files Changed
- Database migration (new index definition)
- `src/components/campaigns/billing/CampaignBillingTab.tsx` (duplicate check filter)

