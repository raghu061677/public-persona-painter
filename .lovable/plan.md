

## Fix: Cancel INV/2025-26/0022 + Add Cancel Button for Unpaid Finalized Invoices

### Current State

- **INV/2025-26/0022**: Status "Overdue", total ₹1,85,850 (wrong), zero payments, zero credit notes, zero TDS
- **Problem**: The invoice detail page only allows deleting **Draft** invoices. Finalized invoices (like this one with status "Overdue") have no cancel/void option — only "Credit Note" is available
- The system already recognizes "Cancelled" as a valid status (excluded from receivables, aging, dashboards, reminders everywhere)

### Solution: Add "Cancel Invoice" button for unpaid finalized invoices

**File**: `src/pages/InvoiceDetail.tsx`

**Safety checks before allowing cancel**:
1. Invoice must be finalized (not draft)
2. `paid_amount` must be 0 (or negligible ≤ ₹1)
3. No linked payment records (query `payment_records` table)
4. No linked credit notes (query `credit_notes` table)
5. User must be admin/finance role

**UI placement**: Next to the existing "Credit Note" button, add a "Cancel Invoice" button (destructive variant) that:
1. Shows a confirmation dialog explaining the action
2. Requires a cancellation reason (textarea)
3. On confirm: updates `invoices` set `status = 'Cancelled'`, `balance_due = 0`, and stores the reason in `notes` field
4. Logs the action for audit trail

**Code changes**:

1. Add a `handleCancelInvoice` function:
   - Verify no payments exist (`payment_records` where `invoice_id = id`)
   - Verify no credit notes exist (`credit_notes` where `invoice_id = id`)
   - Update invoice: `status: 'Cancelled'`, `balance_due: 0`
   - Append cancellation reason to notes

2. Add cancel button in the action bar (line ~285):
   ```tsx
   {isAdmin && isFinalized && invoice.status !== 'Cancelled' && 
    invoice.status !== 'Paid' && invoice.status !== 'Fully Credited' && (
     <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
       Cancel Invoice
     </Button>
   )}
   ```

3. Add a simple confirmation dialog with reason input

### What stays untouched
- No schema changes
- No finance calculation changes
- No billing engine changes
- Existing "Cancelled" status handling throughout the app already works (excluded from receivables, aging, dashboards)
- Draft delete flow unchanged
- Credit note flow unchanged

### After the fix
1. Go to INV/2025-26/0022 detail page
2. Click "Cancel Invoice", provide reason ("Wrong pricing — 90-day calculation instead of 42-day")
3. Invoice becomes Cancelled, excluded from overdue/receivables
4. Regenerate correct invoice from CAM-202602-0015 billing tab (will use the fixed rent_amount logic)

