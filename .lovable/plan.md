

## Fix: New Invoice INV/2026-27/0011 Showing Old Payment Data

### Problem

Invoice **INV/2026-27/0011** (campaign CAM-202604-0012, ZEN Diamond) was just created but shows a ₹4,24,800 payment in the Payments section. This payment actually belongs to **INV/2025-26/0069** (campaign CAM-2025-December-001, client TG-0088).

**Root cause**: Payment record `aaea64f9-bc57-48a1-9710-c8f750e948d1` has its `invoice_id` incorrectly set to `INV/2026-27/0011` instead of `INV/2025-26/0069`. This is a data-level issue — the payment was linked to the wrong invoice ID.

Additionally, the invoice has `invoice_no = 'DRAFT-1775655385855-740'` instead of the finalized ID.

### Fix 1: Correct the mislinked payment record (Data fix)

Run a migration to reassign the payment record to its correct invoice:

```sql
-- Fix mislinked payment: move from INV/2026-27/0011 back to INV/2025-26/0069
UPDATE public.payment_records
SET invoice_id = 'INV/2025-26/0069'
WHERE id = 'aaea64f9-bc57-48a1-9710-c8f750e948d1'
  AND invoice_id = 'INV/2026-27/0011';

-- Recalculate INV/2026-27/0011 balance (no payments, full balance)
UPDATE public.invoices
SET paid_amount = 0,
    balance_due = total_amount,
    status = 'Sent',
    updated_at = now()
WHERE id = 'INV/2026-27/0011';

-- Fix DRAFT invoice_no
UPDATE public.invoices
SET invoice_no = id
WHERE id = 'INV/2026-27/0011' AND invoice_no LIKE 'DRAFT-%';
```

### Fix 2: Prevent future DRAFT invoice_no persistence

**File**: The monthly invoice generation code (or the auto-generate edge function) should finalize the `invoice_no` field. Check if the `invoice_no` is being set to a DRAFT placeholder during creation and never updated.

This is likely in the monthly billing generation path — I'll verify and patch the code that creates monthly invoices to always set `invoice_no = id` after the final ID is assigned.

### What stays untouched
- No schema changes
- No finance engine changes
- No preview/template changes
- No cancellation workflow changes

### Expected Result
- INV/2026-27/0011 shows ₹0 paid, full balance of ₹1,31,159.36, status "Sent"
- INV/2025-26/0069 retains its ₹4,24,800 payment correctly
- Invoice number displays properly (not DRAFT)

