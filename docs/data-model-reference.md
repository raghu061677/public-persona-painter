# GO-ADS 360° — Complete Data Model Reference

> **Purpose:** This document contains the exact database schema for the 5 core tables used in campaign lifecycle automation: `media_assets`, `campaigns`, `campaign_assets`, `invoices`, and `payment_records`.
>
> **Generated from:** Live Supabase schema as of 2026-02-08.
> **Use this for:** Building automations for asset availability, campaign alerts, invoice generation, payment tracking, and daily notifications.

---

## 1. `media_assets` — OOH Inventory

**Purpose:** Stores every physical outdoor advertising asset (billboard, bus shelter, unipole, etc.) owned/managed by a company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NOT NULL | — | **PK.** Human-readable ID (e.g., `HYD-BQS-0033`) |
| `company_id` | uuid | YES | — | FK → `companies.id`. Owning tenant |
| `asset_name` | text | YES | — | Display name |
| `media_type` | text | NOT NULL | — | bus_shelter, hoarding, unipole, etc. |
| `city` | text | NOT NULL | — | City name |
| `district` | text | YES | — | District |
| `state` | text | YES | — | State |
| `area` | text | NOT NULL | — | Locality / area |
| `location` | text | NOT NULL | — | Specific location description |
| `direction` | text | YES | — | Facing direction |
| `latitude` | numeric | YES | — | GPS lat |
| `longitude` | numeric | YES | — | GPS lng |
| `dimensions` | text | YES | — | e.g., "40x10 ft" |
| `width` | numeric | YES | — | Width in ft |
| `height` | numeric | YES | — | Height in ft |
| `total_sqft` | numeric | YES | — | Computed sqft |
| `illumination_type` | text | YES | — | FL / NL / LED / Digital |
| `card_rate` | numeric | YES | `0` | Official rate per month |
| `base_rate` | numeric | YES | `0` | Internal lowest rate |
| `printing_rate_per_sqft` | numeric | YES | `0` | Printing cost per sqft |
| `mounting_rate_per_sqft` | numeric | YES | `0` | Mounting cost per sqft |
| `printing_cost_default` | numeric | YES | — | Default total printing cost |
| `mounting_cost_default` | numeric | YES | — | Default total mounting cost |
| `status` | text (enum) | YES | `'Available'` | **Available / Booked / Blocked / Under Maintenance / Expired** |
| `is_public` | boolean | YES | `false` | Visible in marketplace |
| `municipal_id` | text | YES | — | Authority ID |
| `municipal_authority` | text | YES | — | GHMC / TGIIC / etc. |
| `photos` | jsonb | YES | — | Array of photo URLs |
| `qr_code_url` | text | YES | — | QR code image URL |
| `current_campaign_id` | text | YES | — | FK → `campaigns.id`. Currently active campaign |
| `next_available_from` | date | YES | — | When asset becomes free |
| `notes` | text | YES | — | Internal notes |
| `tags` | text[] | YES | — | Tags array |
| `search_tokens` | text[] | YES | — | For full-text search |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |
| `created_by` | uuid | YES | — | User who created |

### Key Relationships
- `company_id` → `companies.id`
- `current_campaign_id` → `campaigns.id`
- Referenced by: `campaign_assets.asset_id`, `asset_bookings.asset_id`, `asset_power_bills.asset_id`, `asset_expenses.asset_id`, `asset_maintenance.asset_id`

### Status Enum Values
| Value | Meaning |
|-------|---------|
| `Available` | Free for booking |
| `Booked` | Reserved for active/upcoming campaign |
| `Blocked` | Temporarily unavailable (govt orders, repairs) |
| `Under Maintenance` | Not usable |
| `Expired` | Removed from inventory |

---

## 2. `campaigns` — Campaign Header Records

**Purpose:** Top-level campaign record with financial summary, dates, and status. Created from approved plans or manually.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NOT NULL | — | **PK.** e.g., `CMP-202501-001` |
| `company_id` | uuid | YES | — | FK → `companies.id` |
| `campaign_name` | text | NOT NULL | — | Display name |
| `client_id` | text | NOT NULL | — | FK → `clients.id` |
| `client_name` | text | NOT NULL | — | Denormalized client name |
| `plan_id` | text | YES | — | FK → `plans.id` (if created from plan) |
| `status` | enum `campaign_status` | NOT NULL | — | **Draft / Upcoming / Running / Completed / Cancelled / Archived** |
| `start_date` | text (date) | NOT NULL | — | Campaign start |
| `end_date` | text (date) | NOT NULL | — | Campaign end |
| `grand_total` | numeric | NOT NULL | — | Pre-tax total |
| `gst_percent` | numeric | NOT NULL | — | GST rate (typically 18) |
| `gst_amount` | numeric | NOT NULL | — | Computed GST |
| `total_amount` | numeric | NOT NULL | — | Grand total + GST |
| `subtotal` | numeric | YES | — | Sum of rent amounts |
| `printing_total` | numeric | YES | — | Sum of printing costs |
| `mounting_total` | numeric | YES | — | Sum of mounting costs |
| `total_assets` | integer | YES | — | Count of assets |
| `manual_discount_amount` | numeric | YES | — | Manual discount applied |
| `manual_discount_reason` | text | YES | — | Reason for discount |
| `billing_cycle` | text | YES | — | monthly / quarterly / campaign |
| `is_recurring` | boolean | YES | — | Whether recurring |
| `assigned_to` | text | YES | — | Assigned team member |
| `notes` | text | YES | — | Internal notes |
| `created_by` | text | NOT NULL | — | User who created |
| `created_from` | text | YES | — | Source (plan / manual) |
| `is_deleted` | boolean | YES | `false` | **Soft delete flag** |
| `deleted_at` | timestamptz | YES | — | When deleted |
| `deleted_by` | text | YES | — | Who deleted |
| `deletion_reason` | text | YES | — | Why deleted |
| `is_historical_entry` | boolean | YES | `false` | Legacy data flag |
| `public_share_enabled` | boolean | YES | `false` | Client portal sharing |
| `public_tracking_token` | text | YES | — | Public access token |
| `notification_settings` | jsonb | YES | — | Notification preferences |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

### Campaign Status Enum
| Value | Meaning |
|-------|---------|
| `Draft` | Being prepared |
| `Upcoming` | Approved, not yet started |
| `Running` | Currently active |
| `Completed` | End date has passed |
| `Cancelled` | Cancelled before completion |
| `Archived` | Archived after completion |

### Soft Delete Pattern
Campaigns use **soft delete** via `is_deleted = true`. The database function `soft_delete_campaign` marks the record, captures the deletion reason, and automatically releases booked media assets back to `Available` status. Deletion is blocked if the campaign has active invoices or payments.

---

## 3. `campaign_assets` — Asset-Level Booking Details (Source of Truth)

**Purpose:** The **operational and financial single source of truth**. Each row links one asset to one campaign with its own booking dates, pricing, and installation status. All billing, availability, budgeting, and exports derive from this table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NOT NULL | — | **PK.** UUID |
| `campaign_id` | text | NOT NULL | — | FK → `campaigns.id` |
| `asset_id` | text | NOT NULL | — | FK → `media_assets.id` |
| `city` | text | NOT NULL | — | Denormalized city |
| `area` | text | NOT NULL | — | Denormalized area |
| `location` | text | NOT NULL | — | Denormalized location |
| `direction` | text | YES | — | Denormalized direction |
| `district` | text | YES | — | Denormalized district |
| `state` | text | YES | — | Denormalized state |
| `media_type` | text | NOT NULL | — | Denormalized media type |
| `dimensions` | text | YES | — | Denormalized dimensions |
| `total_sqft` | numeric | YES | — | Denormalized sqft |
| `illumination_type` | text | YES | — | Denormalized illumination |
| `latitude` | numeric | YES | — | Denormalized GPS |
| `longitude` | numeric | YES | — | Denormalized GPS |
| `municipal_id` | text | YES | — | Denormalized |
| `municipal_authority` | text | YES | — | Denormalized |
| `card_rate` | numeric | NOT NULL | — | Original card rate snapshot |
| `negotiated_rate` | numeric | YES | — | Actual agreed rate |
| `base_rate_monthly` | numeric | YES | — | Monthly base rate |
| `daily_rate` | numeric | YES | — | Computed daily rate |
| `rent_amount` | numeric | YES | — | Total rent for booking period |
| `printing_rate_per_sqft` | numeric | NOT NULL | `0` | Per-sqft printing rate |
| `printing_cost` | numeric | NOT NULL | `0` | Total printing cost |
| `printing_cost_default` | numeric | YES | — | Default printing from asset |
| `printing_charges` | numeric | YES | — | Final printing charges used |
| `printing_billed` | boolean | YES | — | Whether printing invoiced |
| `mounting_rate_per_sqft` | numeric | NOT NULL | `0` | Per-sqft mounting rate |
| `mounting_cost` | numeric | NOT NULL | `0` | Total mounting cost |
| `mounting_cost_default` | numeric | YES | — | Default mounting from asset |
| `mounting_charges` | numeric | YES | — | Final mounting charges used |
| `mounting_billed` | boolean | YES | — | Whether mounting invoiced |
| `total_price` | numeric | YES | — | Rent + printing + mounting |
| `tax_percent` | numeric | YES | — | GST rate |
| `billing_mode` | text | NOT NULL | `'monthly'` | monthly / one-time / prorata |
| `booking_start_date` | text (date) | YES | — | **Asset-level start date** |
| `booking_end_date` | text (date) | YES | — | **Asset-level end date** |
| `booked_days` | integer | YES | — | Computed days |
| `start_date` | text (date) | YES | — | Legacy start date field |
| `end_date` | text (date) | YES | — | Legacy end date field |
| `status` | enum `asset_installation_status` | NOT NULL | `'Pending'` | Installation status |
| `installation_status` | text | YES | — | Legacy installation field |
| `assigned_mounter_id` | text | YES | — | FK → `mounters.id` |
| `mounter_name` | text | YES | — | Denormalized mounter name |
| `assigned_at` | timestamptz | YES | — | When mounter assigned |
| `completed_at` | timestamptz | YES | — | When installation completed |
| `photos` | jsonb | YES | — | Proof photos JSON |
| `invoice_generated_months` | text[] | YES | — | **Array of month keys already billed (prevents double-billing)** |
| `created_at` | timestamptz | YES | `now()` | |

### Installation Status Enum (`asset_installation_status`)
| Value | Meaning |
|-------|---------|
| `Pending` | Not yet assigned |
| `Assigned` | Mounter assigned |
| `Installed` | Physical installation done |
| `Proof Uploaded` | Photos uploaded |
| `Verified` | QC approved |
| `Removed` | Dismounted |

### Key Rules
- **Multiple campaigns CAN exist for the same asset** as long as booking dates don't overlap.
- `invoice_generated_months` (e.g., `['2025-01', '2025-02']`) prevents duplicate billing for a given month.
- All billing calculations must use `booking_start_date` / `booking_end_date` and `negotiated_rate` from this table, NOT from the campaign header.

---

## 4. `invoices` — Invoice Records

**Purpose:** Tracks all invoices generated for campaigns, with full GST breakdown and payment tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | text | NOT NULL | — | **PK.** e.g., `INV-2025-26-0001` |
| `company_id` | uuid | NOT NULL | — | FK → `companies.id` |
| `campaign_id` | text | YES | — | FK → `campaigns.id` |
| `client_id` | text | YES | — | FK → `clients.id` |
| `client_name` | text | YES | — | Denormalized |
| `estimation_id` | text | YES | — | FK → `estimations.id` |
| `invoice_number` | text | NOT NULL | — | Display number |
| `invoice_date` | date | NOT NULL | — | Date of issue |
| `due_date` | date | YES | — | Payment due date |
| `billing_period_start` | date | YES | — | Period start |
| `billing_period_end` | date | YES | — | Period end |
| `billing_month` | text | YES | — | e.g., `2025-01` |
| `subtotal` | numeric | NOT NULL | `0` | Pre-tax total |
| `discount_amount` | numeric | YES | `0` | Discount applied |
| `taxable_amount` | numeric | NOT NULL | `0` | After discount |
| `cgst_rate` | numeric | YES | `9` | CGST rate % |
| `sgst_rate` | numeric | YES | `9` | SGST rate % |
| `igst_rate` | numeric | YES | `0` | IGST rate % |
| `cgst_amount` | numeric | YES | `0` | CGST amount |
| `sgst_amount` | numeric | YES | `0` | SGST amount |
| `igst_amount` | numeric | YES | `0` | IGST amount |
| `total_tax` | numeric | YES | `0` | Total GST |
| `total_amount` | numeric | NOT NULL | `0` | Final amount incl. tax |
| `paid_amount` | numeric | YES | `0` | Amount received so far |
| `balance_due` | numeric | YES | `0` | Remaining balance |
| `status` | text | NOT NULL | `'Draft'` | **Draft / Sent / Partial / Paid / Overdue / Cancelled** |
| `payment_terms` | text | YES | — | e.g., "Net 30" |
| `notes` | text | YES | — | Internal notes |
| `terms_and_conditions` | text | YES | — | Invoice T&C |
| `items` | jsonb | YES | — | Line items JSON |
| `bank_details` | jsonb | YES | — | Bank info for payment |
| `company_details` | jsonb | YES | — | Company info snapshot |
| `client_details` | jsonb | YES | — | Client info snapshot |
| `is_proforma` | boolean | YES | `false` | Proforma flag |
| `is_recurring` | boolean | YES | `false` | Recurring flag |
| `recurring_config` | jsonb | YES | — | Recurring settings |
| `invoice_pdf_url` | text | YES | — | Generated PDF URL |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |
| `created_by` | uuid | YES | — | User who created |

### Invoice Status Values
| Value | Meaning |
|-------|---------|
| `Draft` | Not yet sent |
| `Sent` | Sent to client |
| `Partial` | Partially paid |
| `Paid` | Fully paid |
| `Overdue` | Past due date with balance remaining |
| `Cancelled` | Voided |

### Key Rules
- `balance_due` is maintained by database triggers when payments are recorded.
- Invoices auto-transition to `Overdue` when `balance_due > 0` AND `current_date > due_date`.
- `billing_month` field links to `campaign_assets.invoice_generated_months` to prevent double-billing.

---

## 5. `payment_records` — Payment Transactions

**Purpose:** Individual payment transactions against invoices. Supports partial payments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | **PK** |
| `company_id` | uuid | NOT NULL | — | FK → `companies.id` |
| `invoice_id` | text | NOT NULL | — | FK → `invoices.id` |
| `amount` | numeric | NOT NULL | — | Payment amount |
| `payment_date` | date | NOT NULL | — | Date of payment |
| `payment_method` | text | YES | — | NEFT / RTGS / UPI / Cheque / Cash |
| `reference_number` | text | YES | — | Transaction reference |
| `notes` | text | YES | — | Payment notes |
| `receipt_url` | text | YES | — | Receipt file URL |
| `recorded_by` | uuid | YES | — | User who recorded |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

### Key Rules
- **Partial payments ARE supported.** Multiple `payment_records` can exist per invoice.
- A database trigger updates `invoices.paid_amount` and `invoices.balance_due` on each payment insert.
- Invoice status transitions: `Sent → Partial` (when some paid), `Partial → Paid` (when balance_due = 0).
- Payments are restricted to non-draft invoices and cannot exceed `balance_due`.

---

## 6. Existing Automations

### Campaign Status Auto-Update (pg_cron)
- **Function:** `public.auto_update_campaign_status()`
- **Schedule:** Hourly via `pg_cron`
- **Logic:**
  - `Draft/Upcoming` → `Running` when `start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`
  - `Running` → `Completed` when `end_date < CURRENT_DATE`
  - Releases expired assets: sets `media_assets.status = 'Available'` and clears `current_campaign_id`

### Power Bill Reminders (pg_cron)
- **Function:** `public.process_bill_reminders()`
- **Schedule:** Daily
- **Logic:** Sends reminders for unpaid power bills approaching due dates

### What Does NOT Exist Yet
- ❌ Campaign ending alerts (e.g., "Campaign X ends in 7 days")
- ❌ Invoice generation alerts
- ❌ Payment due / outstanding alerts
- ❌ Daily email notification digest
- ❌ WhatsApp notifications for campaigns or invoices

---

## 7. Supporting Tables for Alerts

### `invoice_reminders`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK |
| `invoice_id` | text | FK → invoices.id |
| `reminder_type` | text | email / whatsapp / sms |
| `scheduled_for` | timestamptz | When to send |
| `sent_at` | timestamptz | When actually sent |
| `status` | text | pending / sent / failed |
| `message` | text | Reminder content |
| `recipient` | text | Email/phone |
| `error_message` | text | If failed |

### `payment_reminders`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK |
| `invoice_id` | text | FK → invoices.id |
| `reminder_type` | text | email / whatsapp |
| `bucket_days` | integer | 7 / 15 / 30 / 45 |
| `scheduled_for` | timestamptz | When to send |
| `sent_at` | timestamptz | When sent |
| `status` | text | pending / sent / failed |
| `message` | text | Content |
| `recipient` | text | Email/phone |

### `auto_reminder_settings`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | PK |
| `company_id` | uuid | FK → companies.id |
| `enabled` | boolean | Master toggle |
| `email_enabled` | boolean | Email channel |
| `whatsapp_enabled` | boolean | WhatsApp channel |
| `buckets_enabled` | integer[] | e.g., [7, 15, 30, 45] |

---

## 8. Date & Timezone Handling

| Aspect | Detail |
|--------|--------|
| Business dates | `date` type (booking dates, invoice dates, due dates) |
| System timestamps | `timestamptz` (UTC) |
| Server timezone | UTC (Supabase default) |
| Client display | Converted to IST (UTC+5:30) in frontend |

---

## 9. Sample Rows (Anonymized)

### media_assets
```json
{
  "id": "HYD-BQS-0033",
  "company_id": "a1b2c3d4-...",
  "media_type": "bus_shelter",
  "city": "Hyderabad",
  "area": "Begumpet",
  "location": "Near Metro Station, Main Road",
  "direction": "Facing North",
  "dimensions": "10x5 ft",
  "total_sqft": 50,
  "illumination_type": "FL",
  "card_rate": 15000,
  "base_rate": 10000,
  "status": "Available",
  "is_public": true,
  "created_at": "2025-03-15T10:30:00Z"
}
```

### campaign_assets
```json
{
  "id": "uuid-xxx",
  "campaign_id": "CMP-202501-003",
  "asset_id": "HYD-BQS-0033",
  "city": "Hyderabad",
  "area": "Begumpet",
  "location": "Near Metro Station",
  "media_type": "bus_shelter",
  "card_rate": 15000,
  "negotiated_rate": 12000,
  "daily_rate": 400,
  "rent_amount": 12000,
  "printing_cost": 2500,
  "mounting_cost": 1500,
  "total_price": 16000,
  "booking_start_date": "2025-01-01",
  "booking_end_date": "2025-01-31",
  "booked_days": 31,
  "billing_mode": "monthly",
  "status": "Verified",
  "invoice_generated_months": ["2025-01"]
}
```

### invoices
```json
{
  "id": "INV-2025-26-0042",
  "company_id": "a1b2c3d4-...",
  "campaign_id": "CMP-202501-003",
  "client_id": "CLT-202501-001",
  "client_name": "ABC Outdoor Ads",
  "invoice_number": "INV-2025-26-0042",
  "invoice_date": "2025-02-01",
  "due_date": "2025-03-03",
  "billing_period_start": "2025-01-01",
  "billing_period_end": "2025-01-31",
  "billing_month": "2025-01",
  "subtotal": 160000,
  "taxable_amount": 160000,
  "cgst_rate": 9,
  "sgst_rate": 9,
  "cgst_amount": 14400,
  "sgst_amount": 14400,
  "total_tax": 28800,
  "total_amount": 188800,
  "paid_amount": 100000,
  "balance_due": 88800,
  "status": "Partial"
}
```

### payment_records
```json
{
  "id": "uuid-yyy",
  "company_id": "a1b2c3d4-...",
  "invoice_id": "INV-2025-26-0042",
  "amount": 100000,
  "payment_date": "2025-02-15",
  "payment_method": "NEFT",
  "reference_number": "NEFT-REF-12345",
  "notes": "First installment",
  "recorded_by": "uuid-user"
}
```

---

## 10. Key Relationships Diagram

```
companies (tenant)
  ├── media_assets (inventory)
  │     └── campaign_assets (booking link)
  │           └── campaigns (campaign header)
  │                 └── invoices (billing)
  │                       └── payment_records (payments)
  ├── clients
  ├── plans → plan_items
  ├── leads
  └── expenses
```

---

## 11. Automation-Ready Queries

### Assets expiring in next 7 days
```sql
SELECT ca.asset_id, ca.campaign_id, ca.booking_end_date, c.campaign_name, c.client_name
FROM campaign_assets ca
JOIN campaigns c ON ca.campaign_id = c.id
WHERE ca.booking_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND c.status IN ('Running', 'Upcoming')
  AND (c.is_deleted IS NULL OR c.is_deleted = false);
```

### Overdue invoices
```sql
SELECT id, invoice_number, client_name, total_amount, balance_due, due_date,
       (CURRENT_DATE - due_date) AS days_overdue
FROM invoices
WHERE balance_due > 0
  AND due_date < CURRENT_DATE
  AND status NOT IN ('Cancelled', 'Draft')
ORDER BY days_overdue DESC;
```

### Campaigns ending this week
```sql
SELECT id, campaign_name, client_name, end_date, status
FROM campaigns
WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status = 'Running'
  AND (is_deleted IS NULL OR is_deleted = false);
```

### Uninvoiced campaign months
```sql
SELECT ca.campaign_id, ca.asset_id, ca.booking_start_date, ca.booking_end_date,
       ca.invoice_generated_months
FROM campaign_assets ca
JOIN campaigns c ON ca.campaign_id = c.id
WHERE c.status IN ('Running', 'Completed')
  AND (c.is_deleted IS NULL OR c.is_deleted = false);
-- Compare booking period months against invoice_generated_months array to find gaps
```

---

*End of Data Model Reference*
