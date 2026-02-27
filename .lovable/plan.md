

# Client-wise Booking Report -- Implementation Plan

## Overview
Replace the existing basic `ReportClientBookings.tsx` with a full-featured report that groups bookings by client, supports date range filtering, provides two-level drilldown (Client -> Campaigns -> Assets), and includes Excel export. The route will be updated from `/admin/reports/clients` to `/admin/reports/client-bookings`.

## What You Will Get
- A summary table grouped by client showing: Total Campaigns, Total Assets Booked, First and Last Booking Dates
- Click a client row to expand and see their campaigns
- Click a campaign row to expand and see the booked assets
- Date range picker, status filter, search bar
- KPI cards (Total Clients, Total Campaigns, Total Assets, Cities Covered)
- Excel export for both the summary view and a full drilldown export
- The old `/admin/reports/clients` route will redirect to the new one

---

## Technical Steps

### 1. Rewrite `src/pages/ReportClientBookings.tsx`
Complete rewrite following the established pattern from `ReportMonthlyCampaigns.tsx`:

**Data model (3-level hierarchy):**
```
ClientSummaryRow
  -> client_name, total_campaigns, total_assets, first_booking, last_booking
  -> campaigns: CampaignRow[]
       -> campaign_name, start_date, end_date, duration, asset_count, status
       -> assets: AssetRow[]
            -> asset_code, media_type, city, area, location, dimensions, illumination, direction
```

**Query logic:**
- Fetch `campaigns` scoped by `company_id` with date overlap filter (`start_date <= rangeEnd AND end_date >= rangeStart`)
- Batch-fetch `campaign_assets` for matched campaign IDs (chunks of 100)
- Batch-fetch `media_assets` for asset codes (chunks of 100)
- Group by `client_name` / `client_id` on the client side

**Filters:** DateRangeFilter component, Status select, Search input, Reset button

**UI:** Two-level collapsible rows using the existing `Collapsible` component -- first expand shows campaigns, second expand shows assets per campaign

**Export:** Two options via `ReportExportMenu`:
- "Export Excel" -- client summary rows only
- "Export PDF" placeholder (async noop for now)

### 2. Update Route in `src/App.tsx`
- Add new route: `reports/client-bookings` pointing to `ReportClientBookings`
- Change the old `reports/clients` route to `<Navigate to="/admin/reports/client-bookings" replace />`

### 3. Update Sidebar Navigation
- In `src/components/layout/ResponsiveSidebar.tsx`: change the "Client Bookings" menu item href from `/admin/reports/clients` to `/admin/reports/client-bookings`
- In `src/layouts/SidebarLayout.tsx`: same update if the reports section is listed there

### 4. No Database or Schema Changes
All data comes from existing `campaigns`, `campaign_assets`, and `media_assets` tables via client-side joins and grouping. Company scoping uses `useCompany()` context.
