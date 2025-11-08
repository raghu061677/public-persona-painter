# Go-Ads 360° - AI Code Generation Prompt

**Use this prompt to regenerate or extend the Go-Ads 360° platform with AI code generators (Lovable, v0, Bolt, etc.)**

---

## Project Overview

Create a **full-stack SaaS platform for Out-of-Home (OOH) media management** called **Go-Ads 360°**.

The platform serves media owners, advertising agencies, and brand clients, managing the complete lifecycle from lead capture through campaign execution to financial reporting.

---

## Core Requirements

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite as build tool
- Tailwind CSS for styling
- shadcn/ui component library
- Zustand for state management
- React Router DOM for navigation
- Leaflet for maps
- React Query for data fetching

**Backend:**
- Supabase (PostgreSQL database)
- Supabase Auth for authentication
- Supabase Storage for files
- Supabase Edge Functions for serverless logic
- Row Level Security (RLS) for data access

**AI Integration:**
- OpenAI GPT-4o or Gemini Pro for AI features
- Edge functions for AI processing

---

## Database Schema

### Core Tables

1. **media_assets** - OOH advertising asset inventory
   - ID format: `{CITY}-{TYPE}-{SEQ}` (e.g., `HYD-UP-0001`)
   - Fields: location, area, city, media_type, dimensions, status, pricing, images
   - Status: Available, Booked, Maintenance, Inactive
   - Include: power bill tracking fields, vendor details, ownership type

2. **clients** - Customer database
   - ID format: `CLI-{SEQ}`
   - Fields: name, company, GST, contact details, billing/shipping addresses
   - Support: audit logging via triggers

3. **plans** - Media plans and quotations
   - ID format: `PLAN-{YEAR}-{MONTH}-{SEQ}`
   - Fields: plan_name, client_id, start/end dates, totals, status
   - Status: Draft, Sent, Approved, Rejected, Converted
   - Include: share_token for public links, export_links JSON

4. **plan_items** - Assets in each plan
   - Link to plan_id and asset_id
   - Fields: card_rate, sales_price, discount, printing/mounting charges
   - Calculate: subtotal, GST, total per line

5. **campaigns** - Active advertising campaigns
   - ID format: `CAM-{YEAR}-{MONTH}-{SEQ}`
   - Link to source plan_id
   - Track: assigned operations team, status, dates

6. **campaign_assets** - Assets in campaigns with installation tracking
   - Status: Pending, Assigned, Installed, Verified, Rejected
   - Photos: JSON with newspaper, geotag, traffic view URLs

7. **invoices** - Client invoicing
   - ID format: `INV-{FY}-{SEQ}` (Financial Year format)
   - Fields: items JSON, totals, payments array, balance_due
   - Status: Draft, Sent, PartiallyPaid, Paid, Overdue

8. **expenses** - Business expenses
   - ID format: `EXP-{FY}-{SEQ}`
   - Categories: Printing, Mounting, Transportation, Other
   - Link to campaign_id if applicable

9. **client_documents** - KYC documents storage
   - Types: GSTIN, PAN, AddressProof, Other
   - Store in private Supabase bucket

10. **asset_power_bills** - Electricity bills per asset
    - Monthly tracking with payment status

11. **leads** - Sales leads from various sources
    - Sources: WhatsApp, Email, Web, Phone
    - AI parsing capability

### Supporting Tables

- **profiles** - User profile extensions
- **user_roles** - Role assignments (admin, sales, operations, finance, user)
- **plan_templates** - Reusable plan configurations
- **plan_approvals** - Approval workflow tracking
- **approval_settings** - Approval rules configuration
- **organization_settings** - Company branding
- **code_counters** - Sequential ID generation
- **import_logs** - Bulk import tracking
- **client_audit_log** - Client change history

### Database Functions

Implement these PostgreSQL functions:

```sql
-- Financial year (Apr-Mar)
CREATE FUNCTION get_financial_year() RETURNS text;

-- ID generators
CREATE FUNCTION generate_plan_id() RETURNS text;
CREATE FUNCTION generate_campaign_id() RETURNS text;
CREATE FUNCTION generate_invoice_id() RETURNS text;
CREATE FUNCTION generate_expense_id() RETURNS text;
CREATE FUNCTION generate_estimation_id() RETURNS text;
CREATE FUNCTION generate_share_token() RETURNS text;

-- Approvals
CREATE FUNCTION create_plan_approval_workflow(plan_id text);
CREATE FUNCTION process_plan_approval(approval_id uuid, status approval_status, comments text);

-- Utilities
CREATE FUNCTION has_role(user_id uuid, role app_role) RETURNS boolean;
CREATE FUNCTION get_next_code_number(counter_type text, counter_key text, period text) RETURNS integer;

-- Triggers
CREATE FUNCTION handle_new_user(); -- Creates profile + assigns default role
CREATE FUNCTION log_client_changes(); -- Audit logging
CREATE FUNCTION update_updated_at_column(); -- Timestamp updater
```

---

## Key Features to Implement

### 1. Authentication & Users
- Email/password signup and login
- Role-based access: Admin, Sales, Operations, Finance, User
- Profile management
- **No anonymous auth** - always require authentication

### 2. Media Assets Management
- Full CRUD for assets
- Interactive map view (Leaflet)
- Image gallery per asset
- Bulk import from Excel
- Advanced filters and search
- Power bill tracking
- Maintenance records
- Expense tracking per asset
- Availability calendar

### 3. Client Management
- Full CRUD for clients
- KYC document upload
- Separate billing and shipping addresses
- Client audit log
- GST validation
- Contact person management

### 4. Plans (Quotations) Module

**Plan Creation:**
- Client selection dropdown
- Date range picker (start/end dates)
- Asset selection with filters
- Multi-select with checkboxes

**Pricing Features:**
- Card rate display (from asset)
- Negotiated rate input per asset
- Discount support (% or fixed)
- AI rate suggester (call edge function)
- Bulk discount application
- Printing charges per asset
- Mounting charges per asset
- **Prorata calculations** for partial months
- Real-time GST calculation (18% default)
- Live total updates

**Prorata Logic:**
```typescript
// If campaign doesn't start on 1st or doesn't end on last day
// Calculate daily rate = monthly_rate / days_in_month
// Multiply by actual days used
// Sum across all partial months
```

**Plan Actions:**
- Save as Draft
- Send to Client (generates share link)
- Request Approval (if threshold met)
- Convert to Campaign
- Export to PPT (2 images per asset)
- Export to Excel (with GST breakdown)
- Export to PDF (work order)

**Templates:**
- Save current plan as template
- Load plan from template
- Template library view

**Public Sharing:**
- Generate unique share token
- Public view page (no auth required)
- Client can view assets, pricing
- Client can accept/request changes

### 5. Campaign Management
- Create from approved plan
- Assign to operations team
- Track installation status
- Proof upload interface (mobile-optimized)
- 4-photo requirement per asset:
  - Newspaper with date
  - Geotag with location
  - Traffic view 1
  - Traffic view 2
- EXIF validation for GPS and timestamp
- Generate Proof of Performance PPT

### 6. Finance Module
- Quotations (estimations) list
- Invoice generation from campaigns
- Payment tracking with partial payments
- Expense management
- GST calculations
- Aging reports
- Payment status tracking

### 7. Reports & Analytics
- Vacant media availability report
- Revenue analytics by client/city
- Asset occupancy rates
- Power bills dashboard
- Expense analytics
- Campaign performance

### 8. Settings
- Organization branding (logo, colors)
- User management
- Role assignment
- Approval workflow configuration
- Terms & conditions templates
- Code management (ID prefixes)

---

## UI/UX Requirements

### Design System

**Colors:**
- Primary: Deep Blue (#1E40AF)
- Secondary: Slate Gray (#64748B)
- Accent: Emerald Green (#10B981)
- Background: Light Gray (#F8FAFC)
- Plan Details: Blue left border (border-l-4 border-primary)
- Plan Summary: Orange left border (border-l-4 border-orange-500)

**Typography:**
- Headings: Poppins or Inter
- Body: Inter
- Data/Numbers: JetBrains Mono

**Layout:**
- Persistent left sidebar navigation
- Top app bar with user menu
- Responsive tables with filters
- Card-based layouts for dashboards
- Modal dialogs for forms

### Component Patterns

**Use shadcn/ui components:**
- Button, Input, Select, Checkbox
- Table, Card, Dialog, Sheet
- Tabs, Accordion, Badge, Avatar
- Calendar, DatePicker
- Command Palette (Cmd+K)
- Toast notifications
- Dropdown menus
- Form validation with react-hook-form + zod

**Custom Components to Build:**
- MediaAssetsTable (with column visibility, sorting, filters)
- SelectedAssetsTable (with inline editing, thousand separators)
- PlanSummaryCard (real-time totals with color coding)
- AssetGallery (image carousel)
- PlanForm (multi-step if needed)
- ExportOptionsDialog
- BulkActionsToolbar
- FilterPanel with saved presets

### Key UX Features
- Thousand separators in currency inputs (1,000,000)
- Real-time calculation updates
- Optimistic UI updates
- Loading states and skeletons
- Error boundaries
- Form validation with helpful messages
- Confirmation dialogs for destructive actions
- Breadcrumb navigation
- Quick actions menu (Command Palette)

---

## Business Logic

### Pricing Calculations

```typescript
// Per line item
const subtotal = sales_price + printing_charges + mounting_charges;
const gst_amount = (subtotal * gst_percent) / 100;
const total_with_gst = subtotal + gst_amount;

// Plan total
const total_amount = sum(plan_items.subtotal);
const gst_amount = (total_amount * gst_percent) / 100;
const grand_total = total_amount + gst_amount;
```

### Duration Calculation

```typescript
const duration_days = differenceInDays(end_date, start_date) + 1;
```

### Prorata Implementation

See detailed logic in FLOWS_PLANS.md, but key points:
- Calculate per month
- Use days_in_month for each month
- Sum partial month amounts
- Round to 2 decimals

### Approval Workflow

- Check `approval_settings` for matching plan_type and amount range
- Create `plan_approvals` records for each level
- Process approvals sequentially
- Update plan status when all approved
- Send notifications at each step

---

## File Structure

```
src/
├── components/
│   ├── ui/ (shadcn components)
│   ├── plans/ (plan-specific components)
│   ├── media-assets/
│   ├── clients/
│   ├── common/ (shared components)
│   └── ...
├── pages/
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── MediaAssetsList.tsx
│   ├── MediaAssetDetail.tsx
│   ├── ClientsList.tsx
│   ├── PlansList.tsx
│   ├── PlanNew.tsx
│   ├── PlanEdit.tsx
│   ├── PlanDetail.tsx
│   ├── PlanShare.tsx (public)
│   ├── CampaignsList.tsx
│   └── ...
├── layouts/
│   ├── AppLayout.tsx
│   └── SidebarLayout.tsx
├── utils/
│   ├── plans.ts (plan utilities)
│   ├── pricing.ts (calculations)
│   ├── mediaAssets.ts
│   ├── finance.ts
│   └── ...
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── hooks/
│   ├── use-table-settings.tsx
│   └── ...
├── store/ (Zustand)
│   └── planStore.ts
└── main.tsx

supabase/
└── functions/
    ├── rate-suggester/
    ├── send-approval-notification/
    └── ...
```

---

## Security & RLS Policies

### Row Level Security Rules

**media_assets:**
- SELECT: Authenticated users
- INSERT/UPDATE/DELETE: Admin only

**clients:**
- SELECT: Admin, Sales, Finance, Operations (limited)
- INSERT/UPDATE: Admin, Sales
- DELETE: Admin only

**plans:**
- SELECT: Authenticated users
- INSERT/UPDATE/DELETE: Admin only

**plan_items:**
- SELECT: Authenticated users
- INSERT/UPDATE/DELETE: Admin only

**campaigns:**
- SELECT: Admin, Sales, Finance, assigned Operations
- INSERT/UPDATE/DELETE: Admin only

**invoices, expenses:**
- SELECT: Authenticated users
- INSERT/UPDATE/DELETE: Admin only

**client_documents:**
- SELECT: Admin, Sales, Finance
- INSERT/UPDATE: Admin, Sales
- DELETE: Admin only
- Storage bucket: PRIVATE

---

## Edge Functions

### rate-suggester

```typescript
// Input: { asset_id, media_type, area, city, card_rate }
// 1. Query historical rates from plan_items
// 2. Send to AI model with context
// 3. Return suggested rate with reasoning
```

### send-approval-notification

```typescript
// Triggered when plan needs approval
// Send email to approvers with plan link
```

### send-plan-reminders

```typescript
// Scheduled function
// Check for plans expiring soon
// Send reminder emails
```

---

## Export Implementations

### PowerPoint (pptxgenjs)
- Cover slide with plan name and client
- Summary slide with totals
- Asset slides (2 per page) with images and rates
- Terms & conditions slide
- Company branding

### Excel (xlsx)
- Summary sheet
- Line items sheet with formulas
- GST breakdown
- Conditional formatting for totals

### PDF (jsPDF)
- Work order format
- Client and plan details
- Asset list table
- Grand total
- Company letterhead

---

## Testing Scenarios

1. **Create Plan Flow:**
   - Select client
   - Add 5 assets
   - Negotiate rates with AI suggester
   - Apply 10% bulk discount
   - Verify prorata for mid-month dates
   - Save as draft
   - Generate PPT export
   - Share public link

2. **Approval Workflow:**
   - Create plan > ₹1 lakh
   - Trigger approval
   - L1 approves
   - L2 approves
   - Plan status = Approved

3. **Campaign Execution:**
   - Convert approved plan to campaign
   - Assign to operations user
   - Upload 4 proofs per asset
   - Mark as verified
   - Generate PoP PPT

4. **Financial Flow:**
   - Create invoice from campaign
   - Record partial payment
   - Check balance due
   - Generate aging report

---

## Error Handling

- Wrap async operations in try-catch
- Display toast notifications for errors
- Log errors to console (or external service)
- Graceful fallbacks for AI failures
- Network error retry logic
- Form validation with zod schemas

---

## Performance Optimizations

- Lazy load images in galleries
- Paginate large tables (50-100 rows)
- Debounce search inputs
- Index database columns used in filters
- Optimize Supabase queries (select only needed columns)
- Cache static data (clients, assets) with React Query
- Memoize expensive calculations (totals)

---

## Deployment

- Build: `npm run build`
- Preview: `npm run preview`
- Deploy frontend to Vercel/Netlify
- Supabase handles backend deployment
- Edge functions auto-deploy on git push
- Environment variables in .env:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

---

## Future Enhancements (Phase 2)

- WhatsApp Cloud API integration for lead capture
- Gmail API for email parsing
- Zoho Books sync for accounting
- Razorpay payment gateway
- Multi-language support (Hindi, Telugu)
- Advanced analytics with charts (recharts)
- Mobile app for field operations (React Native)
- Real-time collaboration on plans
- Version control for plans
- Client portal with login

---

## Example Prompts for AI Generators

**"Create the Plans module for Go-Ads 360°":**

"Build a React TypeScript component for creating media plans with the following:
- Client dropdown (fetch from Supabase clients table)
- Date range picker for campaign dates
- Asset selection table with filters (city, area, media_type, status=Available)
- Selected assets table with columns: Asset ID, Location, Card Rate, Negotiated Price, Printing Charges, Mounting Charges, Discount, Subtotal, GST, Total
- Allow inline editing of negotiated price with thousand separator formatting
- Calculate prorata pricing if campaign doesn't span full months
- Real-time summary card showing: Total Amount, GST (18%), Grand Total
- Save as draft or send to client (generates share link)
- Export to PowerPoint (2 images per slide), Excel, and PDF
- Use shadcn/ui components, Tailwind CSS, and Zustand for state
- Add orange left border to summary card
- GST amount in red text"

**"Implement the Supabase schema":**

"Create Supabase migration SQL for Go-Ads 360° with tables:
- media_assets (id text PK, media_type, location, area, city, status enum, card_rate numeric, images jsonb)
- clients (id text PK, name, company, gst_number, billing/shipping addresses)
- plans (id text PK, plan_name, client_id FK, start_date, end_date, total_amount, gst_amount, grand_total, status enum, share_token)
- plan_items (id uuid PK, plan_id FK, asset_id FK, card_rate, sales_price, discount_value, printing_charges, mounting_charges, subtotal, gst_amount, total_with_gst)
Include RLS policies:
- Authenticated users can SELECT all
- Only admin role can INSERT/UPDATE/DELETE
Define enums for status fields
Add database functions for ID generation (PLAN-YYYY-Month-XXX format)"

---

## Complete Feature Checklist

- [ ] Authentication (email/password, roles)
- [ ] Media Assets CRUD with map view
- [ ] Clients CRUD with KYC documents
- [ ] Plans creation with asset selection
- [ ] Prorata pricing calculation
- [ ] AI rate suggester
- [ ] Bulk discount application
- [ ] Thousand separator formatting
- [ ] Real-time totals with color coding
- [ ] Plan templates save/load
- [ ] Public share links
- [ ] Export to PPT/Excel/PDF
- [ ] Approval workflows
- [ ] Campaign creation from plans
- [ ] Proof upload with EXIF validation
- [ ] Invoice generation
- [ ] Payment tracking
- [ ] Expense management
- [ ] Reports dashboard
- [ ] Settings and branding
- [ ] Audit logging
- [ ] Import from Excel
- [ ] Command palette (Cmd+K)
- [ ] Responsive design
- [ ] Toast notifications
- [ ] Form validation

---

**Use this prompt to generate the complete Go-Ads 360° platform in Lovable, v0, Bolt, or similar AI code generators. Adjust as needed for specific generator syntax.**
