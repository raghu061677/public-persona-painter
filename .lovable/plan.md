

# Add Custom Fields Export + Summary to Booked Media Report

## What's Missing vs. Vacant Media Report

The `/admin/reports/vacant-media` (MediaAvailabilityReport) has two features that `/admin/reports/booked-media` currently lacks:

1. **"Custom Fields Export" button** -- Opens a dialog (`CustomExportDialog`) where users can pick specific fields grouped by category (Core, Location, Specifications, etc.), then export to Excel or PPT with only those fields. The Booked Media page only has a basic "Export Excel" in the `ReportExportMenu` dropdown that exports visible columns.

2. **Summary row in the Excel export** -- The Vacant Media custom export includes a summary section (Total, Available, Booked counts) above the data rows. The Booked Media export has no such summary.

## Implementation Plan

### Step 1: Create Booked Media Custom Export Fields Definition
**New file: `src/lib/reports/generateCustomBookedMediaExcel.ts`**

Define `ALL_BOOKED_EXPORT_FIELDS` grouped by category:
- **Core**: S.No, Asset Code
- **Location**: City, Area, Location, Address, Facing (Direction)
- **Specifications**: Media Type, Dimensions, Sq.Ft, Illumination
- **Campaign**: Campaign Name, Client Name, Campaign Status, Installation Status
- **Dates**: Start Date, End Date, Duration (Days)
- **Geo Coordinates**: Latitude, Longitude

Each field has a `getValue` function that reads from `BookedMediaRow` and formats appropriately (dates as DD/MM/YYYY, etc.).

Also define `DEFAULT_CUSTOM_FIELDS`, `FIELD_GROUPS`, and a `generateCustomBookedMediaExcel()` function that:
- Creates a branded header row
- Adds a summary section (Total Bookings, Unique Assets, Campaigns, Clients)
- Writes data rows with campaign-status-based row coloring (green for Completed, red for Cancelled, blue for Running)
- Downloads the file

### Step 2: Create Booked Media Custom PPT Export
**New file: `src/lib/reports/generateCustomBookedMediaPpt.ts`**

Similar to `generateCustomAvailabilityPpt.ts`:
- Cover slide with branding
- Summary slide with KPI cards (Total Bookings, Unique Assets, Campaigns, Clients)
- Paginated table slides with selected fields
- Campaign-status-based row coloring

### Step 3: Create Custom Export Dialog for Booked Media
**New file: `src/components/reports/BookedMediaCustomExportDialog.tsx`**

A dialog component (similar to `CustomExportDialog`) that:
- Shows all booked media fields grouped by category with checkboxes
- Select All / Reset to Default actions
- "Export Excel" and "Export PPT" buttons
- Calls the new `generateCustomBookedMediaExcel` and `generateCustomBookedMediaPpt` functions

### Step 4: Update ReportBookedMedia Page
**Edit: `src/pages/ReportBookedMedia.tsx`**

- Import `BookedMediaCustomExportDialog` and `Settings2` icon
- Add state: `customExportOpen`
- Add "Custom Fields Export" button next to the existing `ReportExportMenu` in the header area
- Wire up the dialog with `filteredData`, date range, and company info
- Ensure the existing column-toggle Excel export in `ReportExportMenu` continues to work as-is

### Summary of Changes
| File | Action |
|------|--------|
| `src/lib/reports/generateCustomBookedMediaExcel.ts` | Create -- field definitions + Excel generator |
| `src/lib/reports/generateCustomBookedMediaPpt.ts` | Create -- PPT generator |
| `src/components/reports/BookedMediaCustomExportDialog.tsx` | Create -- dialog UI |
| `src/pages/ReportBookedMedia.tsx` | Edit -- add button + dialog integration |

No database or billing changes. All additions are UI + export logic only.

