

## Audit Findings

### Asset: MNS-HYD-BQS-0073 (internal ID: HYD-BQS-0070, Miyapur)

**Database reality:**
1. **GRT Jewellers (Renewal)** — `is_removed: true`, effective dates Apr 1-2 only, campaign status "Running" but asset was **dropped**
2. **Hilife-April 10-12** — effective dates Apr 5-12, campaign status "Completed"
3. Asset is genuinely **vacant from Apr 13** onwards

**Vacant Media Report** — correctly shows this asset as available from 13/04/2026.

**Booked Media Report** — **incorrectly** shows the GRT Jewellers row because:
- It does NOT filter out `is_removed = true` (dropped assets)
- It does NOT use `effective_start_date` / `effective_end_date` (authoritative dates) — instead uses `booking_start_date` which shows full Apr 1-30 range
- Result: a dropped asset appears as "Running" for the full month

### Root Causes (2 bugs in `ReportBookedMedia.tsx`)

| Bug | Current Behavior | Correct Behavior |
|-----|-----------------|------------------|
| **1. No `is_removed` filter** | All campaign_assets rows shown, including dropped ones | Exclude `is_removed = true` rows from the report |
| **2. Wrong date priority** | Uses `booking_start_date` / `booking_end_date` first | Must use `effective_start_date` / `effective_end_date` first (per `resolveAssetBookingWindow` hierarchy) |

### Files to Edit

**`src/pages/ReportBookedMedia.tsx`** — the only file needing changes:
1. Add `.eq("is_removed", false)` to the Supabase query (line ~183) to exclude dropped assets
2. Add `effective_start_date, effective_end_date` to the select fields
3. Update date resolution (line ~222-223) to follow the authoritative hierarchy: `effective_start_date` > `booking_start_date` > `start_date` > `campaign.start_date`

### No other files affected
- Vacant Media Report: already correct
- No schema changes needed
- No finance/export/template changes

### Scope
- Single file edit in `ReportBookedMedia.tsx`
- Fixes all assets globally, not just this one

