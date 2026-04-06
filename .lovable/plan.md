

# Collections Communication Hub — Implementation Plan

## Overview
Add a communication layer to the Collections module that lets the finance team send professional, context-rich payment reminders (with campaign details and media line items) via WhatsApp/Email/Copy, with full logging and history.

## Architecture

The feature adds a 5th tab ("Communications") to the existing Collections page, a "Send Reminder" action button per invoice row, and a communication modal that auto-generates structured messages with campaign + line item context.

```text
FinanceCollections.tsx
  ├── [existing 4 tabs]
  ├── NEW: "Communications" tab
  │     └── CollectionCommunicationsTab.tsx (history + bulk)
  ├── NEW: "Send Reminder" button per row (actions column)
  │     └── SendReminderModal.tsx (message preview + channel selection)
  └── NEW: hook useInvoiceContext.ts (batch-fetch campaign + items)
```

## Database

**New table: `collection_communications`**
- `id` (uuid PK), `company_id` (uuid FK), `client_id` (text), `invoice_id` (text), `campaign_id` (text nullable)
- `message` (text), `channel` (text: whatsapp/email/call/note), `template_type` (text)
- `sent_by` (uuid), `sent_at` (timestamptz), `status` (text: sent/draft/failed)
- RLS: company_id scoped (select/insert for authenticated users matching company)

No changes to invoices, payments, or any existing table.

## Implementation Phases

### 1. Database Migration
Create `collection_communications` table with company-scoped RLS policies.

### 2. Template Engine (`src/utils/collectionTemplates.ts`)
- Define 6 template types: `due_reminder`, `overdue_reminder`, `final_reminder`, `promise_broken`, `tds_certificate`, `ledger_share`
- Auto-selection logic based on overdue days / promise status
- Variable replacement: `{{client_name}}`, `{{invoice_no}}`, `{{due_date}}`, `{{balance_due}}`, `{{overdue_days}}`, `{{campaign_name}}`, `{{campaign_duration}}`, `{{top_items}}`, `{{company_name}}`
- `{{top_items}}` renders top 3 line items from `invoice_items` as bullet points with location, dimension, days, rate, total
- Fallbacks: no campaign → skip section; no items → show summary only

### 3. Invoice Context Hook (`src/hooks/useInvoiceContext.ts`)
- Batch-fetch `invoice_items` and `campaigns` for a set of invoice IDs
- Single query each (avoid N+1): `.in('invoice_id', ids)` for items, `.in('id', campaignIds)` for campaigns
- Returns `{ items: Record<invoiceId, Item[]>, campaigns: Record<campaignId, Campaign> }`
- Memoized and cached per render cycle

### 4. Send Reminder Modal (`src/components/collections/SendReminderModal.tsx`)
- Triggered from worklist row action button or bulk selection
- Shows: client name, campaign name + duration, invoice no, amount due, overdue status
- Preview of top 2-3 line items (location, dimension, days @ rate = total)
- Template auto-selected, editable message textarea
- Channel buttons: WhatsApp (opens `wa.me` deep link), Email (draft preview), Copy to Clipboard, Internal Note
- On send: inserts into `collection_communications`, optionally creates `invoice_followups` entry
- Validation: message required, channel required

### 5. Communications History Tab
- New 5th tab in FinanceCollections: "Comms" with count badge
- Table: Date, Client, Invoice, Channel, Template Type, Message preview (truncated), Sent By
- Filters: channel, date range, client
- Also accessible from FollowupHistoryModal (show last 2 inline)

### 6. Bulk Reminders
- Multi-select in worklist → "Send Reminders" button
- Generates personalized message per invoice (resolves campaign + items per invoice)
- Logs each communication individually
- Progress indicator during batch send

### 7. Integration Points
- Worklist table: add "Send Reminder" icon button in actions column
- FollowupHistoryModal: show last 1-2 communications inline at top
- Client Ledger: show communication count badge (future hook)

## Files to Create
1. `supabase/migrations/..._collection_communications.sql` — table + RLS
2. `src/utils/collectionTemplates.ts` — templates + variable replacement + auto-selection
3. `src/hooks/useInvoiceContext.ts` — batch context fetcher
4. `src/components/collections/SendReminderModal.tsx` — main communication modal
5. `src/components/collections/CollectionCommunicationsTab.tsx` — history tab

## Files to Edit
1. `src/pages/FinanceCollections.tsx` — add 5th tab, "Send Reminder" action button, bulk reminder button, wire modal
2. `src/components/collections/FollowupHistoryModal.tsx` — show recent communications inline

## Key Technical Decisions
- Line items limited to top 3 with "(and more locations...)" suffix
- Currency formatted as ₹ with INR formatting
- Campaign duration formatted as "01 Apr – 30 Jun 2026"
- WhatsApp uses `https://wa.me/?text=` with URL-encoded message
- No external email sending — just draft preview and copy; actual sending deferred to existing email infrastructure
- Template auto-selection: not due → due_reminder, 1-7d → overdue, 8-15d → overdue, 15+ → final, promise broken → promise_broken

