

## Two Targeted Enhancements: TDS Display + Coverage Logic Comments

### Task 1: Show TDS Details for Paid Invoices in Billing Tab

**File**: `src/components/campaigns/billing/CampaignBillingTab.tsx`

The `payment_records` table already has `tds_amount`, `tds_rate`, and `amount` columns. Changes:

1. **Expand the payment fetch** to include `tds_amount, tds_rate, amount` alongside the existing `invoice_id, payment_date`
2. **Replace the simple `paymentDates` map** with a richer `paymentSummaries` map containing payment date, TDS amount, TDS rate, and net received (aggregated across multiple payment records per invoice)
3. **Render TDS info** below the existing "Paid on" line, conditionally:
   - "TDS Deducted: ₹X,XXX.XX" — only when `tds_amount > 0`
   - "TDS Rate: X%" — only when `tds_rate` is available
   - "Net Received: ₹X,XXX.XX" — sum of `amount` field from payment records
   - Uses small muted text styling consistent with existing finance UI

### Task 2: Document Coverage Priority Logic

**File**: `src/utils/campaignInvoiceStatus.ts`

The `extractInvoicedMonths` function **already implements the correct 3-tier priority**:
1. Item-level booking dates → 2. Header-level period dates → 3. `billing_month` fallback

**Change**: Add explicit documentation comments explaining this priority order and why it prevents false overdue for cross-month campaigns. No logic changes needed.

### What stays untouched
- No schema changes
- No finance calculation changes
- No billing engine rebuild
- Invoice totals, GST, payment logic all unchanged
- Display-only enhancement using existing data

