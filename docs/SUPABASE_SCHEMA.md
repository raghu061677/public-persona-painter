# Go-Ads 360° - Supabase Database Schema

Complete reference for all database tables, columns, relationships, and security policies.

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [Relationship Tables](#relationship-tables)
3. [Supporting Tables](#supporting-tables)
4. [Audit & Logs](#audit--logs)
5. [Settings & Configuration](#settings--configuration)
6. [Custom Types (Enums)](#custom-types-enums)
7. [Database Functions](#database-functions)
8. [Storage Buckets](#storage-buckets)

---

## Core Tables

### media_assets

Primary inventory table for all OOH advertising assets.

**Columns:**
- `id` (text, PK) - Unique asset ID: `{CITY}-{TYPE}-{SEQ}` (e.g., `HYD-UP-0001`)
- `media_id` (text) - Optional external media ID
- `media_type` (text) - Type of media (Unipole, Hoarding, Bus Shelter, etc.)
- `category` (media_category enum) - 'OOH', 'DOOH', 'Transit'
- `status` (media_asset_status enum) - 'Available', 'Booked', 'Maintenance', 'Inactive'
- `location` (text) - Detailed location description
- `area` (text) - Area/locality name
- `city` (text) - City name
- `district` (text) - District name
- `state` (text) - State name
- `latitude` (numeric) - GPS latitude
- `longitude` (numeric) - GPS longitude
- `direction` (text) - Facing direction
- `dimensions` (text) - Physical dimensions (e.g., "20x10 ft")
- `total_sqft` (numeric) - Total square footage
- `illumination` (text) - Lighting type
- `is_multi_face` (boolean) - Multiple faces flag
- `faces` (jsonb) - Array of face details
- `google_street_view_url` (text) - Street view link
- `base_rent` (numeric) - Base rental cost
- `card_rate` (numeric) - Standard selling rate
- `base_margin` (numeric) - Base profit margin
- `printing_charges` (numeric) - Printing cost per unit
- `mounting_charges` (numeric) - Mounting/installation cost
- `maintenance` (numeric) - Monthly maintenance cost
- `electricity` (numeric) - Monthly electricity cost
- `ad_tax` (numeric) - Advertising tax amount
- `concession_fee` (numeric) - Concession fee if applicable
- `gst_percent` (numeric, default: 18) - GST percentage
- `ownership` (ownership_type enum) - 'own', 'vendor', 'lease'
- `vendor_details` (jsonb) - Vendor information if not owned
- `municipal_authority` (text) - Governing authority
- `section_name` (text) - Power section name
- `consumer_name` (text) - Power consumer name
- `service_number` (text) - Power service number
- `unique_service_number` (text) - Unique power identifier
- `ero` (text) - Electrical Revenue Officer
- `images` (jsonb) - Image metadata and URLs
- `image_urls` (text[]) - Array of image URLs (legacy)
- `search_tokens` (text[]) - Tokenized search fields
- `is_public` (boolean, default: true) - Public visibility
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Indexes:**
- Primary key on `id`
- GIN index on `search_tokens` for fast search
- Index on `status` for filtering
- Index on `city`, `area` for location queries

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### clients

Customer database with KYC information.

**Columns:**
- `id` (text, PK) - Client ID: `CLI-{SEQ}` (e.g., `CLI-001`)
- `name` (text, required) - Client name
- `company` (text) - Company name
- `email` (text) - Email address
- `phone` (text) - Phone number
- `contact_person` (text) - Primary contact name
- `gst_number` (text) - GST registration number
- `address` (text) - Address (legacy)
- `city` (text) - City
- `state` (text) - State
- `billing_address_line1` (text) - Billing street address
- `billing_address_line2` (text) - Billing address line 2
- `billing_city` (text) - Billing city
- `billing_state` (text) - Billing state
- `billing_pincode` (text) - Billing postal code
- `shipping_same_as_billing` (boolean, default: false) - Use billing for shipping
- `shipping_address_line1` (text) - Shipping street address
- `shipping_address_line2` (text) - Shipping address line 2
- `shipping_city` (text) - Shipping city
- `shipping_state` (text) - Shipping state
- `shipping_pincode` (text) - Shipping postal code
- `notes` (text) - Additional notes
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Admins and sales can SELECT, INSERT, UPDATE
- Only admins can DELETE
- Operations/finance can view basic info

---

### plans

Media plans and quotations.

**Columns:**
- `id` (text, PK) - Plan ID: `PLAN-{YEAR}-{MONTH}-{SEQ}`
- `plan_name` (text, required) - Descriptive plan name
- `plan_type` (plan_type enum) - 'Quotation', 'Proposal', 'Contract'
- `status` (plan_status enum) - 'Draft', 'Sent', 'Approved', 'Rejected', 'Converted'
- `client_id` (text, required) - Reference to clients.id
- `client_name` (text, required) - Denormalized client name
- `start_date` (date, required) - Campaign start date
- `end_date` (date, required) - Campaign end date
- `duration_days` (integer, required) - Calculated duration
- `total_amount` (numeric, default: 0) - Subtotal before GST
- `gst_percent` (numeric, default: 18) - GST percentage
- `gst_amount` (numeric, default: 0) - Calculated GST amount
- `grand_total` (numeric, default: 0) - Total including GST
- `notes` (text) - Internal notes
- `share_token` (text) - Unique token for public sharing
- `share_link_active` (boolean, default: false) - Share link enabled
- `export_links` (jsonb, default: {}) - Generated export file URLs
- `created_by` (uuid, FK to auth.users, required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### plan_items

Line items for each plan (one per asset).

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `plan_id` (text, required) - Reference to plans.id
- `asset_id` (text, required) - Reference to media_assets.id
- `location` (text, required) - Denormalized location
- `area` (text, required) - Denormalized area
- `city` (text, required) - Denormalized city
- `media_type` (text, required) - Denormalized media type
- `dimensions` (text, required) - Denormalized dimensions
- `base_rent` (numeric) - Original base rent
- `card_rate` (numeric, required) - Standard rate
- `sales_price` (numeric, required) - Final negotiated rate
- `discount_type` (text, default: 'Percent') - 'Percent' or 'Fixed'
- `discount_value` (numeric, default: 0) - Discount amount or percentage
- `discount_amount` (numeric, default: 0) - Calculated discount
- `printing_charges` (numeric, default: 0) - Printing cost
- `mounting_charges` (numeric, default: 0) - Mounting cost
- `subtotal` (numeric, required) - Line total before GST
- `gst_amount` (numeric, required) - Line GST amount
- `total_with_gst` (numeric, required) - Line total with GST
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

**Cascade:** Deletes when parent plan is deleted

---

### campaigns

Active and completed advertising campaigns.

**Columns:**
- `id` (text, PK) - Campaign ID: `CAM-{YEAR}-{MONTH}-{SEQ}`
- `campaign_name` (text, required) - Campaign name
- `plan_id` (text) - Source plan reference
- `client_id` (text, required) - Client reference
- `client_name` (text, required) - Denormalized client name
- `status` (campaign_status enum) - 'Planned', 'Active', 'Paused', 'Completed', 'Cancelled'
- `start_date` (date, required) - Campaign start
- `end_date` (date, required) - Campaign end
- `total_assets` (integer, default: 0) - Number of assets
- `total_amount` (numeric, required) - Subtotal
- `gst_percent` (numeric, required) - GST percentage
- `gst_amount` (numeric, required) - GST amount
- `grand_total` (numeric, required) - Total with GST
- `notes` (text) - Campaign notes
- `assigned_to` (uuid) - Operations team member
- `created_by` (uuid, FK to auth.users, required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Admins/sales can view all
- Operations can view assigned campaigns
- Finance can view for invoicing
- Only admins can INSERT, UPDATE, DELETE

---

### campaign_assets

Assets assigned to campaigns with installation tracking.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `campaign_id` (text, required) - Campaign reference
- `asset_id` (text, required) - Asset reference
- `location` (text, required) - Denormalized location
- `area` (text, required) - Denormalized area
- `city` (text, required) - Denormalized city
- `media_type` (text, required) - Denormalized media type
- `card_rate` (numeric, required) - Rate for this campaign
- `printing_charges` (numeric, default: 0)
- `mounting_charges` (numeric, default: 0)
- `status` (asset_installation_status enum) - 'Pending', 'Assigned', 'Installed', 'Verified', 'Rejected'
- `mounter_name` (text) - Assigned mounter
- `assigned_at` (timestamptz) - Assignment timestamp
- `completed_at` (timestamptz) - Completion timestamp
- `latitude` (numeric) - Installation GPS lat
- `longitude` (numeric) - Installation GPS long
- `photos` (jsonb, default: {}) - Proof photos object
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Admins/sales can view all
- Operations can view assigned
- Finance can view
- Only admins can INSERT, UPDATE, DELETE

---

## Relationship Tables

### client_documents

KYC and other client documents.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `client_id` (text, required)
- `document_type` (client_document_type enum) - 'GSTIN', 'PAN', 'AddressProof', 'Other'
- `document_name` (text, required) - Display name
- `file_name` (text, required) - Uploaded filename
- `file_path` (text, required) - Storage path
- `file_size` (bigint, required) - File size in bytes
- `mime_type` (text, required) - MIME type
- `notes` (text) - Additional notes
- `uploaded_by` (uuid, FK to auth.users, required)
- `uploaded_at` (timestamptz, default: now())
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Admins/sales/finance can SELECT
- Admins/sales can INSERT, UPDATE
- Only admins can DELETE

---

### asset_power_bills

Power/electricity bills linked to assets.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `asset_id` (text, required)
- `bill_month` (date, required) - Billing period
- `bill_amount` (numeric, required) - Bill amount
- `payment_status` (text, default: 'Pending') - 'Pending', 'Paid', 'Overdue'
- `paid_amount` (numeric, default: 0)
- `payment_date` (date)
- `consumer_name` (text)
- `service_number` (text)
- `unique_service_number` (text)
- `section_name` (text) - Power section
- `ero` (text) - ERO name
- `bill_url` (text) - Uploaded bill document
- `notes` (text)
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### asset_maintenance

Maintenance records for assets.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `asset_id` (text, required)
- `maintenance_date` (date, required)
- `maintenance_type` (text, required) - 'Repair', 'Cleaning', 'Painting', etc.
- `description` (text)
- `vendor_name` (text)
- `cost` (numeric, default: 0)
- `status` (text, default: 'Completed')
- `notes` (text)
- `attachments` (jsonb, default: []) - Array of file URLs
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### asset_expenses

Other expenses related to assets.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `asset_id` (text, required)
- `expense_date` (date, required)
- `category` (text, required) - Expense category
- `description` (text, required)
- `amount` (numeric, required)
- `vendor_name` (text)
- `payment_status` (text, default: 'Pending')
- `payment_date` (date)
- `receipt_url` (text)
- `notes` (text)
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

## Supporting Tables

### estimations

Formal quotations (alternative to plans).

**Columns:**
- `id` (text, PK) - Estimation ID: `EST-{FY}-{SEQ}`
- `plan_id` (text) - Source plan reference
- `client_id` (text, required)
- `client_name` (text, required)
- `estimation_date` (date, required)
- `status` (estimation_status enum) - 'Draft', 'Sent', 'Approved', 'Rejected'
- `items` (jsonb, default: []) - Array of line items
- `sub_total` (numeric, required)
- `gst_percent` (numeric, default: 18)
- `gst_amount` (numeric, required)
- `total_amount` (numeric, required)
- `notes` (text)
- `created_by` (uuid, FK to auth.users, required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### invoices

Client invoices.

**Columns:**
- `id` (text, PK) - Invoice ID: `INV-{FY}-{SEQ}`
- `estimation_id` (text) - Source estimation
- `client_id` (text, required)
- `client_name` (text, required)
- `invoice_date` (date, required)
- `due_date` (date, required)
- `status` (invoice_status enum) - 'Draft', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'
- `items` (jsonb, default: [])
- `sub_total` (numeric, required)
- `gst_percent` (numeric, default: 18)
- `gst_amount` (numeric, required)
- `total_amount` (numeric, required)
- `payments` (jsonb, default: []) - Array of payment records
- `balance_due` (numeric, required)
- `notes` (text)
- `created_by` (uuid, FK to auth.users, required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### expenses

Business expenses (printing, mounting, etc.).

**Columns:**
- `id` (text, PK) - Expense ID: `EXP-{FY}-{SEQ}`
- `campaign_id` (text) - Related campaign
- `category` (expense_category enum) - 'Printing', 'Mounting', 'Transportation', 'Other'
- `vendor_name` (text, required)
- `amount` (numeric, required)
- `gst_percent` (numeric, default: 18)
- `gst_amount` (numeric, required)
- `total_amount` (numeric, required)
- `payment_status` (payment_status enum) - 'Pending', 'Paid', 'Cancelled'
- `paid_date` (date)
- `invoice_url` (text)
- `notes` (text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### leads

Sales leads from various sources.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `source` (text, required) - 'WhatsApp', 'Email', 'Web', 'Phone', 'Referral'
- `status` (text, default: 'New') - 'New', 'Contacted', 'Qualified', 'Converted', 'Lost'
- `name` (text, required)
- `company` (text)
- `email` (text)
- `phone` (text)
- `location` (text)
- `requirement` (text)
- `raw_message` (text) - Original captured message
- `metadata` (jsonb, default: {}) - Additional parsed data
- `synced_to_zoho` (boolean, default: false)
- `zoho_lead_id` (text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

## Audit & Logs

### client_audit_log

Audit trail for client record changes.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `client_id` (text, required)
- `user_id` (uuid, required)
- `action` (text, required) - 'insert', 'update', 'delete'
- `old_values` (jsonb) - Previous state
- `new_values` (jsonb) - New state
- `changed_fields` (jsonb) - Changed field diff
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Only admins can SELECT
- System can INSERT (via trigger)
- No UPDATE or DELETE

**Trigger:** `log_client_changes()` on clients table

---

### import_logs

Track bulk import operations.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `entity_type` (text, required) - 'clients', 'media_assets', etc.
- `file_name` (text, required)
- `total_records` (integer, required)
- `success_count` (integer, required)
- `error_count` (integer, required)
- `skipped_count` (integer, required)
- `errors` (jsonb, default: [])
- `skipped_records` (jsonb, default: [])
- `imported_by` (uuid)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Users can view their own logs
- Admins can view all
- Users can INSERT (their own)

---

### email_logs

Email parsing and lead creation logs.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `gmail_message_id` (text, required)
- `sender_email` (text, required)
- `subject` (text)
- `body_preview` (text)
- `parsing_status` (text, default: 'pending')
- `ai_parsed_data` (jsonb)
- `lead_id` (uuid)
- `error_message` (text)
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### whatsapp_logs

WhatsApp message logs.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `phone_number` (text, required)
- `message_type` (text, required) - 'incoming', 'outgoing'
- `message_body` (text)
- `media_url` (text)
- `content_type` (text)
- `status` (text, default: 'pending')
- `lead_id` (uuid)
- `campaign_id` (text)
- `error_message` (text)
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

## Settings & Configuration

### profiles

User profile extensions.

**Columns:**
- `id` (uuid, PK, FK to auth.users)
- `username` (text)
- `avatar_url` (text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Users can view all profiles
- Users can INSERT/UPDATE their own profile

**Trigger:** Created via `handle_new_user()` on auth.users

---

### user_roles

Role assignments for users.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `user_id` (uuid, required, FK to auth.users)
- `role` (app_role enum, required) - 'admin', 'sales', 'operations', 'finance', 'user'
- `created_at` (timestamptz, default: now())

**RLS Policies:**
- Users can view their own roles
- Admins can view all roles
- No INSERT, UPDATE, DELETE (managed by triggers)

---

### organization_settings

Company branding and settings.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `organization_name` (text, default: 'Go-Ads 360°')
- `logo_url` (text)
- `hero_image_url` (text)
- `primary_color` (text, default: '#1e40af')
- `secondary_color` (text, default: '#10b981')
- `updated_by` (uuid)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Anyone can SELECT
- Only admins can INSERT/UPDATE

---

### plan_templates

Reusable plan templates.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `template_name` (text, required)
- `plan_type` (plan_type enum, default: 'Quotation')
- `description` (text)
- `duration_days` (integer)
- `gst_percent` (numeric, default: 18)
- `template_items` (jsonb, required, default: [])
- `notes` (text)
- `usage_count` (integer, default: 0)
- `is_active` (boolean, default: true)
- `created_by` (uuid, FK to auth.users, required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Users can view all templates
- Users can INSERT/UPDATE their own
- Admins can manage all

---

### plan_terms_settings

Default terms and conditions for plans.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `title` (text, default: 'Terms & Conditions')
- `terms` (text[], required)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Anyone can SELECT
- Only admins can INSERT/UPDATE

---

### approval_settings

Approval workflow configuration.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `plan_type` (plan_type enum, required)
- `min_amount` (numeric, required, default: 0)
- `max_amount` (numeric)
- `approval_levels` (jsonb, required, default: [])
- `is_active` (boolean, default: true)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### plan_approvals

Approval workflow instances.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `plan_id` (text, required)
- `approval_level` (approval_level enum, required) - 'l1', 'l2', 'l3'
- `required_role` (app_role enum, required)
- `status` (approval_status enum, default: 'pending') - 'pending', 'approved', 'rejected'
- `approver_id` (uuid)
- `approved_at` (timestamptz)
- `comments` (text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Approvers can view/update pending approvals
- Users can view approvals for their plans
- Admins can manage all

---

### reminder_settings

Reminder notification configuration.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `reminder_type` (text, required) - 'plan_followup', 'invoice_due', etc.
- `days_before` (integer, required)
- `email_template` (text)
- `is_active` (boolean, default: true)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### code_counters

Sequential ID counter for various entities.

**Columns:**
- `id` (uuid, PK, default: gen_random_uuid())
- `counter_type` (text, required) - 'asset', 'client', etc.
- `counter_key` (text, required) - Subcategory key
- `period` (text, required) - Period identifier
- `current_value` (integer, required, default: 0)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Unique Constraint:** (counter_type, counter_key, period)

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

### analytics_daily

Daily aggregated analytics snapshots.

**Columns:**
- `date` (date, required)
- `fy` (text, required) - Financial year
- `totals` (jsonb, default: {})
- `occupancy` (jsonb, default: {})
- `vacant_by_city` (jsonb, default: [])
- `revenue_by_city` (jsonb, default: [])
- `revenue_by_client` (jsonb, default: [])
- `expenses_by_category` (jsonb, default: [])
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**RLS Policies:**
- Authenticated users can SELECT
- Only admins can INSERT, UPDATE, DELETE

---

## Custom Types (Enums)

### app_role
User roles for access control.
- `admin` - Full access
- `sales` - Sales and client management
- `operations` - Campaign execution
- `finance` - Financial management
- `user` - Basic access

### media_asset_status
Asset availability states.
- `Available` - Ready for booking
- `Booked` - Reserved for campaign
- `Maintenance` - Under maintenance
- `Inactive` - Not available

### media_category
Media classification.
- `OOH` - Traditional outdoor
- `DOOH` - Digital outdoor
- `Transit` - Transit media

### ownership_type
Asset ownership.
- `own` - Company owned
- `vendor` - Vendor owned
- `lease` - Leased property

### plan_type
Type of plan document.
- `Quotation` - Price quote
- `Proposal` - Formal proposal
- `Contract` - Binding contract

### plan_status
Plan lifecycle status.
- `Draft` - Being created
- `Sent` - Sent to client
- `Approved` - Client approved
- `Rejected` - Client rejected
- `Converted` - Converted to campaign

### campaign_status
Campaign lifecycle status.
- `Planned` - Scheduled
- `Active` - Running
- `Paused` - Temporarily stopped
- `Completed` - Finished
- `Cancelled` - Cancelled

### asset_installation_status
Installation progress.
- `Pending` - Not started
- `Assigned` - Assigned to mounter
- `Installed` - Installation complete
- `Verified` - Proof verified
- `Rejected` - Proof rejected

### estimation_status
Estimation lifecycle.
- `Draft` - Being prepared
- `Sent` - Sent to client
- `Approved` - Client approved
- `Rejected` - Client rejected

### invoice_status
Invoice payment status.
- `Draft` - Being prepared
- `Sent` - Sent to client
- `PartiallyPaid` - Partial payment received
- `Paid` - Fully paid
- `Overdue` - Past due date
- `Cancelled` - Cancelled

### payment_status
Generic payment status.
- `Pending` - Awaiting payment
- `Paid` - Payment complete
- `Cancelled` - Cancelled

### expense_category
Expense classification.
- `Printing` - Printing costs
- `Mounting` - Installation costs
- `Transportation` - Transport
- `Other` - Miscellaneous

### client_document_type
Client document categories.
- `GSTIN` - GST certificate
- `PAN` - PAN card
- `AddressProof` - Address proof
- `Other` - Other documents

### approval_level
Approval hierarchy levels.
- `l1` - Level 1 approval
- `l2` - Level 2 approval
- `l3` - Level 3 approval

### approval_status
Approval decision status.
- `pending` - Awaiting decision
- `approved` - Approved
- `rejected` - Rejected

---

## Database Functions

### get_financial_year()
Returns current financial year as `YYYY-YY` format.
- **Returns:** text
- **Example:** `2024-25` (if current date is between Apr 2024 - Mar 2025)

### generate_plan_id()
Generates unique plan ID.
- **Returns:** text
- **Format:** `PLAN-YYYY-Month-XXX`
- **Example:** `PLAN-2024-April-001`

### generate_campaign_id()
Generates unique campaign ID.
- **Returns:** text
- **Format:** `CAM-YYYY-Month-XXX`
- **Example:** `CAM-2024-April-001`

### generate_estimation_id()
Generates unique estimation ID.
- **Returns:** text
- **Format:** `EST-YYYY-YY-XXX`
- **Example:** `EST-2024-25-045`

### generate_invoice_id()
Generates unique invoice ID.
- **Returns:** text
- **Format:** `INV-YYYY-YY-XXXX`
- **Example:** `INV-2024-25-0123`

### generate_expense_id()
Generates unique expense ID.
- **Returns:** text
- **Format:** `EXP-YYYY-YY-XXX`
- **Example:** `EXP-2024-25-031`

### get_next_code_number(counter_type, counter_key, period)
Gets and increments counter value.
- **Parameters:**
  - `counter_type` (text): Entity type
  - `counter_key` (text): Subcategory
  - `period` (text): Period identifier
- **Returns:** integer (next sequence number)

### generate_share_token()
Generates random share token for public plan links.
- **Returns:** text (32-char hex)

### create_plan_approval_workflow(plan_id)
Creates approval records based on plan amount and settings.
- **Parameters:**
  - `plan_id` (text): Plan to create workflow for
- **Returns:** void

### process_plan_approval(approval_id, status, comments)
Processes an approval decision.
- **Parameters:**
  - `approval_id` (uuid): Approval record ID
  - `status` (approval_status): Decision
  - `comments` (text): Optional comments
- **Returns:** jsonb with result

### has_role(user_id, role)
Checks if user has specific role.
- **Parameters:**
  - `user_id` (uuid): User to check
  - `role` (app_role): Role to verify
- **Returns:** boolean

### handle_new_user()
Trigger function to create profile and assign default role.
- **Trigger:** After INSERT on auth.users
- **Actions:**
  - Creates profile record
  - Assigns 'user' role

### log_client_changes()
Trigger function to audit client changes.
- **Trigger:** After INSERT/UPDATE/DELETE on clients
- **Actions:**
  - Logs old and new values
  - Records changed fields
  - Tracks user who made change

### update_updated_at_column()
Trigger function to update `updated_at` timestamp.
- **Trigger:** Before UPDATE on various tables
- **Actions:**
  - Sets `updated_at` to current timestamp

---

## Storage Buckets

### campaign-photos
- **Public:** Yes
- **Purpose:** Store proof photos uploaded by operations team
- **Path Structure:** `{campaign_id}/{asset_id}/{photo_type}.jpg`

### logos
- **Public:** Yes
- **Purpose:** Organization logos and branding
- **Path Structure:** `{organization_id}/logo.png`

### hero-images
- **Public:** Yes
- **Purpose:** Hero banner images for public plan shares
- **Path Structure:** `{organization_id}/hero.jpg`

### client-documents
- **Public:** No
- **Purpose:** Secure KYC and other client documents
- **Path Structure:** `{client_id}/{document_type}/{filename}`
- **Access:** Admin and sales roles only

---

## Indexes & Performance

Key indexes for performance:
1. `media_assets.search_tokens` - GIN index for text search
2. `media_assets.status` - Filter by availability
3. `media_assets.city, area` - Location queries
4. `plans.status` - Plan filtering
5. `campaigns.status, start_date, end_date` - Campaign queries
6. `plan_items.plan_id` - Join optimization
7. `campaign_assets.campaign_id` - Join optimization

---

## Migration Notes

- All ID generation uses database functions for consistency
- Financial year calculations are centralized in `get_financial_year()`
- Audit logging is automatic via triggers
- RLS policies enforce role-based access
- Cascade deletes are configured for parent-child relationships
- Updated timestamps are automatic via triggers

---

## Security Considerations

1. **Row Level Security (RLS)** enabled on all tables
2. **Role-based access** via `user_roles` and `has_role()` function
3. **Audit logging** for sensitive client data changes
4. **Secure storage** for client documents (private bucket)
5. **No direct auth.users access** - use profiles table instead
6. **Validated user context** via `auth.uid()` in RLS policies

---

This schema supports the complete Go-Ads 360° platform with full traceability, security, and scalability.
