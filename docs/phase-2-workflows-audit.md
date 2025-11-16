# Phase 2: Critical Workflows - Audit & Implementation Plan

## Overview
Phase 2 focuses on ensuring core business workflows function end-to-end without breaks. This is CRITICAL for the application to be usable in production.

---

## Workflow 1: Plan → Campaign Conversion

### Current State ✅ (WORKING)
**Files:**
- `src/pages/PlanDetail.tsx` (lines 633-710) - Main conversion logic
- `src/components/campaigns/CreateCampaignFromPlanDialog.tsx` - Batch conversion dialog

**What Works:**
1. ✅ Campaign creation from approved plans
2. ✅ Campaign assets created from plan items
3. ✅ Plan status updated to "Converted"
4. ✅ Media asset status changed to "Booked"
5. ✅ Campaign ID auto-generation
6. ✅ Navigation to new campaign after creation

**Minor Issues to Fix:**
- [ ] Need to add validation that plan must be "Approved" before conversion
- [ ] Should prevent duplicate conversions of same plan
- [ ] Need better error handling for partial failures
- [ ] Missing notification to client when campaign is created

---

## Workflow 2: Operations Workflow (Creative → Mounting → Proof)

### Current State ⚠️ (PARTIALLY WORKING)

**Stages:**
1. **Creative Upload** → ⚠️ Missing implementation
2. **Mounting Assignment** → ✅ Working (`campaign_assets` table)
3. **Proof Upload** → ✅ Working (mobile pages exist)
4. **Verification** → ⚠️ Manual, no workflow

**Files:**
- `src/pages/Operations.tsx` - Main operations dashboard
- `src/pages/CampaignDetail.tsx` - Campaign view with operations tab
- `src/pages/mobile/OperationsPhotoUpload.tsx` - Mobile proof upload
- `src/components/operations/` - Various operation components

**What's Missing:**

### 2.1 Creative Upload Stage ❌
**Need to Create:**
- Creative upload interface in campaign detail
- Table/storage: Store creative files per campaign
- Approval workflow for creatives
- Link creatives to specific assets

**Implementation:**
```
Campaign Detail → Creatives Tab
- Upload creative files (AI/PSD/JPG)
- Assign creative to assets
- Mark as approved/rejected
- Auto-notify operations team when approved
```

### 2.2 Mounting Assignment ✅ (Exists)
**Current:**
- `campaign_assets` table has status field
- Can assign mounter_name to each asset
- Status: Pending → Assigned → Installed → Proof_Uploaded → Verified

**Improvements Needed:**
- [ ] Auto-assign mounting tasks when campaign starts
- [ ] Send notifications to operations team
- [ ] Mobile-optimized assignment view

### 2.3 Proof Upload ✅ (Exists)
**Current:**
- Mobile photo upload pages exist
- 4 photo types: Newspaper, Geotag, Traffic1, Traffic2
- Photos stored in `operations_photos` table
- Storage bucket: `operations-photos`

**Improvements Needed:**
- [ ] GPS validation for geotag photos
- [ ] EXIF data validation
- [ ] Batch upload capability
- [ ] Auto-generate proof PPT after all assets verified

### 2.4 Verification Workflow ⚠️
**What's Missing:**
- QC checklist for proof photos
- Rejection/re-upload flow
- Auto-notification when all proofs verified
- Client notification system

---

## Workflow 3: Finance Workflow Automation

### Current State ⚠️ (MANUAL)

**Current Files:**
- `src/pages/InvoicesList.tsx`
- `src/pages/EstimationsList.tsx`
- `src/pages/ExpensesList.tsx`
- `src/components/campaigns/GenerateInvoiceDialog.tsx`

**What Works:**
- ✅ Manual invoice creation
- ✅ Manual expense tracking
- ✅ GST calculations
- ✅ Payment status tracking

**What's Missing - CRITICAL:**

### 3.1 Automated Invoice Generation ❌
**Need to Implement:**
```
Campaign Completed → Auto-generate Invoice
- Trigger: When campaign.status = 'Completed'
- Action: Create invoice from campaign data
- Include: All assets + printing + mounting + GST
- Send: Email to client with payment link
- Track: Payment status and aging
```

### 3.2 Automated Expense Recording ❌
**Need to Implement:**
```
Campaign → Auto-create Expense Records
- When: Campaign assets installed
- Create: Printing expense (₹15/sqft)
- Create: Mounting expense (₹1500/asset)
- Link: To campaign and vendor
- Track: Payment to vendors
```

### 3.3 Payment Reminders ❌
**Need to Implement:**
```
Invoice Aging → Send Reminders
- Day 0: Invoice sent
- Day 7: First reminder
- Day 15: Second reminder
- Day 30: Escalation notice
- Auto: WhatsApp/Email/SMS
```

### 3.4 Financial Dashboard ⚠️
**Improvements Needed:**
- [ ] Real-time receivables
- [ ] Payables tracking
- [ ] Profit/Loss per campaign
- [ ] Cash flow projection

---

## Implementation Priority (Phase 2)

### Week 1: Complete Operations Workflow
**Priority: HIGH**

#### Task 1.1: Creative Upload System
- [ ] Create creative management table in DB
- [ ] Build creative upload interface in Campaign Detail
- [ ] Add approval workflow
- [ ] Link creatives to campaign assets

#### Task 1.2: Auto-Mounting Assignment
- [ ] Create edge function to auto-create mounting tasks
- [ ] Trigger when campaign status → "In Progress"
- [ ] Send notifications to ops team
- [ ] Mobile view for mounting assignments

#### Task 1.3: Proof Upload Enhancements
- [ ] Add GPS validation
- [ ] EXIF data extraction and validation
- [ ] Batch upload UI
- [ ] Photo quality scoring (AI)

#### Task 1.4: Verification Workflow
- [ ] Create QC checklist interface
- [ ] Rejection/re-upload flow
- [ ] Auto-generate proof PPT when verified
- [ ] Client notification system

### Week 2: Finance Automation
**Priority: CRITICAL**

#### Task 2.1: Auto Invoice Generation
- [ ] Create edge function triggered by campaign completion
- [ ] Auto-generate invoice from campaign data
- [ ] Calculate totals with GST
- [ ] Email invoice to client
- [ ] Track payment status

#### Task 2.2: Auto Expense Recording
- [ ] Create edge function for expense automation
- [ ] Auto-create printing expenses
- [ ] Auto-create mounting expenses
- [ ] Link to vendors
- [ ] Track vendor payments

#### Task 2.3: Payment Reminder System
- [ ] Create reminder scheduler (edge function + cron)
- [ ] Email/SMS/WhatsApp integration
- [ ] Aging report automation
- [ ] Escalation workflow

### Week 3: Workflow Testing & Refinement
**Priority: HIGH**

#### Task 3.1: End-to-End Testing
- [ ] Test: Plan → Campaign → Operations → Invoice
- [ ] Test: Creative upload → Approval → Mounting
- [ ] Test: Proof upload → Verification → Client delivery
- [ ] Test: Invoice → Payment → Reconciliation

#### Task 3.2: Error Handling
- [ ] Handle partial failures gracefully
- [ ] Add rollback mechanisms
- [ ] Improve error messages
- [ ] Add retry logic

#### Task 3.3: Notifications
- [ ] Campaign created → Client notification
- [ ] Mounting assigned → Ops notification
- [ ] Proof uploaded → Manager notification
- [ ] Invoice due → Client reminder
- [ ] Payment received → Team notification

---

## Success Criteria

### Workflow 1: Plan → Campaign ✅
- [x] Can convert approved plan to campaign
- [x] Campaign assets created correctly
- [ ] Notifications sent
- [ ] Cannot convert same plan twice

### Workflow 2: Operations 🔄
- [ ] Creative uploaded and approved
- [ ] Mounting auto-assigned when campaign starts
- [ ] Proof photos uploaded with validation
- [ ] QC verification completed
- [ ] Proof PPT auto-generated
- [ ] Client receives proof notification

### Workflow 3: Finance ❌
- [ ] Invoice auto-generated on campaign completion
- [ ] Expenses auto-recorded
- [ ] Payment reminders sent automatically
- [ ] Aging report accurate
- [ ] Payment reconciliation working

---

## Database Changes Needed

### New Tables Required:

1. **campaign_creatives**
```sql
- id (uuid)
- campaign_id (fk)
- file_url (text)
- file_type (text)
- status (pending/approved/rejected)
- approved_by (uuid)
- approved_at (timestamp)
- notes (text)
```

2. **operations_tasks** (for mounting automation)
```sql
- id (uuid)
- campaign_id (fk)
- asset_id (fk)
- task_type (mounting/installation/removal)
- assigned_to (uuid)
- status (pending/in_progress/completed)
- scheduled_date (date)
- completed_at (timestamp)
```

3. **payment_reminders** (for automation)
```sql
- id (uuid)
- invoice_id (fk)
- reminder_number (int)
- sent_at (timestamp)
- method (email/sms/whatsapp)
- status (sent/failed/bounced)
```

### Edge Functions Needed:

1. **auto-create-mounting-tasks**
   - Trigger: Campaign status → "In Progress"
   - Action: Create mounting task for each campaign asset

2. **auto-generate-invoice**
   - Trigger: Campaign status → "Completed"
   - Action: Generate invoice from campaign data

3. **auto-record-expenses**
   - Trigger: Campaign assets installed
   - Action: Create printing + mounting expenses

4. **send-payment-reminders**
   - Trigger: Scheduled (daily cron)
   - Action: Check overdue invoices, send reminders

5. **generate-proof-ppt**
   - Trigger: All campaign assets verified
   - Action: Generate proof presentation

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize** which workflows are most critical
3. **Start implementation** in order of priority
4. **Test thoroughly** after each workflow
5. **Document** any changes to the workflow

**Estimated Timeline:** 3 weeks
**Critical Path:** Finance automation is blocking production use
