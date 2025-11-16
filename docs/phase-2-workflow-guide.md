# Phase 2: Workflow Automation - Complete Guide

## Status Flow Rules

### Plan Status Flow
```
Draft → Sent → Approved → Converted
              ↓
           Rejected → (back to Draft)
```

**Validation Rules:**
- ✅ Draft can move to: Sent
- ✅ Sent can move to: Approved, Rejected, Draft (revision)
- ✅ Approved can move to: Converted
- ✅ Rejected can move to: Draft (for revision)
- ✅ Converted is final (no further changes)

**Business Rules:**
- Only approved plans can be converted to campaigns
- Plans cannot be converted twice (duplicate check)
- Plans must have at least one asset

### Campaign Status Flow
```
Draft → Planned → InProgress → Completed → Archived
                    ↓              ↓
                (Auto-tasks)   (Auto-invoice)
```

**Validation Rules:**
- ✅ Draft can move to: Planned
- ✅ Planned can move to: InProgress, Archived
- ✅ InProgress can move to: Completed, Archived
- ✅ Completed can move to: Archived
- ✅ Archived is final

**Business Rules:**
- Campaign can only start if start_date <= today
- Campaign can only complete if all assets are verified
- InProgress → Auto-creates mounting tasks (via edge function)
- Completed → Auto-generates invoice (via edge function)

### Asset Status Flow
```
Pending → Assigned → Installed → Proof_Uploaded → Verified
            ↓           ↓
         (Manual)   (Auto-expenses)
```

**Validation Rules:**
- ✅ Pending can move to: Assigned
- ✅ Assigned can move to: Installed, Pending (unassign)
- ✅ Installed can move to: Proof_Uploaded
- ✅ Proof_Uploaded can move to: Verified, Installed (reject)
- ✅ Verified is final

**Business Rules:**
- Proof upload requires all 4 photos
- Installed → Auto-records expenses (via edge function)
- Verified assets count toward campaign completion

## Automated Workflows

### 1. Plan to Campaign Conversion
**Trigger:** User clicks "Convert to Campaign" button
**Validations:**
- Plan status = Approved
- Plan not already converted
- Plan has assets
- User is authenticated

**Actions:**
1. Generate campaign ID
2. Create campaign record
3. Create campaign_assets from plan_items
4. Update plan status to Converted
5. Update media_assets status to Booked
6. Navigate to new campaign

**Rollback:** If assets creation fails, delete campaign

### 2. Auto-Create Mounting Tasks
**Trigger:** Campaign status → InProgress
**Edge Function:** `auto-create-mounting-tasks`

**Actions:**
1. Fetch all campaign assets
2. For each asset, create operations_tasks record:
   - task_type: 'mounting'
   - status: 'pending'
   - scheduled_for: campaign.start_date
3. Return count of tasks created

**Notifications:** Toast shows "X tasks created"

### 3. Auto-Record Expenses
**Trigger:** Campaign asset status → Installed
**Edge Function:** `auto-record-expenses`

**Actions:**
1. Fetch campaign details
2. For each installed asset:
   - Create expense for printing (if printing_charges > 0)
   - Create expense for mounting (if mounting_charges > 0)
3. Return count of expenses created

**Notifications:** Silent (logged to console)

### 4. Auto-Generate Invoice
**Trigger:** Campaign status → Completed
**Edge Function:** `auto-generate-invoice`

**Actions:**
1. Fetch campaign and all assets
2. Generate invoice ID
3. Calculate totals (display + printing + mounting + GST)
4. Create invoice record with line items
5. Return invoice ID

**Notifications:** Toast shows "Invoice INV-XXXX generated"

### 5. Payment Reminders
**Trigger:** Manual (button click) or scheduled (future)
**Edge Function:** `send-payment-reminders`

**Actions:**
1. Fetch overdue invoices (status = Sent/Overdue, due_date < today)
2. For each invoice:
   - Calculate days overdue
   - Determine reminder number (1-4)
   - Check if reminder already sent
   - Insert payment_reminders record
   - (Future: send email/WhatsApp)
3. Return count of reminders sent

**Escalation Logic:**
- Reminder 1: 0-6 days overdue
- Reminder 2: 7-14 days overdue
- Reminder 3: 15-29 days overdue
- Reminder 4: 30+ days overdue (escalation)

## Components

### CampaignStatusSelect
**Location:** `src/components/campaigns/CampaignStatusSelect.tsx`

**Features:**
- Dropdown showing current status
- Only displays valid next statuses
- Validates transitions before allowing
- Shows confirmation dialog for major changes
- Displays helpful error messages

**Usage:**
```tsx
<CampaignStatusSelect
  campaign={campaign}
  assets={assets}
  onStatusChange={refreshData}
/>
```

### AssetStatusSelect
**Location:** `src/components/operations/AssetStatusSelect.tsx`

**Features:**
- Dropdown showing current status
- Only displays valid next statuses
- Validates proof completeness before Verified
- Auto-updates completion timestamp
- Helpful error messages

**Usage:**
```tsx
<AssetStatusSelect
  asset={asset}
  onStatusChange={refreshAssets}
/>
```

## Testing

### Using Workflow Test Page
**Route:** `/admin/workflow-test`

**Tests Available:**
1. **Verify Campaign** - Check campaign exists
2. **Auto-Tasks** - Test mounting tasks creation
3. **Auto-Expenses** - Test expense recording
4. **Auto-Invoice** - Test invoice generation
5. **Payment Reminders** - Test reminder sending

**How to Test:**
1. Create a test campaign
2. Navigate to Workflow Test page
3. Enter campaign ID
4. Click "Test Workflow"
5. Review results for each function

### Manual Testing Checklist
- [ ] Convert approved plan (should succeed)
- [ ] Try convert non-approved plan (should fail)
- [ ] Try convert same plan twice (should prevent)
- [ ] Change campaign to InProgress (should create tasks)
- [ ] Change campaign to Completed (should create invoice)
- [ ] Change asset to Installed (should record expenses)
- [ ] Try skip status (e.g., Pending → Installed) (should fail)
- [ ] Test payment reminders with overdue invoices

## Troubleshooting

### Common Issues

**Issue:** "Cannot change campaign from X to Y"
**Solution:** Check status flow diagram. Some transitions are not allowed.

**Issue:** "Cannot complete campaign - X assets not verified"
**Solution:** All assets must be in Verified status before campaign can complete.

**Issue:** "Incomplete proof - missing photos"
**Solution:** Upload all 4 required photos (newspaper, geotag, traffic1, traffic2).

**Issue:** Edge function not triggering
**Solution:** Check console logs, verify useCampaignWorkflows hook is active.

### Debug Steps
1. Check browser console for errors
2. Check Network tab for failed edge function calls
3. Use Workflow Test page to test individual functions
4. Check Supabase logs in Cloud settings
5. Verify RLS policies are not blocking updates

## API Reference

### Workflow Validation Functions
**File:** `src/utils/workflowValidation.ts`

**Functions:**
```typescript
validateCampaignStatusTransition(current, next)
validateAssetStatusTransition(current, next)
validatePlanStatusTransition(current, next)
getNextCampaignStatuses(current)
getNextAssetStatuses(current)
canStartCampaign(campaign)
canCompleteCampaign(campaign, assets)
canUploadProof(asset)
validateProofCompleteness(photos)
```

### Edge Functions

**auto-create-mounting-tasks**
```typescript
POST /functions/v1/auto-create-mounting-tasks
Body: { campaign_id: string }
Response: { tasks_created: number, tasks: Array }
```

**auto-record-expenses**
```typescript
POST /functions/v1/auto-record-expenses
Body: { campaign_id: string }
Response: { expenses_created: number, expenses: Array }
```

**auto-generate-invoice**
```typescript
POST /functions/v1/auto-generate-invoice
Body: { campaign_id: string }
Response: { invoice_id: string, ... }
```

**send-payment-reminders**
```typescript
POST /functions/v1/send-payment-reminders
Body: {}
Response: { reminders_sent: number, reminders: Array }
```

---

**Last Updated:** 2024-01-16
**Status:** Phase 2 Complete ✅
