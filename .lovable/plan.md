

## Plan: Restrict Invoice Status Changes on List Page

### Problem
The status dropdown on `/admin/invoices` allows **any** status transition without validation — e.g., Sent → Draft, Paid → Draft, Cancelled → Sent. This bypasses all the careful validation in the invoice detail page and creates fiscal integrity risks.

### Recommended approach

**Replace the free-form status dropdown with a read-only status badge on the list page.**

Status changes should only happen from the invoice detail page where proper validation exists (payment checks, credit note checks, cancellation metadata, audit trails).

### Changes (1 file)

**`src/pages/InvoicesList.tsx`**
- Remove the `<Select>` dropdown for status (lines 725-737)
- Replace with a read-only `<Badge>` showing the current status with appropriate color
- Remove the `handleStatusChange` function (lines 340-350) since it's no longer needed
- Keep the View/Edit buttons — users click through to the detail page to manage status

### What stays untouched
- No schema changes
- No finance engine changes
- Invoice detail page status management (cancel, etc.) unchanged
- All other list page functionality (filters, sort, export) unchanged

### Result
- Status is displayed as a colored badge (consistent with other list pages)
- All status transitions go through the detail page with proper validation and audit trails
- No accidental or unauthorized status changes from the list view

