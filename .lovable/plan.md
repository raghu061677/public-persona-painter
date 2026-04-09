

## Global Filter UI Pattern — Summary & Implementation Plan

### Current State Analysis

**Invoices List** (`InvoicesList.tsx`, 790 lines)
- Header buttons row (Export, Filters, Number Review, Legacy Close, New Invoice)
- Stats cards (4 cards: Total, Paid, Outstanding, Overdue)
- `InvoiceQuickChips` — type/status/period chip rows + preset chips
- `InvoiceFilterPills` — removable active filter pills
- `InvoicesSummaryBar` — summary metrics
- Separate `FYFilterDropdown` + raw `<input>` search bar below everything
- Advanced filters via `Sheet` (drawer) — `InvoiceAdvancedFilters`
- **No `ListToolbar`** — uses its own custom layout
- **Issues**: FY dropdown and search are below the quick chips/pills/summary instead of at top; duplicate filter entry points; search is a raw `<input>` not matching other pages

**Campaigns List** (`CampaignsList.tsx`, 761 lines)
- Header with action buttons
- `ListToolbar` with search, saved views, columns, export — **FY dropdown and Filters button injected via `extraActions`**
- `CampaignQuickChips` — status/timeframe/preset chips
- `CampaignFilterPills` — removable pills
- Health alerts bar
- Invoice status filter tabs (another row of chips)
- Advanced filters via `Sheet` — `CampaignAdvancedFilters`
- **Decent structure** but has two separate chip rows (quick chips + invoice status tabs)

**Plans List** (`PlansList.tsx`, 1431 lines)
- Header with Templates + Add Plan buttons
- `ListToolbar` with search, saved views, columns, export
- `PlansSummaryBar`
- View mode tabs card (Current Month / All Active / Archived / All)
- **Second search + filter card** with `Popover` suggestions, `EnhancedFilterToggle` containing `TableFilters` and `FilterPresets`
- **Issues**: Duplicate search bars (one in ListToolbar, another in the filter card); no date range filter; no FY filter; only a status dropdown inside collapsible filter panel

### Key Problems to Fix

1. **Plans page has two search bars** — ListToolbar has one, then the Card below has another independent search with suggestions
2. **Invoices page has no ListToolbar** — uses custom layout, FY/search are buried below chips
3. **No date range filter on Plans** — user specifically wants creation-date-based filtering (Current Month, Last Month, Last 3 Months, This FY, Last FY, Custom)
4. **Inconsistent filter placement** — each page arranges filters differently
5. **Plans view mode tabs partially overlap** with the requested date filter (Current Month tab duplicates Current Month date filter)

### Design: Unified Filter Row Pattern

Instead of creating a heavy new component, the approach is to **standardize the layout order** across all three pages using existing components and a small new `DatePeriodFilter` dropdown:

```text
┌─────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                          [Actions] [+ New]          │
├─────────────────────────────────────────────────────────────────┤
│ ListToolbar: [Search] [Saved Views] [Columns] [Export] [Reset]  │
│              + extraActions: [FY ▼] [Period ▼] [Filters badge]  │
├─────────────────────────────────────────────────────────────────┤
│ QuickChips (status/type chips)                                  │
├─────────────────────────────────────────────────────────────────┤
│ FilterPills: [Status: Running ×] [FY: 2025-26 ×] [Reset All]   │
├─────────────────────────────────────────────────────────────────┤
│ SummaryBar / Stats                                              │
├─────────────────────────────────────────────────────────────────┤
│ TABLE                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Create `DatePeriodFilter` component
**New file**: `src/components/common/DatePeriodFilter.tsx`

A small dropdown that offers:
- Current Month (default for Plans)
- Last Month
- Last 3 Months
- This Financial Year
- Last Financial Year
- Custom Range (shows from/to date pickers)

Returns `{ from: string; to: string } | undefined`. Reusable on any page.

#### Step 2: Upgrade Plans List page
**File**: `src/pages/PlansList.tsx`

- **Remove the duplicate search Card** (lines 820-946) — the search input with Popover suggestions and `EnhancedFilterToggle` with `TableFilters`/`FilterPresets`
- **Consolidate search into ListToolbar only** — keep suggestion logic if possible, but single search entry point
- **Add `DatePeriodFilter` and `FYFilterDropdown` as `extraActions` in ListToolbar** — matching Campaigns pattern
- **Keep view mode tabs** (Current Month / All Active / Archived / All) but make them work alongside the date filter: when a date period is selected, it overrides the "Current Month" tab behavior; the tabs become purely about active/archived status
- **Refactor view mode**: Split into two concerns:
  - **Archive toggle**: All Active / Archived / All (keeps existing tab UI)
  - **Date period**: Current Month / Last Month / Last 3 Months / FY / Custom (new dropdown)
- **Add `PlanFilterPills`** to show active filters as removable chips
- **Wire filters to existing `filteredPlans` useMemo**
- **Preserve**: ListToolbar saved views, column chooser, export, sort, bulk actions

#### Step 3: Upgrade Invoices List page
**File**: `src/pages/InvoicesList.tsx`

- **Add `ListToolbar`** at the standard position (after header, before stats) — replacing the current scattered layout
- **Move FY dropdown and Filters button into ListToolbar `extraActions`**
- **Remove the standalone search input** (lines 573-584) — use ListToolbar search instead
- **Keep**: `InvoiceQuickChips`, `InvoiceFilterPills`, `InvoicesSummaryBar`, stats cards, `InvoiceAdvancedFilters` sheet
- **Reorder layout**: Header → ListToolbar (with FY + Filters in extraActions) → Stats → QuickChips → FilterPills → SummaryBar → Table
- **Keep all existing filter logic intact** — just move UI elements

#### Step 4: Clean up Campaigns List page
**File**: `src/pages/CampaignsList.tsx`

- Already well-structured with ListToolbar
- **Consolidate invoice status tabs into QuickChips** or keep as a secondary filter row but with consistent styling
- **Add `DatePeriodFilter` to `extraActions`** alongside existing FY dropdown if useful
- **Minor**: Ensure `CampaignFilterPills` shows FY filter as a pill when non-default

#### Step 5: Add consistent `FilterPills` for Plans
**New file**: `src/components/plans/PlanFilterPills.tsx`

Shows removable pills for active plan filters (status, date period, search term). Same pattern as `InvoiceFilterPills` and `CampaignFilterPills`.

### Files Changed

| File | Action | Risk |
|------|--------|------|
| `src/components/common/DatePeriodFilter.tsx` | Create | None — new file |
| `src/components/plans/PlanFilterPills.tsx` | Create | None — new file |
| `src/pages/PlansList.tsx` | Edit — remove duplicate search card, add DatePeriodFilter/FY to ListToolbar extraActions, add PlanFilterPills, refactor viewMode tabs to separate archive vs date concerns | Medium — large file, careful merge |
| `src/pages/InvoicesList.tsx` | Edit — add ListToolbar, move FY/search into it, reorder sections | Medium — reorder but keep logic |
| `src/pages/CampaignsList.tsx` | Minor edit — add DatePeriodFilter, ensure pills show FY | Low |

### What stays untouched
- All filter logic (useMemo pipelines) — just rewired to same state
- Advanced filter Sheets (InvoiceAdvancedFilters, CampaignAdvancedFilters)
- Quick chips components
- Summary bars
- Sort logic
- Export logic
- ListToolbar component itself
- Database schema
- Finance logic

### Safety constraints
- No schema changes
- No new database queries
- All changes are UI layout reorganization + one new dropdown component
- Existing filter state variables preserved
- Export continues to respect filtered data

