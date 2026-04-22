

## Goal
Fix incorrect "Available" labels on `/admin/media-assets` for assets that are operationally Removed / Under Maintenance / Inactive / manually Blocked, by adding an operational override in the enrichment step. Logic-only patch — no UI restructure, no new queries.

## Root cause (already confirmed)
In `src/pages/MediaAssetsControlCenter.tsx`, enrichment defaults to `Available` whenever there is no overlapping campaign or hold — ignoring `media_assets.operational_status` and the manual `status` field. Affected examples: `MNS-HYD-BQS-0047`, `MNS-HYD-BQS-0075`, `MNS-HYD-BQS-0090` (all `operational_status = removed`).

## Resolution priority (applied per asset, in order)
1. Active **campaign** overlapping today → `Booked` (keep end date)
2. Active **hold** overlapping today → `Held` (keep end date)
3. `operational_status === 'removed'` → `Removed` (red, no end date, no next-available)
4. `operational_status === 'maintenance'` OR stored `status === 'Under Maintenance'` → `Under Maintenance` (amber)
5. `operational_status === 'inactive'` → `Inactive` (gray)
6. Stored `status === 'Blocked'` (no campaign/hold) → `Blocked`
7. Otherwise → `Available`

When override fires (3–6): set `current_end_date = null`, `next_available_date = null`. **Future** campaigns/holds remain in `next_*` fields so the hover card still shows "Next Booking" / "Upcoming Hold".

## Files to change (3 only)

### 1. `src/pages/MediaAssetsControlCenter.tsx`
- After the existing `current` / `next` resolution and before building `booking_hover_info`, insert the priority override above.
- Read `asset.operational_status` and `asset.status` from the row already loaded (no new query).
- Set `dynamicStatus` and `booking_hover_info.current_status` to the overridden value when applicable.
- Null out `current_end_date` and `next_available_date` for non-bookable overrides.
- Leave `next_booking_*` / `next_hold_*` / `next_start_date` / `next_end_date` intact so future bookings still surface in the hover card.

### 2. `src/components/media-assets/bookingStatusLabel.ts`
- Extend `BookingStatusLabel["bucket"]` union with `"Removed" | "Under Maintenance" | "Inactive"`.
- Update `getBookingStatusLabel` so these three (plus existing `Blocked` without end date) render as **plain labels** — no "till …" suffix.
- Extend `BOOKING_STATUS_BUCKET_CLASS`:
  - `Removed`: `bg-red-100 text-red-700 border-red-200`
  - `Under Maintenance`: `bg-amber-100 text-amber-700 border-amber-200`
  - `Inactive`: `bg-gray-100 text-gray-700 border-gray-200`
  - Existing `Available / Booked / Held / Blocked` unchanged.

### 3. `src/components/media-assets/AssetBookingHoverCard.tsx`
- Extend the status-to-header-title map and badge colors with: `Removed` ("Removed"), `Under Maintenance` ("Under Maintenance"), `Inactive` ("Inactive").
- Match badge tone to the bucket classes above.
- Suppress the "Next available from …" footer when current_status is `Removed`, `Under Maintenance`, `Inactive`, or `Blocked`.
- Keep the "Next Booking" / "Upcoming Hold" section logic untouched — it still renders if a future item exists.
- Do not change card layout, width, spacing, or props shape.

## What stays unchanged
- Both Supabase fetches in `MediaAssetsControlCenter.tsx` (campaigns + holds) — same query count, same payload.
- All filters, sorting, columns, table settings, action buttons, map view, gallery view, navigation, click behavior.
- Hover card structure, layout, props, integration points.
- All other pages and modules.

## Expected results
| Asset state | Label |
|---|---|
| Active campaign overlapping today | `Booked till 13 Oct 2026` (blue) |
| Active hold overlapping today | `Held till 25 Apr 2026` (amber) |
| `operational_status = removed` | `Removed` (red) |
| `operational_status = maintenance` or `status = Under Maintenance` | `Under Maintenance` (amber) |
| `operational_status = inactive` | `Inactive` (gray) |
| `status = Blocked`, no booking | `Blocked` (red) |
| Truly available | `Available` (green) |

`MNS-HYD-BQS-0047`, `MNS-HYD-BQS-0075`, `MNS-HYD-BQS-0090` will show **Removed** after the fix.

