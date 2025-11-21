# Go-Ads 360° - Comprehensive Testing & Audit Checklist

## 🎯 Module-by-Module Testing Guide

### 1. **Authentication & User Management**

#### Test Cases:
- [ ] User registration with email/password
- [ ] Email verification (auto-confirm enabled)
- [ ] Login functionality
- [ ] Logout functionality
- [ ] Password reset flow
- [ ] Multi-company user assignment
- [ ] Role-based access control (admin, sales, ops, finance, viewer)
- [ ] Company switching functionality
- [ ] User profile updates

#### Company Isolation Tests:
- [ ] Verify users only see their company data
- [ ] Test switching between companies for multi-company users
- [ ] Verify platform admin can see all companies

---

### 2. **Company Management**

#### Test Cases:
- [ ] Create new company (media owner/agency)
- [ ] Update company details
- [ ] Upload company logo
- [ ] Set theme colors
- [ ] Manage company users
- [ ] Invite new users to company
- [ ] Remove users from company
- [ ] Transfer company ownership

#### Subscription Tests:
- [ ] Check free tier limits (assets, users, campaigns)
- [ ] Upgrade to Pro subscription
- [ ] Subscription renewal
- [ ] Subscription cancellation
- [ ] Usage tracking against limits

---

### 3. **Media Assets Management**

#### Test Cases:
- [ ] Add new media asset
- [ ] Auto-generate asset ID (city-media type pattern)
- [ ] Upload asset photos (4 photos per asset)
- [ ] Update asset details
- [ ] Change asset status (Available/Booked/Blocked)
- [ ] Set public/private visibility
- [ ] Asset search and filtering
- [ ] Map view with asset markers
- [ ] Asset detail view with gallery
- [ ] Power bill linking and tracking
- [ ] Maintenance record management

#### Company Isolation Tests:
- [ ] Users only see assets from their company
- [ ] Public assets visible in marketplace
- [ ] Photo storage paths include company_id
- [ ] Asset creation adds company_id automatically

#### Export Tests:
- [ ] Export vacant media report (PPT)
- [ ] Filter by city/area/media type
- [ ] Verify images load correctly in PPT
- [ ] Check PPT branding and formatting

---

### 4. **Client Management**

#### Test Cases:
- [ ] Add new client
- [ ] Auto-generate client ID
- [ ] Add multiple contact persons
- [ ] Update client details
- [ ] GST number validation
- [ ] Billing address management
- [ ] Shipping address management
- [ ] Document upload (GST certificate, PAN)
- [ ] Client search and filtering
- [ ] Client detail view

#### Company Isolation Tests:
- [ ] Clients filtered by company_id
- [ ] Client documents stored with company_id in path

---

### 5. **Plan Builder & Quotations**

#### Test Cases:
- [ ] Create new plan
- [ ] Auto-generate plan ID
- [ ] Select client
- [ ] Add assets to plan
- [ ] Configure start/end dates
- [ ] Set negotiated rates
- [ ] Add printing charges
- [ ] Add mounting charges
- [ ] Apply discounts
- [ ] Calculate GST (CGST 9% + SGST 9%)
- [ ] View live pricing summary
- [ ] AI rate recommender
- [ ] Save plan as draft
- [ ] Send plan for approval
- [ ] Plan approval workflow
- [ ] Plan rejection with comments

#### Export Tests:
- [ ] **Export Plan as PPT**
  - [ ] Title slide with company branding
  - [ ] Asset slides with 2 images per slide
  - [ ] Asset details slide
  - [ ] Summary slide
  - [ ] Verify all images load correctly
  - [ ] Check formatting and colors
  - [ ] Company logo and theme colors applied

- [ ] **Export Plan as Excel**
  - [ ] Header with company details
  - [ ] Client information section
  - [ ] Plan summary section
  - [ ] Asset details table with all columns
  - [ ] GST calculations (CGST/SGST formulas)
  - [ ] Total row with sum formulas
  - [ ] Formatting (colors, borders, fonts)
  - [ ] Currency formatting (₹ symbol)

- [ ] **Export Work Order PDF**
  - [ ] Company letterhead
  - [ ] Client details
  - [ ] Asset list with details
  - [ ] Terms and conditions
  - [ ] Signatures block
  - [ ] Custom document types (quotation/estimate)

#### Company Isolation Tests:
- [ ] Plans filtered by company_id
- [ ] Can only select clients from same company
- [ ] Can only select assets from same company or public assets
- [ ] Export functions verify company access

---

### 6. **Plan to Campaign Conversion** ⚠️ CRITICAL

#### Test Cases:
- [ ] Convert approved plan to campaign
- [ ] Prevent conversion of non-approved plans
- [ ] Prevent duplicate conversions
- [ ] Auto-generate campaign ID
- [ ] Copy all plan details to campaign
- [ ] Create campaign_assets from plan_items
- [ ] Update plan status to "Converted"
- [ ] Update media asset status to "Booked"
- [ ] Upload creative files
- [ ] Set campaign dates
- [ ] Add campaign notes

#### Company Isolation Tests:
- [ ] **Campaign created with company_id** ✅ FIXED
- [ ] Campaign_assets inherit company context
- [ ] Only show plans from same company for conversion
- [ ] Verify company_id in campaigns table
- [ ] Verify company_id in campaign_assets table

#### Edge Cases:
- [ ] Handle conversion failure gracefully
- [ ] Rollback on partial failure
- [ ] Validate asset availability for date range
- [ ] Handle missing plan items

---

### 7. **Campaign Management**

#### Test Cases:
- [ ] View campaign list
- [ ] Filter by status/client/date
- [ ] Campaign detail view
- [ ] Update campaign status (Planned → Active → Completed)
- [ ] Assign operations team
- [ ] Upload creative files
- [ ] View campaign assets
- [ ] Track mounting progress
- [ ] Generate work orders
- [ ] Link to original plan

#### Company Isolation Tests:
- [ ] Campaigns filtered by company_id
- [ ] Campaign assets filtered by company_id
- [ ] Creative files stored with company_id in path

---

### 8. **Operations & Proof Upload** ⚠️ CRITICAL

#### Test Cases:
- [ ] View assigned mounting tasks
- [ ] Mobile-optimized interface
- [ ] Upload 4 proof photos per asset:
  - [ ] Newspaper photo
  - [ ] Geo-tagged photo
  - [ ] Traffic photo 1
  - [ ] Traffic photo 2
- [ ] EXIF data validation (GPS, timestamp)
- [ ] Photo category tagging
- [ ] Update mounting status
- [ ] Batch photo upload
- [ ] Photo preview before upload
- [ ] Mark task as complete
- [ ] Admin verification

#### Company Isolation Tests:
- [ ] **Photos stored with company_id in path** ✅ FIXED
- [ ] **media_photos table has company_id** ✅ FIXED
- [ ] Photo access filtered by company_id
- [ ] RLS policies on media_photos
- [ ] Storage RLS policies enforce company_id

#### Export Tests:
- [ ] **Generate Proof of Display PPT**
  - [ ] Title slide with campaign details
  - [ ] Asset slides (2 photos per slide)
  - [ ] Photo category badges
  - [ ] GPS coordinates displayed
  - [ ] Upload dates shown
  - [ ] Company branding applied
  - [ ] Summary slide with totals
  - [ ] Verify all photos load correctly
  - [ ] Check photo quality and sizing

---

### 9. **Finance Management**

#### Test Cases:
- [ ] Generate invoice from campaign
- [ ] Auto-generate invoice ID (INV-YYYY-####)
- [ ] Calculate GST breakdown
- [ ] Set payment terms
- [ ] Track payment status
- [ ] Record expenses (printing/mounting)
- [ ] Link expenses to campaigns
- [ ] Generate expense reports
- [ ] Invoice approval workflow
- [ ] Payment reminders

#### Export Tests:
- [ ] **Generate Invoice PDF**
  - [ ] Company letterhead
  - [ ] Invoice number and date
  - [ ] Client billing details
  - [ ] Line items with GST breakdown
  - [ ] Amount in words
  - [ ] Bank details
  - [ ] Terms and conditions
  - [ ] Digital signature
  - [ ] PDF formatting and quality

- [ ] **Generate Campaign Excel Report**
  - [ ] Campaign summary
  - [ ] Asset list with costs
  - [ ] Expense breakdown
  - [ ] Payment tracking
  - [ ] GST calculations

#### Company Isolation Tests:
- [ ] Invoices filtered by company_id
- [ ] Expenses filtered by company_id
- [ ] Can only invoice campaigns from same company
- [ ] Invoice PDFs verify company access

---

### 10. **Reports & Analytics**

#### Test Cases:
- [ ] Vacant media report
- [ ] Revenue analytics
- [ ] Occupancy rate calculation
- [ ] Client-wise revenue breakdown
- [ ] Campaign performance metrics
- [ ] Asset utilization tracking
- [ ] Financial aging reports
- [ ] Custom date range filtering
- [ ] Chart visualizations
- [ ] Export to Excel/PDF

#### Company Isolation Tests:
- [ ] All reports filtered by company_id
- [ ] Charts show company-specific data
- [ ] KPIs calculated per company

---

### 11. **AI Assistant**

#### Test Cases:
- [ ] Natural language queries
- [ ] Vacant assets search
- [ ] Client summary requests
- [ ] Campaign status queries
- [ ] Invoice tracking
- [ ] Revenue calculations
- [ ] Response formatting (tables/cards/text)
- [ ] Query history
- [ ] Error handling for invalid queries

#### Company Isolation Tests:
- [ ] **AI queries filtered by company_id** ✅ FIXED
- [ ] Results only show company-specific data
- [ ] No data leakage between companies

---

### 12. **Marketplace**

#### Test Cases:
- [ ] View public media assets
- [ ] Filter by city/media type/size
- [ ] Asset detail view
- [ ] Request booking
- [ ] Export marketplace catalog
- [ ] Compare assets
- [ ] Save favorites

#### Company Isolation Tests:
- [ ] Only show public assets (is_public = true)
- [ ] Don't show private assets from other companies
- [ ] Booking requests link requester and owner companies

---

### 13. **Client Portal**

#### Test Cases:
- [ ] Client user login
- [ ] View assigned campaigns
- [ ] View proof galleries
- [ ] Download reports
- [ ] View invoices
- [ ] Make payments (Razorpay)
- [ ] Read-only access enforcement

#### Company Isolation Tests:
- [ ] Client portal users linked to specific clients
- [ ] Only see campaigns/invoices for their client
- [ ] No access to internal company data

---

## 🔐 Security Audit Checklist

### Row-Level Security (RLS)
- [ ] All tables have RLS enabled
- [ ] RLS policies filter by company_id
- [ ] Platform admin bypass policies in place
- [ ] Test RLS with different user roles
- [ ] Verify no data leakage between companies

### Authentication
- [ ] Strong password requirements
- [ ] Session timeout handling
- [ ] Logout clears all sessions
- [ ] Token refresh mechanism
- [ ] Protected routes require auth

### Storage Security
- [ ] **Storage paths include company_id** ✅ FIXED
- [ ] **Storage RLS policies enforce company isolation** ✅ FIXED
- [ ] Signed URLs with expiration
- [ ] File type validation
- [ ] File size limits
- [ ] Malware scanning (future)

### API Security
- [ ] **Edge functions verify company_id** ✅ FIXED
- [ ] Rate limiting in place
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection

---

## 📤 Export/Import Functionality Audit

### PowerPoint (PPT) Exports ⚠️ CRITICAL
1. **Plan PPT Export**
   - [ ] Company branding applied
   - [ ] All images load correctly
   - [ ] Formatting preserved
   - [ ] File downloads successfully
   - [ ] Company_id verification ✅ FIXED

2. **Proof of Display PPT**
   - [ ] Campaign details accurate
   - [ ] Photos grouped by asset
   - [ ] GPS coordinates displayed
   - [ ] Category badges correct
   - [ ] Summary slide accurate
   - [ ] Company_id verification ✅ FIXED

3. **Vacant Media PPT**
   - [ ] Asset details complete
   - [ ] Images load correctly
   - [ ] Summary by city accurate
   - [ ] Filtering works correctly

### Excel Exports
1. **Plan Excel Export**
   - [ ] All columns present
   - [ ] Formulas calculate correctly
   - [ ] Currency formatting (₹)
   - [ ] GST calculations accurate
   - [ ] Totals match plan summary
   - [ ] Company_id verification ✅ FIXED

2. **Campaign Excel Report**
   - [ ] Asset breakdown correct
   - [ ] Expense tracking accurate
   - [ ] Payment status reflected
   - [ ] Company_id verification ✅ FIXED

### PDF Exports
1. **Invoice PDF**
   - [ ] Company letterhead
   - [ ] GST breakdown accurate
   - [ ] Amount in words correct
   - [ ] Bank details present
   - [ ] Terms and conditions
   - [ ] Company_id verification ✅ FIXED

2. **Work Order PDF**
   - [ ] Asset list complete
   - [ ] Instructions clear
   - [ ] Signatures block
   - [ ] Custom document types work

---

## 🧪 Edge Function Testing

### Critical Edge Functions to Test:
1. [ ] `generate-proof-ppt` - ✅ Company_id filtering added
2. [ ] `generate-invoice-pdf` - ✅ Company access verification added
3. [ ] `generate-campaign-excel` - ✅ Company access verification added
4. [ ] `ai-assistant` - ✅ Company_id filtering verified
5. [ ] `business-ai-assistant` - ✅ Company_id filtering verified
6. [ ] `ask-ai` - ✅ Company_id filtering verified
7. [ ] `rate-suggester` - ✅ Company_id context verified
8. [ ] `auto-create-mounting-tasks` - ✅ Company_id verified
9. [ ] `send-payment-reminders` - ✅ Company access verification added

### Testing Steps for Each Function:
1. [ ] Test with authenticated user
2. [ ] Test with unauthenticated user (should fail)
3. [ ] Test with user from different company (should fail)
4. [ ] Test with platform admin (should succeed for all)
5. [ ] Test with missing parameters
6. [ ] Test with invalid IDs
7. [ ] Verify response format
8. [ ] Check error handling

---

## 🔄 Workflow Testing

### Complete End-to-End Workflow:
1. [ ] **Lead to Client**
   - Capture lead → Qualify → Convert to client

2. [ ] **Client to Plan**
   - Create plan → Add assets → Set pricing → Get approval

3. [ ] **Plan to Campaign** ⚠️ CRITICAL
   - Convert approved plan → Create campaign with company_id ✅ FIXED
   - Upload creatives → Assign operations

4. [ ] **Campaign to Proof**
   - Upload 4 photos per asset with company_id ✅ FIXED
   - Verify photos → Generate proof PPT

5. [ ] **Proof to Invoice**
   - Generate invoice from campaign
   - Send to client → Track payment

### Cross-Module Data Flow:
- [ ] Data consistency across modules
- [ ] company_id propagates correctly ✅ CRITICAL
- [ ] Status updates reflected everywhere
- [ ] Timestamps accurate
- [ ] Audit logs complete

---

## 🚀 Performance Testing

- [ ] Page load times < 3 seconds
- [ ] Large dataset handling (1000+ assets)
- [ ] Image loading optimization
- [ ] Database query performance
- [ ] Export generation time (< 30 seconds)
- [ ] Concurrent user handling
- [ ] Mobile responsiveness

---

## 📱 Mobile Testing

- [ ] Operations photo upload on mobile
- [ ] Responsive layouts
- [ ] Touch interactions
- [ ] Camera integration
- [ ] Offline capability (PWA)
- [ ] Mobile-optimized forms

---

## 🎨 UI/UX Testing

- [ ] Theme colors applied correctly
- [ ] Company branding reflected
- [ ] Consistent styling across modules
- [ ] Accessible color contrasts
- [ ] Loading states
- [ ] Error messages clear
- [ ] Success confirmations
- [ ] Empty states informative

---

## 🐛 Error Handling Testing

- [ ] Network failures
- [ ] Invalid data input
- [ ] Missing required fields
- [ ] Duplicate entries
- [ ] Permission denials
- [ ] File upload failures
- [ ] Export generation failures
- [ ] Database constraint violations

---

## ✅ Pre-Production Checklist

### Security:
- [ ] All RLS policies enabled and tested
- [ ] Storage security verified
- [ ] Edge function authentication verified
- [ ] Environment variables secured
- [ ] Secrets management configured

### Data Integrity:
- [ ] company_id in all multi-tenant tables ✅ CRITICAL
- [ ] Foreign key constraints in place
- [ ] Cascade delete rules configured
- [ ] Backup strategy defined

### Performance:
- [ ] Database indexes optimized
- [ ] Image optimization enabled
- [ ] CDN configured
- [ ] Caching strategy implemented

### Monitoring:
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured
- [ ] Audit logs working
- [ ] Performance monitoring

---

## 🎯 Priority Testing Order

### Phase 1: Critical Security (COMPLETED ✅)
1. ✅ Company_id in campaigns table
2. ✅ Company_id in media_photos table
3. ✅ Storage RLS policies with company_id
4. ✅ Edge function company access verification
5. ✅ Plan to campaign conversion with company_id

### Phase 2: Core Workflows (NEXT)
1. [ ] Complete plan creation and approval
2. [ ] Plan to campaign conversion end-to-end
3. [ ] Operations photo upload workflow
4. [ ] Proof PPT generation
5. [ ] Invoice generation

### Phase 3: Export Functionality
1. [ ] Plan PPT export
2. [ ] Plan Excel export
3. [ ] Proof PPT generation
4. [ ] Invoice PDF generation
5. [ ] Campaign Excel report

### Phase 4: Advanced Features
1. [ ] AI assistant queries
2. [ ] Marketplace functionality
3. [ ] Client portal
4. [ ] Analytics dashboards
5. [ ] Multi-company user switching

---

## 📝 Known Issues Fixed

1. ✅ **Campaign creation missing company_id** - FIXED in ConvertToCampaignDialog and PlanDetail
2. ✅ **media_photos table missing company_id** - FIXED with migration and RLS policies
3. ✅ **Storage paths not including company_id** - FIXED in photo upload functions
4. ✅ **Storage RLS policies not enforcing company isolation** - FIXED with updated policies
5. ✅ **Edge functions not verifying company access** - FIXED in generate-proof-ppt, generate-invoice-pdf, generate-campaign-excel
6. ✅ **Export functions not verifying company access** - FIXED in planExports.ts and generatePlanExcel.ts

---

## 🔍 Testing Tools

- **Database**: Supabase Dashboard → SQL Editor
- **API**: Postman / Thunder Client
- **Frontend**: Chrome DevTools + React DevTools
- **Security**: Manual RLS testing with different user accounts
- **Performance**: Lighthouse / WebPageTest
- **Mobile**: Chrome Mobile Emulator + Real devices

---

## 📊 Test Results Template

```markdown
### Test: [Test Name]
- **Date**: [Date]
- **Tester**: [Name]
- **Status**: [Pass/Fail/Partial]
- **Issues Found**: 
  - [Issue 1]
  - [Issue 2]
- **Notes**: [Additional observations]
```

---

**Last Updated**: 2025-01-21
**Version**: 1.0
**Status**: Ready for comprehensive testing ✅
