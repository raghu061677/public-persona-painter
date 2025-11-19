# Go-Ads 360° - Complete Testing & Configuration Guide

**Version:** 1.0  
**Date:** January 2025  
**Platform:** Multi-Tenant OOH Media Management SaaS

---

## 📋 Table of Contents

1. [Phase 1: Authentication & User Setup](#phase-1-authentication--user-setup)
2. [Phase 2: Company Management](#phase-2-company-management-platform-admin)
3. [Phase 3: Media Assets](#phase-3-media-assets)
4. [Phase 4: Leads & Clients](#phase-4-leads--clients)
5. [Phase 5: Plans & Quotations](#phase-5-plans--quotations)
6. [Phase 6: Campaigns](#phase-6-campaigns)
7. [Phase 7: Operations & Proof Upload](#phase-7-operations--proof-upload)
8. [Phase 8: Finance Module](#phase-8-finance-module)
9. [Phase 9: Reports & Analytics](#phase-9-reports--analytics)
10. [Phase 10: Edge Functions Testing](#phase-10-edge-functions-testing)
11. [Phase 11: Database Integrity](#phase-11-database-integrity)
12. [Common Issues & Solutions](#common-issues--solutions)

---

## Phase 1: Authentication & User Setup

### Step 1.1: Test User Registration

**Objective:** Verify new user can register and login

**Steps:**
- [ ] Navigate to `/login`
- [ ] Click "Sign Up" or "Create Account"
- [ ] Enter email: `test@example.com`
- [ ] Enter password (min 6 characters)
- [ ] Submit registration form

**Expected Results:**
- ✅ User account created successfully
- ✅ Auto-confirmation enabled (no email verification needed)
- ✅ Redirected to login or onboarding page

**Issues Found:**
```
Issue: _______________________________________________
Error Message: _______________________________________
Screenshot: __________________________________________
```

---

### Step 1.2: Test Company Onboarding

**Objective:** Complete company setup for new user

**Steps:**
- [ ] After login, verify redirect to `/onboarding`
- [ ] **Company Type:** Select "Media Owner" or "Agency"
- [ ] **Basic Info:**
  - Company Name: `Test Media Company`
  - Legal Name: `Test Media Company Pvt Ltd`
  - GSTIN: `29AAACM1234A1Z5`
  - PAN: `AAACM1234A`
- [ ] **Address:**
  - Address Line 1: `123 Test Street`
  - City: `Hyderabad`
  - State: `Telangana`
  - Pincode: `500001`
- [ ] **Contact:**
  - Phone: `+91-9876543210`
  - Email: `info@testcompany.com`
- [ ] Upload company logo (optional)
- [ ] Select theme color
- [ ] Submit onboarding form

**Expected Results:**
- ✅ Company record created in `companies` table
- ✅ User assigned as admin in `company_users` table
- ✅ Redirected to dashboard
- ✅ Company status = 'active' or 'pending'

**Issues Found:**
```
Issue: _______________________________________________
Error Message: _______________________________________
```

---

### Step 1.3: Verify User Roles & Permissions

**Objective:** Ensure proper role assignment and access control

**Steps:**
- [ ] Navigate to `/admin/users`
- [ ] Verify your user appears in the list
- [ ] Check role badge shows "Admin"
- [ ] Click "Invite User" button
- [ ] Fill invite form:
  - Email: `newuser@example.com`
  - Username: `Test User`
  - Role: Select `Sales`
- [ ] Send invitation
- [ ] Check if invitation email sent

**Expected Results:**
- ✅ User list displays correctly
- ✅ Current user has admin role
- ✅ Invite dialog works
- ✅ New user created in auth.users
- ✅ Role assigned in company_users table

**Issues Found:**
```
Issue: _______________________________________________
Error Message: _______________________________________
```

---

## Phase 2: Company Management (Platform Admin)

### Step 2.1: Platform Admin Access

**Objective:** Verify platform admin capabilities

**Prerequisites:**
- You must have platform admin role assigned
- Check by running SQL: `SELECT * FROM company_users WHERE user_id = auth.uid()`

**Steps:**
- [ ] Navigate to `/admin/companies`
- [ ] Verify you can see all companies (not just your own)
- [ ] Check company list shows:
  - Company name
  - Type (Media Owner/Agency/Platform Admin)
  - Status
  - Created date

**Expected Results:**
- ✅ All companies visible
- ✅ Filter and search work
- ✅ Can edit any company

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 2.2: Create Test Companies

**Objective:** Test multi-tenant data isolation

**Test Media Owner Company:**
- [ ] Click "New Company"
- [ ] Name: `Matrix Outdoor Media`
- [ ] Type: `Media Owner`
- [ ] GSTIN: `36AAACM1234A1Z5`
- [ ] Status: `Active`
- [ ] Submit

**Test Agency Company:**
- [ ] Click "New Company"
- [ ] Name: `Creative Ads Agency`
- [ ] Type: `Agency`
- [ ] GSTIN: `29AABCC5678D1Z9`
- [ ] Status: `Active`
- [ ] Submit

**Expected Results:**
- ✅ Both companies created
- ✅ Unique company_id generated for each
- ✅ Each company has separate data namespace

**Issues Found:**
```
Issue: _______________________________________________
```

---

## Phase 3: Media Assets

### Step 3.1: Create Media Asset

**Objective:** Add inventory to media owner's catalog

**Steps:**
- [ ] Navigate to `/admin/media-assets`
- [ ] Click "New Asset" button
- [ ] **Basic Info:**
  - City: `Hyderabad`
  - Media Type: `Bus Shelter`
  - Area: `Begumpet`
  - Location: `Opposite Metro Station`
- [ ] **Specifications:**
  - Dimension: `40x10 ft`
  - Direction: `North Facing`
  - Latitude: `17.4435`
  - Longitude: `78.4477`
- [ ] **Pricing:**
  - Card Rate: `50000`
  - Base Rate: `35000`
  - Printing Charge: `5000`
  - Mounting Charge: `3000`
- [ ] **Status:** `Available`
- [ ] **Municipal Info:**
  - Authority: `GHMC`
  - Municipal ID: `GHMC-2024-001`
- [ ] Upload 2-4 photos
- [ ] Click "Save"

**Expected Results:**
- ✅ Asset ID auto-generated (e.g., `HYD-BSQ-0001`)
- ✅ Photos uploaded to storage bucket `media-assets`
- ✅ Asset appears in list
- ✅ Status shows as `Available`

**Issues Found:**
```
Issue: _______________________________________________
Error Message: _______________________________________
Photo Upload Issues: __________________________________
```

---

### Step 3.2: Test Asset Features

**Map View Test:**
- [ ] Navigate to `/admin/media-assets-map`
- [ ] Verify asset marker appears at correct coordinates
- [ ] Click marker - popup shows asset details
- [ ] Test clustering (if multiple assets)

**Asset Detail Page:**
- [ ] Click on asset from list
- [ ] Navigate to `/admin/media-assets/[id]`
- [ ] Verify:
  - Photo gallery works
  - All details display correctly
  - Edit button functions
  - Booking history section visible

**Search & Filter:**
- [ ] Test city filter
- [ ] Test area filter
- [ ] Test media type filter
- [ ] Test status filter (Available/Booked/Blocked)
- [ ] Test search by location

**Expected Results:**
- ✅ All filters work correctly
- ✅ Map displays assets accurately
- ✅ Detail page shows complete info

**Issues Found:**
```
Issue: _______________________________________________
```

---

## Phase 4: Leads & Clients

### Step 4.1: Create Lead

**Objective:** Test lead capture and conversion workflow

**Manual Lead Creation:**
- [ ] Navigate to `/admin/leads`
- [ ] Click "New Lead"
- [ ] Fill form:
  - Name: `Acme Corporation`
  - Contact Person: `John Doe`
  - Email: `john@acme.com`
  - Phone: `+91-9876543210`
  - Source: `Manual Entry`
  - Requirement: `Bus shelters in Hyderabad for 3 months`
  - Location: `Begumpet, Banjara Hills`
- [ ] Save lead

**Lead Status Workflow:**
- [ ] Change status from `New` to `Qualified`
- [ ] Add notes
- [ ] Assign to sales user (if available)

**Convert to Client:**
- [ ] Click "Convert to Client" button
- [ ] Verify form pre-fills with lead data
- [ ] Complete additional client details
- [ ] Save as client

**Expected Results:**
- ✅ Lead created successfully
- ✅ Status changes tracked
- ✅ Lead converted to client
- ✅ Client ID generated (e.g., `CLT-2025-001`)

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 4.2: Client Management

**Create Complete Client:**
- [ ] Navigate to `/admin/clients`
- [ ] Click "New Client"
- [ ] **Basic Tab:**
  - Name: `Matrix Network Solutions`
  - Company: `Matrix Network Solutions Pvt Ltd`
  - Email: `billing@matrix.com`
  - Phone: `+91-9988776655`
- [ ] **Billing/KYC Tab:**
  - GSTIN: `36AABCM1234P1Z5`
  - PAN: `AABCM1234P`
  - Billing Address Line 1: `Plot 123, Cyber Towers`
  - Billing City: `Hyderabad`
  - Billing State: `Telangana`
  - Billing Pincode: `500081`
- [ ] **Shipping Address:**
  - Check "Same as Billing" OR fill separate
- [ ] **Contacts Tab:**
  - Add contact person:
    - Name: `Raghu Gajula`
    - Email: `raghu@matrix.com`
    - Phone: `+91-9876543210`
    - Designation: `Director`

**Document Upload:**
- [ ] Upload GST certificate
- [ ] Upload PAN card
- [ ] Upload company registration

**Expected Results:**
- ✅ Client saved with all details
- ✅ Documents uploaded successfully
- ✅ Client appears in list
- ✅ All tabs display correct data

**Issues Found:**
```
Issue: _______________________________________________
Document Upload Issues: ________________________________
```

---

## Phase 5: Plans & Quotations

### Step 5.1: Create Media Plan

**Objective:** Build quotation for client

**Steps:**
- [ ] Navigate to `/admin/plans`
- [ ] Click "New Plan"
- [ ] **Plan Details:**
  - Client: Select `Matrix Network Solutions`
  - Plan Name: `Hyderabad Bus Shelter Campaign`
  - Start Date: `2025-02-01`
  - End Date: `2025-04-30`
- [ ] Click "Next" or "Add Assets"

**Add Assets to Plan:**
- [ ] View available assets
- [ ] Filter by city: `Hyderabad`
- [ ] Filter by type: `Bus Shelter`
- [ ] Select 5-10 assets
- [ ] Click "Add to Plan"

**Configure Pricing:**
- [ ] For each asset:
  - Review card rate
  - Set negotiated rate (if different)
  - Verify printing charge
  - Verify mounting charge
  - Apply discount (optional)
- [ ] Review plan summary:
  - Check subtotal
  - Check GST @ 18%
  - Check grand total

**AI Rate Recommender (Optional):**
- [ ] Click AI rate button
- [ ] Review suggested rates
- [ ] Apply or adjust

**Save Plan:**
- [ ] Click "Save Plan"
- [ ] Verify Plan ID generated (e.g., `PLAN-2025-January-001`)

**Expected Results:**
- ✅ Plan created with all assets
- ✅ Pricing calculated correctly
- ✅ GST breakdown accurate
- ✅ Plan ID follows pattern

**Issues Found:**
```
Issue: _______________________________________________
Calculation Errors: ___________________________________
```

---

### Step 5.2: Plan Export & Sharing

**Export Tests:**
- [ ] Open plan detail page
- [ ] Click "Export to Excel"
- [ ] Verify Excel file downloads
- [ ] Open Excel - check:
  - All assets listed
  - Pricing accurate
  - GST breakdown correct
  - Company branding present

**Public Share Link:**
- [ ] Click "Generate Share Link"
- [ ] Copy link
- [ ] Open in incognito window
- [ ] Navigate to `/admin/plans/[id]/share/[shareId]`
- [ ] Verify:
  - Public access (no login required)
  - Plan details visible
  - Client can't edit
  - Acceptance buttons work (if enabled)

**Expected Results:**
- ✅ Excel export works perfectly
- ✅ Share link accessible without login
- ✅ Data displays correctly

**Issues Found:**
```
Issue: _______________________________________________
Export Format Issues: _________________________________
```

---

## Phase 6: Campaigns

### Step 6.1: Convert Plan to Campaign

**Objective:** Execute approved plan as campaign

**Steps:**
- [ ] Open approved plan
- [ ] Verify plan status = `Approved`
- [ ] Click "Convert to Campaign"
- [ ] Confirm conversion
- [ ] Wait for processing

**Expected Results:**
- ✅ Campaign ID generated (e.g., `CAM-2025-January-001`)
- ✅ Campaign record created
- ✅ All plan assets linked to campaign
- ✅ Asset statuses updated to `Booked`
- ✅ Mounting tasks auto-created
- ✅ Redirected to campaign detail page

**Issues Found:**
```
Issue: _______________________________________________
Error Message: _______________________________________
```

---

### Step 6.2: Campaign Management

**Upload Creative:**
- [ ] Navigate to campaign detail
- [ ] Find "Creative Upload" section
- [ ] Upload creative files (JPG/PNG/PDF)
- [ ] Verify files uploaded to storage

**Assign Operations:**
- [ ] Go to "Operations" tab
- [ ] For each asset:
  - Assign mounter name
  - Set scheduled date
  - Add instructions
- [ ] Save assignments

**Campaign Status Tracking:**
- [ ] Check campaign status
- [ ] Update status: `Planned` → `In Progress`
- [ ] Monitor asset installation progress

**Expected Results:**
- ✅ Creatives uploaded successfully
- ✅ Operations tasks assigned
- ✅ Status workflow functional

**Issues Found:**
```
Issue: _______________________________________________
```

---

## Phase 7: Operations & Proof Upload

### Step 7.1: Operations Dashboard

**Objective:** Manage field operations and proof collection

**Access Operations:**
- [ ] Navigate to `/admin/operations`
- [ ] View list of mounting assignments
- [ ] Filter by:
  - Campaign
  - Status (Pending/Assigned/Installed/Verified)
  - Assigned mounter
  - Date range

**Open Task:**
- [ ] Click on an assignment
- [ ] View asset details
- [ ] See location on map
- [ ] Check installation instructions

**Expected Results:**
- ✅ Operations list displays
- ✅ Filters work correctly
- ✅ Task details complete

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 7.2: Proof Photo Upload

**Mobile Workflow Test:**
- [ ] Open `/admin/operations/[id]/upload` on mobile
- [ ] Verify mobile-optimized layout

**Upload 4 Required Photos:**
1. **Newspaper Photo:**
   - [ ] Take/upload newspaper with visible date
   - [ ] Verify upload successful
   
2. **Geo-tagged Photo:**
   - [ ] Enable location
   - [ ] Take photo with GPS data
   - [ ] Verify coordinates captured
   
3. **Traffic View 1:**
   - [ ] Capture wide angle traffic view
   - [ ] Upload
   
4. **Traffic View 2:**
   - [ ] Capture opposite angle
   - [ ] Upload

**Submit Proof:**
- [ ] Click "Submit Proof"
- [ ] Verify status changes to `Proof Uploaded`
- [ ] Check photos appear in campaign detail

**Photo Validation:**
- [ ] Verify EXIF data extracted
- [ ] Check GPS coordinates
- [ ] Validate timestamp

**Expected Results:**
- ✅ All 4 photos uploaded
- ✅ EXIF data captured
- ✅ Status updated
- ✅ Photos visible in gallery

**Issues Found:**
```
Issue: _______________________________________________
Photo Upload Errors: __________________________________
EXIF Data Issues: _____________________________________
```

---

### Step 7.3: Proof PPT Generation

**Generate Report:**
- [ ] Navigate to campaign detail
- [ ] Click "Generate Proof PPT"
- [ ] Wait for processing
- [ ] Download PPT file

**Verify PPT Content:**
- [ ] Open downloaded file
- [ ] Check:
  - Cover slide with campaign details
  - 2 photos per asset (newspaper + geotag)
  - Asset location info
  - Installation date
  - Company branding

**Expected Results:**
- ✅ PPT generated successfully
- ✅ All assets included
- ✅ Photos display correctly
- ✅ Layout professional

**Issues Found:**
```
Issue: _______________________________________________
PPT Quality Issues: ___________________________________
```

---

## Phase 8: Finance Module

### Step 8.1: Invoice Management

**Create Invoice from Campaign:**
- [ ] Navigate to `/admin/invoices`
- [ ] Click "New Invoice"
- [ ] Select campaign: Choose completed campaign
- [ ] Invoice auto-fills from campaign data
- [ ] Verify:
  - Client details correct
  - Line items from plan
  - Subtotal accurate
  - GST @ 18%
  - Grand total correct
- [ ] Set due date
- [ ] Add notes (optional)
- [ ] Save invoice

**Invoice ID:**
- [ ] Verify ID format: `INV-2024-25-0001`
- [ ] Check financial year correct

**Invoice PDF:**
- [ ] Click "Download PDF"
- [ ] Open PDF
- [ ] Verify:
  - Company letterhead
  - Invoice number
  - Client billing address
  - Item-wise breakdown
  - GST details
  - Bank details
  - Terms & conditions

**Expected Results:**
- ✅ Invoice created successfully
- ✅ Calculations accurate
- ✅ PDF formatted properly

**Issues Found:**
```
Issue: _______________________________________________
Calculation Errors: ___________________________________
PDF Issues: ___________________________________________
```

---

### Step 8.2: Expense Tracking

**Add Printing Expense:**
- [ ] Navigate to `/admin/expenses`
- [ ] Click "New Expense"
- [ ] Category: `Printing`
- [ ] Vendor: `PrintPro Solutions`
- [ ] Amount: `25000`
- [ ] GST: Auto-calculate @ 18%
- [ ] Link to campaign
- [ ] Upload invoice/receipt
- [ ] Payment status: `Pending`
- [ ] Save

**Add Mounting Expense:**
- [ ] Create new expense
- [ ] Category: `Mounting`
- [ ] Vendor: `QuickMount Services`
- [ ] Amount: `15000`
- [ ] Link to same campaign
- [ ] Save

**Track Payment:**
- [ ] Open expense
- [ ] Update status to `Paid`
- [ ] Add payment date
- [ ] Add payment reference

**Expected Results:**
- ✅ Expenses recorded correctly
- ✅ GST calculated
- ✅ Linked to campaign
- ✅ Payment tracking works

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 8.3: Payment Reminders

**Test Reminder System:**
- [ ] Create overdue invoice (due date in past)
- [ ] Wait for automated reminder (or trigger manually)
- [ ] Check if reminder sent

**Expected Results:**
- ✅ Reminders sent for overdue invoices
- ✅ Email notifications work

**Issues Found:**
```
Issue: _______________________________________________
```

---

## Phase 9: Reports & Analytics

### Step 9.1: Vacant Media Report

**Run Report:**
- [ ] Navigate to `/admin/reports/vacant-media`
- [ ] Set date range filters
- [ ] Filter by:
  - City: `Hyderabad`
  - Media Type: `Bus Shelter`
  - Area: `All`
- [ ] Click "Generate Report"

**Verify Data:**
- [ ] Check asset count
- [ ] Verify all shown assets have status `Available`
- [ ] Check availability dates
- [ ] Export to Excel

**Expected Results:**
- ✅ Only available assets shown
- ✅ Filters work correctly
- ✅ Export works

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 9.2: Revenue Report

**Generate Report:**
- [ ] Navigate to `/admin/reports/revenue`
- [ ] Select period: `Last 3 months`
- [ ] View:
  - Total revenue
  - Client-wise breakdown
  - Campaign-wise breakdown
  - Monthly trend chart

**Export:**
- [ ] Export to Excel
- [ ] Verify calculations match

**Expected Results:**
- ✅ Revenue calculated correctly
- ✅ Charts display properly
- ✅ Breakdown accurate

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 9.3: Occupancy Report

**Check Metrics:**
- [ ] Navigate to `/admin/reports/occupancy`
- [ ] View overall occupancy %
- [ ] City-wise occupancy
- [ ] Media type-wise occupancy
- [ ] Asset utilization history

**Expected Results:**
- ✅ Percentages calculated correctly
- ✅ Historical data shown
- ✅ Visual charts render

**Issues Found:**
```
Issue: _______________________________________________
```

---

## Phase 10: Edge Functions Testing

### Step 10.1: AI Assistant Functions

**Test Business AI Assistant:**
```bash
# Navigate to /admin/assistant
# Ask queries like:
```
- [ ] "How many vacant assets in Hyderabad?"
- [ ] "Show pending invoices"
- [ ] "List active campaigns"
- [ ] "Client Matrix summary"

**Expected Results:**
- ✅ AI understands query
- ✅ Fetches correct data
- ✅ Formats response nicely

**Test AI Lead Parser:**
- [ ] Create test lead with raw WhatsApp text
- [ ] Verify AI extracts:
  - Client name
  - Location preferences
  - Budget
  - Duration
  - Contact info

**Test AI Photo Quality:**
- [ ] Upload proof photo
- [ ] Check quality score
- [ ] Verify validation messages

**Issues Found:**
```
Function: _____________________________________________
Issue: _______________________________________________
Error: _______________________________________________
```

---

### Step 10.2: Automation Functions

**Auto-Create Mounting Tasks:**
- [ ] Convert plan to campaign
- [ ] Verify tasks auto-created for each asset
- [ ] Check task assignment logic

**Auto-Generate Invoice:**
- [ ] Complete campaign (status → Completed)
- [ ] Verify invoice auto-created
- [ ] Check invoice details match campaign

**Auto-Record Expenses:**
- [ ] Upload proof with completion
- [ ] Verify printing expense auto-created
- [ ] Verify mounting expense auto-created

**Send Payment Reminders:**
- [ ] Create overdue invoice
- [ ] Trigger reminder function
- [ ] Verify email sent

**Expected Results:**
- ✅ All automations trigger correctly
- ✅ Data created accurately
- ✅ Notifications sent

**Issues Found:**
```
Function: _____________________________________________
Issue: _______________________________________________
```

---

### Step 10.3: Document Generation

**Generate Proof PPT:**
```javascript
// Call edge function
supabase.functions.invoke('generate-proof-ppt', {
  body: { campaignId: 'CAM-2025-January-001' }
})
```
- [ ] Verify PPT generated
- [ ] Check file size reasonable
- [ ] Verify content quality

**Generate Invoice PDF:**
```javascript
supabase.functions.invoke('generate-invoice-pdf', {
  body: { invoiceId: 'INV-2024-25-0001' }
})
```
- [ ] PDF generated successfully
- [ ] Formatting correct
- [ ] All details present

**Generate Campaign Excel:**
- [ ] Export campaign data
- [ ] Verify all sheets present
- [ ] Check calculations

**Issues Found:**
```
Function: _____________________________________________
Issue: _______________________________________________
Output Quality: _______________________________________
```

---

### Step 10.4: Client Portal Functions

**Generate Magic Link:**
- [ ] Create client portal user
- [ ] Generate magic link
- [ ] Verify link works
- [ ] Test expiry (after 24 hours)

**Send Client Invite:**
- [ ] Send portal invite
- [ ] Check email delivered
- [ ] Verify invitation content
- [ ] Test acceptance flow

**Portal Access:**
- [ ] Login via magic link
- [ ] Verify client sees only their data
- [ ] Check campaigns visible
- [ ] Download proofs
- [ ] View invoices

**Expected Results:**
- ✅ Magic links work
- ✅ Data isolation enforced
- ✅ Client can access portal

**Issues Found:**
```
Issue: _______________________________________________
```

---

### Step 10.5: User Management Functions

**Create User:**
```javascript
supabase.functions.invoke('create-user', {
  body: {
    email: 'newuser@test.com',
    password: 'Test@1234',
    username: 'Test User',
    role: 'sales'
  }
})
```
- [ ] User created in auth.users
- [ ] Profile created
- [ ] Role assigned
- [ ] Company_users entry made

**Update User:**
- [ ] Change username
- [ ] Update role
- [ ] Modify permissions
- [ ] Verify changes saved

**List Users:**
- [ ] Fetch all company users
- [ ] Verify filtering works
- [ ] Check pagination

**Issues Found:**
```
Function: _____________________________________________
Issue: _______________________________________________
```

---

## Phase 11: Database Integrity

### Step 11.1: RLS Policy Testing

**Company Isolation Test:**
1. **Login as Company A user**
   - [ ] View media assets
   - [ ] Note asset IDs
   
2. **Login as Company B user**
   - [ ] Try to view Company A assets
   - [ ] Expected: Should NOT see them
   - [ ] Try direct URL access
   - [ ] Expected: Should get permission error

3. **Cross-Company Query Test:**
```sql
-- This should return 0 for non-admin users
SELECT COUNT(*) FROM media_assets 
WHERE company_id != get_current_user_company_id();
```

**Expected Results:**
- ✅ Users only see their company data
- ✅ Direct access blocked
- ✅ Queries filtered correctly

**Issues Found:**
```
RLS Policy Issue: _____________________________________
Leaked Data: __________________________________________
```

---

### Step 11.2: Trigger & Function Testing

**ID Generation:**
- [ ] Create plan → verify ID pattern
- [ ] Create campaign → verify ID pattern
- [ ] Create invoice → verify ID pattern
- [ ] Create expense → verify ID pattern

**Audit Logging:**
- [ ] Perform CRUD operations
- [ ] Check `activity_logs` table
- [ ] Verify all actions logged
- [ ] Check user tracking

**Cascade Deletes:**
- [ ] Delete campaign (if allowed)
- [ ] Verify related tasks deleted
- [ ] Verify related expenses handled
- [ ] Check referential integrity

**Expected Results:**
- ✅ All IDs generated correctly
- ✅ Audit trail complete
- ✅ Cascades work properly

**Issues Found:**
```
Function: _____________________________________________
Issue: _______________________________________________
```

---

### Step 11.3: Data Integrity Checks

**Run these SQL queries:**

**1. Orphaned Records:**
```sql
-- Plans without clients
SELECT * FROM plans WHERE client_id NOT IN (SELECT id FROM clients);

-- Campaigns without plans
SELECT * FROM campaigns WHERE plan_id NOT IN (SELECT id FROM plans);

-- Invoices without clients
SELECT * FROM invoices WHERE client_id NOT IN (SELECT id FROM clients);
```

**2. Duplicate IDs:**
```sql
-- Check for duplicate plan IDs
SELECT id, COUNT(*) FROM plans GROUP BY id HAVING COUNT(*) > 1;

-- Check for duplicate campaign IDs
SELECT id, COUNT(*) FROM campaigns GROUP BY id HAVING COUNT(*) > 1;
```

**3. Invalid Status Values:**
```sql
-- Check for invalid campaign status
SELECT * FROM campaigns 
WHERE status NOT IN ('Planned', 'InProgress', 'Completed', 'Cancelled');

-- Check for invalid asset status
SELECT * FROM media_assets 
WHERE status NOT IN ('Available', 'Booked', 'Blocked');
```

**4. Missing Required Data:**
```sql
-- Campaigns without assets
SELECT c.id, c.campaign_name 
FROM campaigns c
LEFT JOIN campaign_assets ca ON ca.campaign_id = c.id
WHERE ca.id IS NULL;
```

**Expected Results:**
- ✅ No orphaned records
- ✅ No duplicates
- ✅ All statuses valid
- ✅ All required data present

**Issues Found:**
```
Query: _______________________________________________
Issue: _______________________________________________
Record Count: _________________________________________
```

---

## Common Issues & Solutions

### Issue 1: Authentication Errors

**Problem:** Users can't login or signup fails

**Checklist:**
- [ ] Auto-confirm email enabled in Supabase
- [ ] Email provider configured
- [ ] Auth policies correct
- [ ] Profile creation trigger working

**Solution:**
```sql
-- Enable auto-confirm
UPDATE auth.config SET enable_email_confirmations = false;

-- Check trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

---

### Issue 2: RLS Permission Denied

**Problem:** "new row violates row-level security policy"

**Checklist:**
- [ ] User has active company association
- [ ] Company_id correctly set
- [ ] RLS policies not too restrictive
- [ ] User role has required permissions

**Solution:**
```sql
-- Check user's company
SELECT * FROM company_users WHERE user_id = auth.uid();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'media_assets';
```

---

### Issue 3: File Upload Fails

**Problem:** Photos/documents don't upload

**Checklist:**
- [ ] Storage bucket exists
- [ ] Bucket policies allow upload
- [ ] File size within limits
- [ ] File type allowed

**Solution:**
```sql
-- Check bucket
SELECT * FROM storage.buckets WHERE name = 'media-assets';

-- Check policies
SELECT * FROM storage.objects WHERE bucket_id = 'media-assets' LIMIT 1;
```

---

### Issue 4: Edge Function Timeout

**Problem:** Function exceeds 30s timeout

**Checklist:**
- [ ] Query optimization needed
- [ ] Too many operations
- [ ] External API slow
- [ ] Infinite loop

**Solution:**
- Add pagination
- Use async/await properly
- Cache expensive operations
- Add timeout handling

---

### Issue 5: Calculation Errors

**Problem:** Wrong totals in plans/invoices

**Checklist:**
- [ ] GST percentage correct (18%)
- [ ] Rounding issues
- [ ] Null values not handled
- [ ] Formula incorrect

**Solution:**
```javascript
// Proper calculation
const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
const total = subtotal + gstAmount;
```

---

## Testing Summary Template

### Overall Results

**Date Tested:** _______________  
**Tested By:** _______________  
**Environment:** Production / Staging / Development

### Phase Completion

| Phase | Status | Issues Found | Critical? |
|-------|--------|--------------|-----------|
| 1. Authentication | ✅ / ❌ / ⚠️ | | Yes / No |
| 2. Company Mgmt | ✅ / ❌ / ⚠️ | | Yes / No |
| 3. Media Assets | ✅ / ❌ / ⚠️ | | Yes / No |
| 4. Leads & Clients | ✅ / ❌ / ⚠️ | | Yes / No |
| 5. Plans | ✅ / ❌ / ⚠️ | | Yes / No |
| 6. Campaigns | ✅ / ❌ / ⚠️ | | Yes / No |
| 7. Operations | ✅ / ❌ / ⚠️ | | Yes / No |
| 8. Finance | ✅ / ❌ / ⚠️ | | Yes / No |
| 9. Reports | ✅ / ❌ / ⚠️ | | Yes / No |
| 10. Edge Functions | ✅ / ❌ / ⚠️ | | Yes / No |
| 11. Database | ✅ / ❌ / ⚠️ | | Yes / No |

### Critical Issues (Must Fix)

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Medium Priority Issues

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Low Priority / Enhancement

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Sign-Off

**Tested By:** _____________________  
**Date:** __________________________  
**Signature:** _____________________

**Approved By:** ___________________  
**Date:** __________________________  
**Signature:** _____________________

---

## Appendix

### A. Test Data Sets

**Sample Clients:**
- Matrix Network Solutions
- Acme Corporation
- Global Brands Ltd

**Sample Cities:**
- Hyderabad
- Bangalore
- Mumbai
- Delhi

**Sample Media Types:**
- Bus Shelter
- Hoarding
- Unipole
- Digital Display

### B. SQL Queries for Testing

```sql
-- Count assets by status
SELECT status, COUNT(*) FROM media_assets GROUP BY status;

-- Active campaigns
SELECT * FROM campaigns WHERE status = 'InProgress';

-- Overdue invoices
SELECT * FROM invoices 
WHERE due_date < CURRENT_DATE AND status != 'Paid';

-- Today's operations
SELECT * FROM operations_tasks 
WHERE scheduled_date = CURRENT_DATE;
```

### C. API Endpoints

**Edge Functions:**
- `/functions/v1/create-user`
- `/functions/v1/generate-proof-ppt`
- `/functions/v1/auto-generate-invoice`
- `/functions/v1/send-payment-reminders`

### D. Support Contacts

**Technical Support:** support@go-ads.in  
**Sales Queries:** sales@go-ads.in  
**Emergency:** +91-XXXXXXXXXX

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** February 2025

---

**End of Testing Guide**
