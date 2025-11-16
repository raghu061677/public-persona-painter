# Phase 2: Workflow Completion - New Approach

## Current State Analysis

### ✅ What's Working
1. **Plan → Campaign Conversion**
   - Conversion button exists in PlanDetail.tsx
   - Campaign creation with assets
   - Media asset status update to "Booked"
   
2. **Edge Functions Deployed**
   - `auto-generate-invoice` ✅
   - `auto-record-expenses` ✅
   - `auto-create-mounting-tasks` ✅
   - `send-payment-reminders` ✅

3. **Workflow Hook**
   - `useCampaignWorkflows` hook integrated in CampaignDetail ✅
   - Real-time subscriptions for status changes ✅

4. **Operations Components**
   - `CreativeUploadSection` ✅
   - `OperationsTasksList` ✅
   - Proof upload pages exist ✅

### ⚠️ Critical Gaps to Fix

#### 1. Plan Conversion Validation
- ❌ No check if plan is "Approved" before conversion
- ❌ No prevention of duplicate conversions
- ❌ Missing user feedback on conversion process

#### 2. Workflow Automation Testing
- ⚠️ Need to verify auto-invoice triggers on campaign completion
- ⚠️ Need to verify auto-tasks creation on campaign start
- ⚠️ Need to verify auto-expenses on asset installation

#### 3. Status Flow Documentation
- ❌ No clear status progression rules
- ❌ Missing status transition validation

## Implementation Plan

### Task 1: Fix Plan Conversion (Priority: Critical)
**File:** `src/pages/PlanDetail.tsx`
- Add validation: plan.status === "Approved"
- Add check: plan hasn't been converted already
- Add loading state during conversion
- Show detailed error messages

### Task 2: Add Status Flow Guards (Priority: High)
**Files:** Campaign and Asset status updates
- Campaign: Draft → Planned → InProgress → Completed → Archived
- Asset: Pending → Assigned → Installed → Proof_Uploaded → Verified
- Add validation before status changes

### Task 3: Create Workflow Test Page (Priority: Medium)
**New file:** `src/pages/WorkflowTest.tsx`
- Test each edge function manually
- Verify real-time subscriptions
- Test status change triggers

### Task 4: Add Missing Notifications (Priority: Medium)
- Campaign created → notify client
- Tasks assigned → notify ops team
- Invoice generated → notify finance team
- Proofs uploaded → notify manager

## Success Criteria

✅ Plan cannot be converted unless status = "Approved"
✅ Plan cannot be converted twice
✅ Campaign completion auto-generates invoice
✅ Campaign start auto-creates mounting tasks
✅ Asset installation auto-records expenses
✅ All workflows have proper error handling
✅ User receives clear feedback on all actions

## Timeline
- **Now:** Fix plan conversion validation
- **Next:** Test workflow automation
- **After:** Add notifications and polish
