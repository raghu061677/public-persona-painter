## WhatsApp Cloud API Integration — Go-Ads 360°

### Existing assets discovered (will reuse, not duplicate)
- `public.leads` table already exists with `source`, `status`, `company_id`, `assigned_to`, `client_id`, `metadata` (jsonb), and merge fields. It supports `source='whatsapp'`.
- `public.whatsapp_logs` table already exists (incoming/outgoing, status, lead_id, message_body, media_url) — covers most of the spec for `whatsapp_messages`.
- RLS helpers `current_company_id()`, `is_company_member()`, `has_company_role()` exist — will use them.
- Leads routes live at `/admin/leads`, `/admin/leads/new`, `/admin/leads/:id` — already wired in `App.tsx`.
- No existing WhatsApp edge function or admin UI page.

### Decision
Rather than create parallel `whatsapp_leads` / `whatsapp_messages` tables (which would fork lead data and break the existing Lead Merge Engine, Kanban, follow-ups, and client conversion flows), I will:

1. **Reuse `public.leads`** for WhatsApp enquiries (`source='whatsapp'`). Add a few WhatsApp-specific columns the spec requires that are missing today.
2. **Extend `public.whatsapp_logs`** with the missing fields from the spec (`wa_message_id`, `from_number`, `to_number`, `contact_name`, `raw_payload`, `client_id`, `direction` alias, `updated_at`) — preserving existing data and policies.
3. Add a new `public.whatsapp_settings` (single-row per company) for templates + auto-reply config.

This keeps Convert-to-Client / Convert-to-Plan / Follow-ups / Merge Review all working without rewrites.

---

### Phase 1 — Database migration
- ALTER `leads`: add `company_name text`, `target_locations text`, `campaign_start_date date`, `campaign_end_date date`, `campaign_duration_days int`, `estimated_budget numeric`, `media_type text`, `last_message_at timestamptz`, `plan_id text`. (Name/phone/requirement/source/status/assigned_to/client_id already exist.)
- ALTER `whatsapp_logs`: add `wa_message_id text unique`, `from_number text`, `to_number text`, `contact_name text`, `raw_payload jsonb`, `client_id text`, `updated_at timestamptz default now()`, `company_id uuid`. Add index on `wa_message_id` and `lead_id`.
- CREATE `whatsapp_settings (company_id uuid pk, auto_reply_enabled bool default true, auto_reply_text text, proposal_template text, proof_template text, payment_template text, phone_number_id text, updated_at timestamptz)` with RLS via `has_company_role(auth.uid(), company_id, 'admin')`.
- RLS: tighten `whatsapp_logs` policies to `is_company_member(company_id)`; keep service-role bypass for the webhook.

### Phase 2 — Edge function `whatsapp-webhook` (public, verify_jwt=false)
- GET: verify `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN`, echo `hub.challenge`.
- POST: parse Meta payload → for each message:
  - Insert into `whatsapp_logs` (idempotent via `wa_message_id`).
  - Find lead by phone (`source='whatsapp'`). If none → create lead (status `new`, parse text for budget/locations/dates with simple regex; richer parsing can call existing `ai-lead-parser`).
  - Update `last_message_at`, link `lead_id`.
  - Status callbacks: update `whatsapp_logs.status`.
  - If `auto_reply_enabled` AND lead is brand-new (or last reply > 24h) → call `send-whatsapp-message` once.

### Phase 3 — Edge function `send-whatsapp-message` (verify_jwt=true)
- Validate `to`, `message`. Auth via `getClaims`.
- POST to `https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`.
- Insert outgoing row in `whatsapp_logs` with returned `wa_message_id`, link `lead_id`/`client_id`, update `leads.last_message_at`.

### Phase 4 — Admin UI `/admin/leads/whatsapp`
- New page `src/pages/WhatsAppLeads.tsx`. Reuses existing `ResponsiveTable`, `StatCard`, filter primitives.
- KPIs: New / Requirement Received / Proposal Sent / Converted (counts on `leads where source='whatsapp'`).
- Filters: status, media_type, date range, search (name/phone/company/location/requirement).
- Row actions: View Conversation, Send Reply, Create Client, Create Plan, Mark Converted, Mark Lost.

### Phase 5 — Conversation drawer
- New `src/components/whatsapp/ConversationDrawer.tsx` (uses existing `Sheet`).
- Loads `whatsapp_logs` for the lead's phone, chat-bubble layout (incoming left, outgoing right), reply textarea + Send → calls `send-whatsapp-message`. Realtime subscription on `whatsapp_logs` for live refresh.

### Phase 6 — Convert to Client
- New `CreateClientFromLeadDialog.tsx`. Pre-fills name/phone/company. Phone-duplicate check against `clients.phone`; if found → offers "Link existing client". On save reuses existing client insert logic (same as `LeadDetail` convert), then sets `leads.client_id` and `status='converted'` (or `contacted`).

### Phase 7 — Convert to Plan
- Reuses `/admin/plans/new` route. If `lead.client_id` empty → opens Create Client dialog first. Then navigates to plan builder with query params (`?client_id=&start=&end=&media_type=&locations=`). Plan builder already accepts pre-fill; small additions if missing. On save → write back `leads.plan_id` and bump status.

### Phase 8 — Auto reply
- Logic in webhook (Phase 2). Configurable via `whatsapp_settings.auto_reply_enabled` AND env `WHATSAPP_AUTO_REPLY_ENABLED` (default true). Throttle: only on lead creation or if `last_message_at` > 24h ago.

### Phase 9 — Settings page `/admin/settings/whatsapp`
- New `src/pages/WhatsAppSettings.tsx`. Edits `whatsapp_settings` row: phone number ID, verify-token guidance (read-only with copy), webhook URL display, auto-reply toggle + text, proposal/proof/payment templates with `{{variable}}` reference. Access tokens never shown.

### Phase 10 — Navigation
- `DesktopNavFromConfig` / `MobileAccordionNav` config: under existing Leads group add "WhatsApp" → `/admin/leads/whatsapp`. (Clients, Email, Follow-ups already present per current nav config.) Add Settings → "WhatsApp" entry.

### Phase 11 — Secrets to add (Supabase)
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_AUTO_REPLY_ENABLED` (optional, defaults true)
- Webhook URL: `https://psryfvfdmjguhamvmqqd.supabase.co/functions/v1/whatsapp-webhook`

### Phase 12 — Security
- Webhook function: `verify_jwt = false` in `supabase/config.toml`, validates Meta verify token; uses service role only inside the function.
- Send function: JWT-validated via `getClaims`; rate-limit per user (simple in-memory map).
- All UI pages behind `ProtectedRoute` with `requiredModule="clients"`.
- Access token never sent to client; templates table has no token columns.

### Files to be created
- `supabase/migrations/<ts>_whatsapp_integration.sql`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `src/pages/WhatsAppLeads.tsx`
- `src/pages/WhatsAppSettings.tsx`
- `src/components/whatsapp/ConversationDrawer.tsx`
- `src/components/whatsapp/CreateClientFromLeadDialog.tsx`
- `src/components/whatsapp/SendReplyForm.tsx`
- `src/lib/whatsapp/parseEnquiry.ts` (lightweight regex parser)

### Files to be modified
- `src/App.tsx` — add 2 routes (`leads/whatsapp`, `settings/whatsapp`).
- `src/config/routes.ts` + nav config — add menu entries.
- `supabase/config.toml` — add `[functions.whatsapp-webhook] verify_jwt = false`.

### Will NOT touch
Media Assets, Plans (schema), Campaigns, Operations, Proof upload, Invoices, Client Portal, Reports, existing Lead Merge / Kanban / `LeadDetail` flows. Existing `whatsapp_logs` rows preserved.

### Testing checklist
1. GET `/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=123` → returns `123`.
2. POST sample Meta inbound payload → row in `whatsapp_logs`, new row in `leads` with `source='whatsapp'`.
3. Auto-reply fires once for new lead, not on subsequent messages within 24h.
4. UI `/admin/leads/whatsapp` lists lead with correct KPIs/filters.
5. Open conversation → see incoming bubble. Send reply → outgoing row created, Meta API called, bubble appears.
6. Create Client → new client linked, duplicate phone surfaces existing client.
7. Create Plan → redirects to plan builder pre-filled, on save `leads.plan_id` populated.
8. Mark Converted / Lost updates `leads.status`.
9. RLS: a user from another company cannot see leads/messages.

Approve to implement.
