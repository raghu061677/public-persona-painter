
Objective: fix the approval workflow so “Sent” plans actually create actionable approvals, and surface block/unblock actions from the plan context without rebuilding anything.

What is happening now
- `/admin/plans/PLAN-202604-0009` shows “Waiting for Approval” because `PlanDetail.tsx` sets `plans.status = 'Sent'` before the approval workflow is successfully created.
- The actual workflow creation is failing in the database function with the runtime error already visible in console: `operator does not exist: text = plan_type`.
- Because `plan_approvals` rows are not being created, all approval UIs stay empty:
  - sidebar pending count
  - `/admin/approvals`
  - dashboard pending approvals widget
  - plan-level approve/reject buttons
- So this is not just a UI issue; it is a failed workflow creation with a misleading plan status.
- There is also drift in the approval system:
  1. `/admin/approvals/rules` manages `approval_rules`
  2. workflow creation still reads `approval_settings`
  3. auth context uses `company_users`
  4. approval queue/sidebar mostly use `user_roles`
  5. queue page has its own direct update path instead of the canonical approval RPC
- “Block / Unblock assets from plans” is currently not implemented on the plan page. The existing hold/release flow lives in `AssetHoldDialog` / `ReleaseHoldDialog` and is exposed from media availability / asset contexts, not `PlanDetail`.

Minimal-disruption implementation plan
1. Repair approval workflow creation at the source
- Fix `create_plan_approval_workflow` so plan type comparison uses compatible types and no longer crashes.
- Keep the existing idempotency guard.
- Make the function use the same real rule source the UI expects:
  - preferred: read `approval_rules`
  - safe fallback: legacy `approval_settings` if needed for existing data
- Result: when a plan is submitted, real `plan_approvals` rows are created.

2. Stop putting plans into a false “Sent” state
- Update submit-for-approval flow in `PlanDetail.tsx` and bulk send in `PlansList.tsx`.
- Only leave a plan in `Sent` when approval rows exist.
- If workflow creation fails, show the exact failure and keep the plan in a non-sent state or retry setup immediately.
- Also change the plan page badge logic so “Waiting for Approval” is shown only when pending approval rows actually exist.

3. Unify who can see approvals
- Centralize approver-role resolution in a tiny helper instead of duplicating queries.
- Use one consistent effective-role source across:
  - `ApprovalsQueue.tsx`
  - `PendingApprovalsWidget.tsx`
  - `ResponsiveSidebar.tsx`
  - `PlanDetail.tsx`
- Include delegation logic already present in `src/utils/approvals.ts`.
- Keep legacy compatibility if some users still have `user_roles`, but align with active company role data so approval visibility stops drifting.

4. Make approval actions use the canonical path everywhere
- `ApprovalsQueue.tsx` should stop directly updating `plan_approvals` rows and use `process_plan_approval` like the other approval surfaces.
- `PlanDetail.tsx` should not grab the first pending approval blindly; it should fetch the current user’s eligible pending approval row.
- This prevents wrong-level approvals and keeps plan status transitions consistent.

5. Add plan-level block/unblock entry points safely
- Reuse existing `AssetHoldDialog` / `ReleaseHoldDialog` from the plan page instead of inventing a new hold system.
- Add per-asset action(s) on plan item rows in `PlanDetail`:
  - Block / Hold asset
  - Release hold if an active hold exists
- This keeps the change small, uses current asset-hold data, and gives you the “block/unblock from plan” action where you expect it.

Files likely touched
- `supabase/migrations/...` (function fix; no schema rebuild)
- `src/pages/PlanDetail.tsx`
- `src/pages/PlansList.tsx`
- `src/pages/approvals/ApprovalsQueue.tsx`
- `src/components/dashboard/PendingApprovalsWidget.tsx`
- `src/components/layout/ResponsiveSidebar.tsx`
- `src/utils/approvals.ts`
- possibly the plan-item row render area used by `PlanDetail` for the hold/release buttons

Technical notes
- Primary root cause: broken DB function `create_plan_approval_workflow`.
- Secondary root cause: approval runtime/config drift (`approval_rules` vs `approval_settings`).
- Tertiary drift: role source mismatch (`company_users` vs `user_roles`) and duplicated queue logic.
- Existing approval RLS/policy/helper coverage should also be checked for all required roles actually used by rules (especially if operations approval is enabled).

Expected outcome after fix
- Submitting a plan for approval creates real pending approval rows.
- Sidebar pending count and `/admin/approvals` show the same items.
- Plan detail shows “Waiting for Approval” only when a valid workflow exists.
- Approve/reject becomes available only for the correct approver and works consistently.
- Archived false states (“Sent but no approvals”) stop recurring.
- Plan page gains direct block/unblock asset actions using the existing hold system.
