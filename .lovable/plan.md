

## Fix: Payments Tab Ignoring Credit Notes in Balance Calculation

### Problem
The Payments tab on INV/2025-26/0057 shows Balance Due ₹11,214.62 and status "Partial", even though:
- The database correctly shows `balance_due: 0.00`, `credited_amount: 22,814.14`, `status: Paid`
- The Credit Notes tab correctly shows "Total Applied: ₹11,407.08"
- The header correctly shows "Effective Balance: ₹0" and "Paid"

### Root Cause
In `PaymentRecordingPanel.tsx` (line 169), the balance is computed client-side as:
```
balance = totalAmount - (totalPaid + totalTds)
       = 175,230 - (161,045 + 2,970) = 11,215
```

This calculation **completely ignores `credited_amount`**. The component receives `balanceDue` as a prop (which is 0 from the DB) but never uses it — it always recomputes from payment records only.

### Fix (1 file)

**`src/components/finance/PaymentRecordingPanel.tsx`**

1. Add `creditedAmount` prop to the interface and pass it from `InvoiceDetail.tsx`
2. Include credited amount in the balance calculation:
```typescript
const totalCredited = creditedAmount || 0;
const totalSettled = totalPaid + totalTds + totalCredited;
const balance = Math.max(totalAmount - totalSettled, 0);
```
3. Display credited amount in the summary cards (between TDS Deducted and Balance Due)
4. Factor credits into payment progress percentage

**`src/pages/InvoiceDetail.tsx`**

5. Pass `creditedAmount={invoice.credited_amount || 0}` to `PaymentRecordingPanel`

### Impact
- Balance Due will correctly show ₹0 after credits are applied
- Status badge in Payments tab will reflect the actual DB status
- No database changes needed — the DB already has correct values

