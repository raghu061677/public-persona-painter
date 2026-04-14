

## Plan: Fix Admin Approval Visibility & Add Admin Bypass for Campaign Conversion

### Problem Summary
1. **"Syncing" badge:** Admin user sees "Syncing… Click to refresh" because `loadPendingApprovals` only counts approvals matching the user's exact role (`admin`), but the approval levels require `sales` and `finance`. Since `admin` ≠ `sales`/`finance`, the count is 0, triggering the syncing state.
2. **No approval action:** Even though admin should be able to approve/reject any level, the role filter excludes them.
3. **No bypass option:** Convert to Campaign requires `status === 'Approved'`. Admin has no way to skip the approval workflow and convert directly.

### Changes (single file: `src/pages/PlanDetail.tsx`)

#### Fix 1: Admin sees ALL pending approvals
In `loadPendingApprovals`, when the user is admin, query ALL pending approvals for this plan (don't filter by `required_role`). Non-admin users keep the existing role-filtered behavior.

#### Fix 2: Admin can approve/reject any approval level
In `handleApprovePlan` and `handleRejectPlan`, when the user is admin, fetch the first pending approval regardless of `required_role` (ordered by `approval_level`). Non-admin users keep the existing role-filtered logic.

#### Fix 3: Admin bypass — direct Convert to Campaign
Add a new button visible when:
- `plan.status === 'sent'` (in approval workflow)
- `isAdmin === true`
- No existing campaign

The button will:
1. Auto-approve all pending approval levels for this plan (mark as approved by admin with comment "Admin bypass")
2. Update plan status to `Approved`
3. Then open the Convert to Campaign dialog

This preserves the audit trail (approvals are marked as admin-approved, not deleted).

#### Fix 4: Reconciliation handles admin context
The auto-reconciliation useEffect already works correctly — once all approvals are approved, it transitions to `Approved`. No change needed here.

### Safety
- No stored financial data changes
- No invoice/PDF/export changes
- Approval records are properly updated (not deleted) maintaining audit trail
- Non-admin users experience zero change
- Existing approval workflow logic untouched for non-admin paths

### Files changed
- `src/pages/PlanDetail.tsx` — only file modified

