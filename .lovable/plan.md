

## Plan: Update Billing UI Labels to Reflect Final Negotiated Price

### Current State (Already Correct)
The **calculation logic is already using the negotiated/final price**. Both `computeCampaignTotals` (line 143) and `calculatePeriodAmountAssetWise` (line 322) use:
```
const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
```
This means `negotiated_rate` is always prioritized. The per-day rate and cycle billing allocation are already derived from the final negotiated price. **No formula changes needed.**

### What Needs Changing (Labels Only)
The UI labels are misleading — they say "Display Cost" and "Base Rent", which imply rate-card pricing. These need renaming:

| File | Current Label | New Label |
|------|--------------|-----------|
| `BillingSummaryCard.tsx` line 112 | "Display Cost" | "Final Amount (Before GST)" |
| `BillingSummaryCard.tsx` line 210 | "Monthly Rent" | "Monthly Amount" |
| `MonthlyBillingScheduleTable.tsx` line 104 | "Base Rent" | "Client Approved Amount" |

### Changes

**`src/components/campaigns/billing/BillingSummaryCard.tsx`**
- Line 112: Rename "Display Cost" → "Final Amount (Before GST)"
- Line 210: Rename "Monthly Rent" → "Monthly Amount"

**`src/components/campaigns/billing/MonthlyBillingScheduleTable.tsx`**
- Line 104: Rename column header "Base Rent" → "Client Approved Amount"

### What is NOT changed
- `CampaignTotalsResult` interface field names (`displayCost`, `monthlyDisplayRent`) — renaming these would break many consumers
- Stored historical data — untouched
- Existing invoices — untouched
- Pricing structure and discount logic — untouched
- Calculation formulas — already correct, using negotiated_rate first

### Safety
This is a pure label rename. Zero logic changes. All calculations already use the final negotiated price.

