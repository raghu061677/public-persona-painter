

## Minor Refinements to Already-Implemented Cancel Invoice + Generate Button

Both core fixes are already in place from the previous implementation round. Only two small refinements remain:

### Refinement 1: Improve cancellation note user identifier
**File**: `src/pages/InvoiceDetail.tsx`

Currently the note says `[Cancelled on 2026-04-08 by admin]`. Enhance to include the user's email when available for better audit trail: `[Cancelled on 2026-04-08 by admin (user@example.com)]`.

In `checkAdminStatus` (line 62-73): store the user's email alongside the role. In `handleCancelInvoice` (line 236): use `${userRole} (${userEmail})` or fall back to just the role if email is unavailable.

Also update line 238 wording from `"Replaced by: (to be generated from campaign billing tab)"` to `"Replaced by: pending regeneration"`.

### Refinement 2: No changes needed to CampaignBillingTab.tsx
The generate button logic on line 712 already correctly filters out Cancelled invoices. Cancelled invoices remain visible in the list (line 655-709) with greyed-out styling and destructive badge. No further changes required.

### Already implemented (no changes needed)
- Status pre-check inside `handleCancelInvoice` (line 206)
- `paid_amount > 1` check (line 210)
- `payment_records` existence check (line 214-220)
- `credit_notes` existence check (line 223-229)
- Append-only notes logic (line 240-242)
- Cancel dialog with required reason textarea
- Button visibility guard for terminal statuses

### Summary
Only `InvoiceDetail.tsx` needs a 3-line tweak: store user email, include it in the note, and update the "Replaced by" wording.

