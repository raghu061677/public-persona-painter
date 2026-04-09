

## Fix: Stale Approval State on Plan Detail & Approvals Queue

### What is actually happening

The database confirms the previous fix **did work**:
- **PLAN-202604-0009**: status = `Converted`, has L1 (sales, approved) + L2 (finance, approved)
- **PLAN-202604-0008**: status = `Approved`, has L1 (sales, approved)

Both plans were successfully approved and one was converted to a campaign. The approval workflow creation and processing worked correctly.

**Why you still see "Waiting for Approval" and "0 Pending":** The Plan Detail page loads plan data once on mount and never refreshes it. If you had the page open before the approval was processed (or if the published app at app.go-ads.in has not been redeployed with the latest code), you see stale state. A simple browser refresh should show the correct status.

### What still needs hardening

Even though the fix worked, the UI is fragile because:

1. **"Waiting for Approval" badge** at line 1399 trusts `plan.status === 'sent'` blindly — it does not verify that pending approval rows actually exist
2. **No realtime subscription** on the `plans` table for status changes — so if another user approves, the page stays stale
3. **No self-healing** — if a plan somehow ends up in `Sent` with all approvals already processed, there is no reconciliation

### Changes

**File: `src/pages/PlanDetail.tsx`**

1. **Add realtime subscription for plan status changes**
   - Subscribe to `postgres_changes` on the `plans` table filtered to the current plan ID
   - On any update, refetch plan data via `fetchPlan()`
   - Clean up subscription on unmount
   - This ensures approvals processed by another user or tab are reflected immediately

2. **Derive "Waiting for Approval" from actual approval rows, not just plan.status**
   - Change the badge condition from `plan.status === 'sent'` to `plan.status === 'sent' && pendingApprovalsCount > 0`
   - When status is `Sent` but `pendingApprovalsCount === 0`, show a "Status out of sync" indicator with a "Refresh" button
   - This prevents false "Waiting for Approval" displays

3. **Add auto-reconciliation on load**
   - After `fetchPlan()` and `loadPendingApprovals()` complete, if `plan.status === 'Sent'` and no pending approvals exist, check if all approvals are approved/rejected
   - If all approved: auto-update plan status to `Approved`
   - If any rejected: auto-update to `Rejected`
   - This self-heals plans stuck in the wrong state

**File: `src/pages/approvals/ApprovalsQueue.tsx`**

4. **Add realtime subscription for approval changes**
   - Subscribe to `postgres_changes` on `plan_approvals` table
   - Auto-refresh the queue when any approval row changes
   - This ensures the queue is never stale

**File: `src/components/layout/ResponsiveSidebar.tsx`**

5. **Add periodic refresh for sidebar pending count**
   - Refresh the pending approval count every 30 seconds instead of only on mount
   - This keeps the sidebar badge accurate without requiring a full page reload

### What stays untouched
- Database function `create_plan_approval_workflow` — already working correctly
- `process_plan_approval` RPC — already working correctly
- `approval_settings` / `approval_rules` data — correctly configured
- No schema changes
- No finance changes

### Expected outcome
- Plan Detail page reflects approval state changes in real-time
- "Waiting for Approval" only shows when real pending approvals exist
- Plans stuck in false `Sent` state auto-correct on page load
- Sidebar badge stays current
- Approvals queue auto-refreshes when approvals change

