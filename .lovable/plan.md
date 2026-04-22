

## Goal
Redesign `/admin/media-assets` into a single, professional, enterprise-grade layout with **one** search box, **one** unified quick filter bar, an always-visible advanced filter panel, and a streamlined column/settings menu — without removing any existing functionality.

## Issues found in current page

| # | Problem | Where |
|---|---------|-------|
| 1 | Two search boxes (top app-shell `Quick search ⌘K` + page `Search assets…`) | Global topbar + `HeaderBar.tsx` |
| 2 | Two Quick-Filter rows (status badges in page + `QuickFilterBar` All Status / Available / Booked / Cities inside table) | `MediaAssetsControlCenter.tsx` + `quick-filter-bar.tsx` |
| 3 | Advanced filters (Location, Area, Media Type, Status, Date) hidden inside collapsible `Filters & Columns` toggle | `table-filters.tsx` |
| 4 | "Table Settings" modal (pagination, refresh, date format, currency, compact numbers) is duplicate noise — these are already global app settings | `table-settings-panel.tsx` |
| 5 | Two action button rows (`Custom Fields Export / Generate QR / Add New Asset` + bulk actions) scattered | Page + table |

## Proposed Layout (single source of truth)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home › Admin › Media Assets                              │
├──────────────────────────────────────────────────────────────────────┤
│ [🔍 Search assets, location, area, code…              ⌘K ]   ← ONE  │
│                                          [AI] [Dup] [Map|Grid|Table] │
├──────────────────────────────────────────────────────────────────────┤
│  KPI Cards: 113 Total · 82 Available · 31 Booked · 2 Cities · 89 Lit │
├──────────────────────────────────────────────────────────────────────┤
│ Quick Filters: [All] [Available] [Booked] [Maintenance] | City ▾ |   │
│                Media Type ▾ | Date ▾ | + More Filters | × Clear (n)  │
├──────────────────────────────────────────────────────────────────────┤
│ 113 results       [Columns ▾] [Export ▾] [+ Add New Asset]           │
├──────────────────────────────────────────────────────────────────────┤
│ ☐ Asset ID | Image | Location | Area | City | Type | Rate | Status…  │
│ … rows …                                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Key decisions
1. **Remove the page-level search box** in `HeaderBar.tsx`. The global app-shell `Quick search ⌘K` stays as the only global search. Add a dedicated **page search bar** directly above the Quick-Filters row that searches *only this page's assets* (location, area, city, code, media type). The `/` keyboard shortcut focuses it.
2. **Delete the duplicate quick-filter row.** Use one `QuickFilterBar` directly above the table containing: Status chips · City dropdown · Media Type dropdown · Date Range · "+ More Filters" (opens advanced sheet) · Clear All.
3. **Remove the collapsible "Filters & Columns" card.** Move Location / Area / Created Date filters into a right-side **"More Filters" Sheet** (drawer) opened from the quick-filter bar — only shown when needed. This eliminates the always-open accordion clutter.
4. **Remove the "Table Settings" button** (pagination, refresh interval, date format, currency, compact numbers). These belong under the user's profile / company settings, not on every list page. Keep `Density` toggle inline on the toolbar.
5. **Consolidate columns control:** keep just one `[Columns 8/24 ▾]` button on the right-side of the toolbar (above the table).
6. **Consolidate action buttons** into one toolbar row above the table:
   `[N results]   [Columns ▾]  [Density ▾]  [Export ▾ → Excel / PDF / Custom Fields]  [Bulk QR]  [+ Add New Asset]`
7. Bulk-actions card (when rows selected) stays as-is, appearing between the toolbar and the table.

## Files to change

| File | Change |
|------|--------|
| `src/components/media-assets/control-center/HeaderBar.tsx` | Remove the search `<Input>`. Keep breadcrumb + AI/Duplicates/God Mode/View switch/Theme. |
| `src/pages/MediaAssetsControlCenter.tsx` | Add a single page-level search bar above KPI cards. Remove the duplicate status-badge row. Pass search state into the table's `globalFilter` so highlighting still works. Move "Add New Asset / Custom Fields Export / Bulk QR" into the table toolbar (so they sit just above the grid). |
| `src/components/common/quick-filter-bar.tsx` | Extend with: Media Type dropdown, Date Range popover, "More Filters" button, active-filter count badge. |
| `src/components/media-assets/media-assets-table.tsx` | Replace `<TableFilters>` collapsible card with a compact toolbar row: `[N results] [Columns] [Density] [Export ▾] [Add Asset]`. Move Location / Area / Created Date into a new `<MoreFiltersSheet>` opened via Quick-Filter bar. Remove the embedded `QuickFilterBar` (now lives at page level). |
| `src/components/common/table-filters.tsx` | Keep file (used elsewhere) but no longer used here. Add prop to suppress "Table Settings" button. |
| `src/components/media-assets/MoreFiltersSheet.tsx` *(new)* | Right-side sheet/drawer with Location, Area, Created Date inputs + Apply / Clear. |

## Behaviour preserved
- All existing filter logic (status, city, media_type, location, area, date range) continues to work — only the UI container changes.
- `/` keyboard shortcut still focuses the page search.
- Column visibility, density, frozen columns, bulk actions, exports, QR generation — all preserved.
- Global app-shell search (`⌘K`) is untouched.
- Table Settings panel removed from this page only; not deleted globally (other pages still use it).

## What gets removed (no behaviour loss)
- Page-level second search box (redundant with new dedicated one).
- Duplicate status-badge filter row at page level.
- "Table Settings" button on this page (formatting prefs are global).
- "Filters & Columns" collapsible accordion (replaced by always-visible quick-filter bar + on-demand More Filters sheet).

## Out of scope
- Changes to other list pages (Plans, Campaigns, Invoices) — same pattern can be rolled out later if approved.
- Backend / RPC / data-fetching logic — unchanged.

