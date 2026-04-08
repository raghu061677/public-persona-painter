

## Fix: INV/2025-26/0022 Wrong Pricing (90 Days / ₹0 Display / ₹1,85,850 Total)

### Root Cause Analysis

**Campaign**: CAM-202602-0015 (Kidzonia, Feb 18 – Mar 31, 2026, 42 days)
**Asset**: HYD-BQS-0030, negotiated_rate ₹52,500/month, rent_amount ₹73,500

The `campaign_assets` record has **two conflicting date sets**:
- `end_date: 2026-05-18` (stale/wrong — possibly from original plan)
- `booking_end_date: 2026-03-31` and `effective_end_date: 2026-03-31` (correct)

**Bug in `handleGenerateSingleInvoice`** (line 242):
```typescript
booking_end_date: ca.booking_end_date || ca.end_date,
```
This correctly falls back — but the **pricing on line 222** is the real problem:
```typescript
const rentAmt = ca.negotiated_rate || ca.card_rate || 0; // = 52,500 (monthly rate, not actual rent)
```
It uses the monthly rate as the line total instead of using `ca.rent_amount` (73,500) which is the actual prorated rent for 42 days.

Then the invoice total becomes: 52,500 × 1 + GST... but wait, the DB shows `total_amount: 185,850` and `sub_total` presumably `157,500` (52,500 × 3). This means the invoice was generated when the asset still had wrong dates (90 days = 3 months × 52,500 = 157,500 + 18% GST = 185,850).

**Two problems to fix:**

### Problem 1: Invoice item pricing uses monthly rate instead of rent_amount

**File**: `src/components/campaigns/billing/CampaignBillingTab.tsx`, line 222

The code uses `ca.negotiated_rate` (the monthly rate) as the display/line amount. It should use `ca.rent_amount` which is the actual calculated rent for the booked period.

**Fix** (line 222):
```typescript
// BEFORE:
const rentAmt = ca.negotiated_rate || ca.card_rate || 0;

// AFTER:
const rentAmt = ca.rent_amount || ca.negotiated_rate || ca.card_rate || 0;
```

This prioritizes the pre-calculated `rent_amount` (which accounts for prorated days) over the raw monthly rate.

### Problem 2: Item booking dates should prefer effective/booking dates over raw dates

**File**: Same file, lines 241-242

Already correct with fallback, but should also prefer `effective_end_date`:
```typescript
// BEFORE:
booking_start_date: ca.booking_start_date || ca.start_date,
booking_end_date: ca.booking_end_date || ca.end_date,

// AFTER:
booking_start_date: ca.effective_start_date || ca.booking_start_date || ca.start_date,
booking_end_date: ca.effective_end_date || ca.booking_end_date || ca.end_date,
```

### Problem 3: Item display_rate field

Line 246-247 should also include the `display_rate` or `unit_price` using `rent_amount`:
```typescript
rate: rentAmt,
rent_amount: rentAmt,
display_rate: ca.negotiated_rate || ca.card_rate || 0, // keep monthly rate as display reference
```

### Problem 4: Existing invoice INV/2025-26/0022 has wrong data

This invoice was already generated with wrong amounts (₹1,85,850 based on 90-day/3-month pricing). Since it's in "Overdue" status (not Paid), it needs manual correction:

**Option A (recommended)**: The user should delete/regenerate this invoice from the campaign billing tab after the code fix, so it picks up correct 42-day pricing (₹73,500 + GST = ₹86,730).

**Option B**: A targeted SQL update to fix the existing invoice items and totals. But this is risky without user confirmation.

### Also fix: campaign_assets.end_date discrepancy

The `campaign_assets` record has `end_date: 2026-05-18` which conflicts with `booking_end_date: 2026-03-31`. This stale `end_date` is what caused the original invoice to show 90 days. This should be corrected via a targeted DB update.

### Summary of changes

| File | Change |
|------|--------|
| `CampaignBillingTab.tsx` line 222 | Prioritize `rent_amount` over `negotiated_rate` |
| `CampaignBillingTab.tsx` lines 241-242 | Add `effective_start/end_date` to priority chain |

### What stays untouched
- No schema changes
- No billing engine rebuild
- No changes to monthly invoice generator
- GST calculation logic unchanged
- Existing paid invoices unaffected

### After code fix
User should regenerate INV/2025-26/0022 from the campaign billing tab to get correct amounts (₹86,730 instead of ₹1,85,850).

