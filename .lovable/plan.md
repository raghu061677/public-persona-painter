

# Fix: Dropped Assets Not Excluded from Availability & Conflict Checks

## Problem
Asset **MNS-HYD-BQS-0045** was dropped from the Akriti campaign (`is_removed = true`), and `media_assets.status` is correctly set to "Available". However, **two critical SQL functions** do not filter out dropped (`is_removed = true`) campaign_assets rows:

1. **`fn_media_availability_range`** — Powers the Vacant Media Report. Its `valid_bookings` CTE (line 295-310) has no `is_removed` filter, so the dropped Akriti booking (Mar 22 – Apr 5) still counts as an active booking. The asset shows as "BOOKED_THROUGH_RANGE" instead of "VACANT_NOW".

2. **`check_asset_conflict`** — Powers conflict detection in plan/campaign asset pickers. Also missing `is_removed` filter, so dropped assets still trigger false conflict warnings.

## Fix (Single Migration)

### 1. Update `fn_media_availability_range`
Add `AND COALESCE(ca.is_removed, false) = false` to the `valid_bookings` CTE, right after the existing WHERE conditions (around line 309).

### 2. Update `check_asset_conflict`
Add `AND COALESCE(ca.is_removed, false) = false` to both SELECT clauses inside the function (the EXISTS check and the jsonb_agg subquery).

### 3. Sync `media_assets.status` for MNS-HYD-BQS-0045
Run `syncMediaAssetBookingState` after the migration to ensure the cached status field is correct (it already shows "Available", so this is just a safety step).

## Impact
- Dropped assets will correctly appear as "Available" in the Vacant Media Report
- Dropped assets will no longer trigger false conflict warnings in asset pickers
- No changes to existing non-dropped bookings
- No frontend code changes needed

## Technical Detail
Both functions will add a single line filter:
```sql
AND COALESCE(ca.is_removed, false) = false
```

