

## Plan: Enhanced Cancel Invoice + Show Generate Button After Cancellation

### Two issues to fix:

**Issue 1: Cancel Invoice needs enhanced metadata**

The current `handleCancelInvoice` in `InvoiceDetail.tsx` (line 223) appends:
```
[CANCELLED 4/8/2026]: reason text
```

Needs to be enhanced to:
```
[Cancelled on 2026-04-08 by admin]
Reason: Wrong pricing — 90-day calculation instead of 42-day
Replaced by: (to be generated from campaign billing tab)
```

Also needs: paid_amount check (currently only checks `(invoice.paid_amount || 0) <= 1` in the button visibility but not inside `handleCancelInvoice` itself), and status pre-check inside the handler.

**Changes in `src/pages/InvoiceDetail.tsx`**:
- Update line 222-223 to format the cancellation note with ISO date, user role info, and structured format
- Add paid_amount and status validation inside `handleCancelInvoice` (before the DB calls)
- Fetch current user info to include in the note

**Issue 2: "Generate Single Invoice" button hidden when cancelled invoice exists**

In `CampaignBillingTab.tsx`, line 654-707: the generate button only shows when `singleInvoices.length === 0`. After cancelling INV/2025-26/0022, it still appears in `singleInvoices` (status=Cancelled), so the button stays hidden.

**Changes in `src/components/campaigns/billing/CampaignBillingTab.tsx`**:
- Filter out Cancelled invoices from `singleInvoices` when deciding whether to show the "Generate Single Invoice" button
- Specifically: change the condition on line 707 from `singleInvoices.length > 0` to check for active (non-cancelled) invoices
- Keep cancelled invoices visible in the list (greyed out) for audit trail, but show the generate button if all single invoices are cancelled

### What stays untouched
- No schema changes
- No finance engine changes
- No credit note flow changes
- No draft delete changes
- Monthly invoice generator unchanged

