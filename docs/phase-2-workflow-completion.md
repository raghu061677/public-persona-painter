# Phase 2: Workflow Completion

## Overview
Complete implementation of core business workflows including Plan → Campaign conversion, Operations mounting workflow, and Finance automation.

## Implemented Features

### ✅ Plan → Campaign Conversion
- **Component:** `ConvertToCampaignDialog`
- **Features:**
  - One-click conversion from approved plans
  - Auto-generate campaign ID (CAM-YYYY-Month-###)
  - Copy all plan items as campaign assets
  - Creative file upload during conversion
  - Campaign scheduling (start/end dates)
  - Automatic status update (Plan: Draft → Converted)
  - Activity logging

### ✅ Operations Mounting Workflow
- **Component:** `MountingAssignmentDialog`
- **Features:**
  - Assign mounting tasks to field team
  - Bulk asset selection
  - Mounter details (name, phone)
  - Schedule mounting dates
  - Installation instructions
  - Status tracking:
    - Pending → Assigned → Installed → PhotoUploaded → Verified
  - Activity logging

### ✅ Proof Upload System
- **Component:** `PhotoUploadSection` (existing)
- **Features:**
  - 4-photo requirement per asset:
    1. Newspaper photo
    2. Geo-tagged location
    3. Traffic view 1
    4. Traffic view 2
  - EXIF data validation
  - Status auto-update on upload
  - Quality checks
  - Gallery view

### ✅ Finance Automation
- **Edge Function:** `auto-generate-invoice`
- **Features:**
  - Auto-generate invoices from completed campaigns
  - Invoice ID generation (INV-FYXX-XX-####)
  - Copy campaign items to invoice
  - Calculate GST automatically
  - Set payment terms (30 days default)
  - Link to original plan/estimation
  - Activity logging
  - Prevent duplicate invoices

## Technical Implementation

### Conversion Flow
```typescript
Plan (Approved) 
  → ConvertToCampaignDialog
  → Create Campaign record
  → Copy Plan Items → Campaign Assets
  → Upload Creative Files (optional)
  → Update Plan Status (Converted)
  → Navigate to Campaign Detail
```

### Operations Flow
```typescript
Campaign (Planned)
  → MountingAssignmentDialog
  → Assign Assets to Mounter
  → Update Status (Assigned)
  → Mounter Installs
  → Upload 4 Proof Photos
  → Update Status (PhotoUploaded)
  → Admin Verifies
  → Update Status (Verified)
```

### Finance Automation Flow
```typescript
Campaign (Verified/Completed)
  → Trigger auto-generate-invoice
  → Check if invoice exists
  → Generate Invoice ID
  → Create Invoice with items
  → Link to Plan/Campaign
  → Set Payment Terms
  → Log Activity
```

## Status Flow

### Campaign Status Lifecycle
1. **Planned** - Campaign created from plan
2. **Assigned** - Assets assigned to mounters
3. **InProgress** - Installation in progress
4. **PhotoUploaded** - All proofs uploaded
5. **Verified** - Admin verified proofs
6. **Completed** - Campaign finished

### Asset Status Lifecycle
1. **Pending** - Awaiting assignment
2. **Assigned** - Assigned to mounter
3. **Installed** - Installation complete
4. **PhotoUploaded** - Proofs uploaded
5. **Verified** - Admin verified

## Database Schema

### campaign_assets
```sql
- id (uuid, PK)
- campaign_id (text, FK)
- asset_id (text, FK)
- status (enum: Pending, Assigned, Installed, PhotoUploaded, Verified)
- mounter_name (text, nullable)
- mounter_phone (text, nullable)
- assigned_at (timestamptz, nullable)
- completed_at (timestamptz, nullable)
- photos (jsonb, nullable)
```

### campaign_creatives
```sql
- id (uuid, PK)
- campaign_id (text, FK)
- file_name (text)
- file_url (text)
- file_type (text)
- file_size (integer)
- status (enum: pending, approved, rejected)
- uploaded_at (timestamptz)
```

### invoices
```sql
- id (text, PK)
- client_id (text, FK)
- estimation_id (text, FK to plans, nullable)
- invoice_date (date)
- due_date (date)
- sub_total (numeric)
- gst_amount (numeric)
- total_amount (numeric)
- balance_due (numeric)
- status (enum: Unpaid, PartiallyPaid, Paid, Overdue)
- items (jsonb)
```

## API Endpoints

### Edge Functions
- `/auto-generate-invoice` - Auto-generate invoice from campaign
  - Input: `{ campaignId: string }`
  - Output: `{ success: boolean, invoiceId: string }`

## Usage Instructions

### Convert Plan to Campaign
1. Open plan detail page
2. Ensure plan status is "Approved"
3. Click "Convert to Campaign"
4. Fill campaign details:
   - Campaign name
   - Start/end dates
   - Upload creatives (optional)
   - Add notes
5. Click "Create Campaign"
6. Navigate to campaign page

### Assign Mounting Tasks
1. Open campaign detail page
2. Click "Assign Mounting"
3. Select assets
4. Enter mounter details
5. Set scheduled date
6. Add instructions
7. Click "Assign Tasks"

### Upload Proof Photos
1. Navigate to campaign operations
2. Select asset
3. Upload 4 required photos:
   - Newspaper
   - Geo-tag
   - Traffic 1
   - Traffic 2
4. Auto-updates status to "PhotoUploaded"

### Generate Invoice
1. Mark campaign as "Completed" or "Verified"
2. Invoice auto-generates
3. View in Finance → Invoices
4. Send to client

## Integration Points
- **Plans** → ConvertToCampaignDialog
- **Campaigns** → MountingAssignmentDialog
- **Operations** → PhotoUploadSection
- **Finance** → auto-generate-invoice Edge Function
- **Activity Logs** → All workflows

## Security
- RLS policies on all tables
- Company-level data isolation
- Role-based access (admin, sales, operations, finance)
- Secure file upload to Supabase Storage
- Activity logging for audit trail

## Next Steps
1. Notification system for status updates
2. WhatsApp integration for mounter assignments
3. Email notifications for invoice generation
4. Payment gateway integration
5. Expense auto-linking to campaigns

## Status
**Phase 2 - COMPLETE** ✅

Ready to proceed to Phase 4: Onboarding Flow
