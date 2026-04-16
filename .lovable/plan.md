

## Root Cause Analysis

Two data inconsistencies between Dashboard ("Available Assets: 71") and Vacant Media Report ("Vacant Now: 67"):

### Issue 1: `operational_status` filter missing in edge function
- **Dashboard** filters `media_assets` by `operational_status = 'active'` (110 assets total)
- **Vacant Media edge function** (`get-media-availability`) does **NOT** filter by `operational_status`, so it includes 3 "removed" assets (113 total)
- This means the totals start from different bases (110 vs 113)

### Issue 2: `asset_holds` not checked in edge function
- **Dashboard** checks BOTH `campaign_assets` AND `asset_holds` (with `status = 'ACTIVE'`) overlapping today to determine booked count
- **Vacant Media edge function** only checks `campaign_assets` — it completely ignores `asset_holds`
- Assets that are held but not campaign-booked show as "Available" in the report but "Booked" on the dashboard

### Issue 3: Date range difference (expected, but worth noting)
- Dashboard checks availability for **today only**
- Vacant Media checks for a **date range** (e.g., Apr 16 – May 16)
- This can cause legitimate differences when assets have future bookings within the range but not today

## Plan

### Step 1: Fix the edge function `get-media-availability/index.ts`

**A.** Add `operational_status = 'active'` filter to the assets query (line ~186):
```typescript
.eq('operational_status', 'active')
```

**B.** Add `asset_holds` overlap check alongside `campaign_assets`:
- Query `asset_holds` where `status = 'ACTIVE'` and dates overlap the requested range
- Merge held asset intervals into the `assetBookingsMap` so held assets are classified as "booked"

### Step 2: Deploy updated edge function

No other files need changes. The dashboard logic is already correct. This fix aligns the vacant media report with the dashboard's data source.

### Files Changed
- `supabase/functions/get-media-availability/index.ts` — add `operational_status` filter + `asset_holds` overlap

### What stays unchanged
- Dashboard.tsx (already correct)
- All other reports and exports
- Summary/reconciliation sheets in GSTR-1

