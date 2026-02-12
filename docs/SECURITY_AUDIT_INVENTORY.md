# Go-Ads 360° — Edge Function Security Audit Inventory

> **Generated:** 2026-02-12 | **Phase:** 6 Final  
> **Total Functions:** 87 | **Using Service Role:** 37 | **Migrated to User-Scoped:** 35

---

## Legend

| Column | Meaning |
|--------|---------|
| **verify_jwt** | `true` = Supabase gateway validates JWT before invocation; `false` = function handles its own auth |
| **Trigger** | `UI` = called from frontend by logged-in user; `Cron` = scheduled/system; `Portal` = public token/magic-link; `Internal` = called by other functions |
| **Service Role** | `Yes` = uses `SUPABASE_SERVICE_ROLE_KEY`; `Scoped` = uses `supabaseUserClient` (RLS); `Mixed` = user client + limited service for specific ops |
| **Auth Method** | JWT = user token; HMAC = cron secret; Token = share/magic token; None = public read-only |
| **Data** | Fin = financial; PII = personal data; Ops = operational; Assets = media inventory |
| **Decision** | ✅ = secure; 🔄 = migrated this phase; ⚠️ = needs future work; 🛡️ = HMAC protected |

---

## A. MIGRATED USER-TRIGGERED FUNCTIONS (Phase 3-6) — ✅ Secure

| # | Function | verify_jwt | Trigger | Service Role | Auth Method | Roles Allowed | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|---------------|------|----------|
| 1 | `create-user` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 2 | `delete-user` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 3 | `update-user` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 4 | `reset-user-password` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 5 | `assign-user-permissions` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 6 | `add-user-to-company` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 7 | `list-users` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 8 | `list-company-users` | true | UI | Mixed | JWT+Role | admin, sales, ops, finance | PII | ✅ |
| 9 | `update-company-user` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 10 | `send-user-invite` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 11 | `reset-admin-password` | true | UI | Mixed | JWT+Role | admin | PII | ✅ |
| 12 | `seed-demo-data` | true | UI | Mixed | JWT+Role | admin | All | ✅ |
| 13 | `clear-demo-data` | true | UI | Mixed | JWT+Role | admin | All | ✅ |
| 14 | `convert-plan-to-campaign` | true | UI | Mixed | JWT+Role | admin, sales | Ops+Fin | ✅ |
| 15 | `create-direct-campaign` | true | UI | Mixed | JWT+Role | admin, sales | Ops+Fin | ✅ |
| 16 | `get-media-availability` | true | UI | Mixed | JWT+Role | admin, sales, ops | Assets | ✅ |
| 17 | `validate-media-assets` | true | UI | Mixed | JWT+Role | admin | Assets | ✅ |
| 18 | `fix-asset-issues` | true | UI | Mixed | JWT+Role | admin | Assets | ✅ |
| 19 | `capture-bill-receipt` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 20 | `auto-generate-invoice` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 21 | `auto-record-expenses` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 22 | `generate-invoice-pdf` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 23 | `import-finance-data` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 24 | `upload-operation-photo` | true | UI | Mixed | JWT+Role | admin, ops | Ops | ✅ |
| 25 | `send-payment-reminders` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 26 | `generate-share-token` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 27 | `business-ai-assistant` | true | UI | Mixed | JWT+Role | admin, sales, ops | All | 🔄 ✅ Phase-6 |
| 28 | `ask-ai` | true | UI | Mixed | JWT+Role | admin, sales, ops | All | 🔄 ✅ Phase-6 |
| 29 | `generate-vacant-media-ppt` | true | UI | Mixed | JWT+Role | admin, sales | Assets | 🔄 ✅ Phase-6 |
| 30 | `auto-create-mounting-tasks` | true | UI | Mixed | JWT+Role | admin, ops | Ops | 🔄 ✅ Phase-6 |
| 31 | `fetch-tgspdcl-bill` | true | UI | Mixed | JWT+Role | admin, finance | Fin | 🔄 ✅ Phase-6 |
| 32 | `fetch-tgspdcl-payment` | true | UI | Mixed | JWT+Role | admin, finance | Fin | 🔄 ✅ Phase-6 |
| 33 | `send-notification-email` | true | UI | Mixed | JWT+Role+RecipientValidation | admin, sales, finance | PII | 🔄 ✅ Phase-6 |
| 34 | `send-email` | true | UI | Mixed | JWT+Role+RecipientValidation | admin, sales, finance | PII | 🔄 ✅ Phase-6 |
| 35 | `send-approval-notification` | true | UI | Mixed | JWT+Role | admin, sales, finance | PII+Fin | 🔄 ✅ Phase-6 |

---

## B. HMAC-PROTECTED SYSTEM/CRON ENDPOINTS — 🛡️ Secure

| # | Function | verify_jwt | Trigger | Service Role | Auth Method | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|------|----------|
| 36 | `update-campaign-statuses` | true | Cron | Yes (system) | HMAC | Ops | 🛡️ ✅ |
| 37 | `tgspdcl-monthly-job` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |
| 38 | `fetch-monthly-power-bills` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |
| 39 | `send-daily-alerts` | false | Cron | Yes (system) | HMAC | Ops | 🛡️ ✅ |
| 40 | `send-power-bill-reminders` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |
| 41 | `send-plan-reminders` | false | Cron | Yes (system) | HMAC | Fin | 🔄 🛡️ ✅ Phase-6 |

---

## C. PUBLIC TOKEN-SECURED ENDPOINTS — ✅ Secure (with rate limiting)

| # | Function | verify_jwt | Trigger | Auth Method | Rate Limited | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|------|----------|
| 42 | `generate-invoice-pdf-portal` | false | Portal | Share Token | ✅ 10/min/IP | Fin | ✅ |
| 43 | `verify-magic-link` | false | Portal | Magic Token | ✅ 5/min/IP | PII | ✅ |
| 44 | `verify-client-portal-magic-link` | false | Portal | Magic Token | ✅ 5/min/IP | PII | ✅ |
| 45 | `send-client-portal-magic-link` | false | Portal | None (email) | ✅ 3/min/IP | PII | ✅ |
| 46 | `generate-magic-link` | true | UI | JWT | N/A | PII | ✅ |
| 47 | `get-vapid-public-key` | false | Portal | None | ✅ 30/min/IP | None | ✅ |
| 48 | `generate-asset-qr` | false | Portal/UI | None | ✅ 10/min/IP | Assets | ✅ |
| 49 | `verify-qr-scan` | false | Mobile | JWT (manual) | ✅ 10/min/IP | Ops | ✅ |

---

## D. Phase-6 Test Checklist

### business-ai-assistant
- [ ] Missing auth → 401
- [ ] body.companyId ignored → uses ctx.companyId
- [ ] Wrong role (viewer) → 403
- [ ] Rate limit (>20/min) → 429

### ask-ai
- [ ] Missing auth → 401
- [ ] body.userId/companyId ignored → uses ctx
- [ ] Wrong role (viewer) → 403
- [ ] Rate limit (>20/min) → 429

### generate-vacant-media-ppt
- [ ] Missing auth → 401
- [ ] body.company_id ignored → uses ctx.companyId
- [ ] Only admin/sales allowed → ops gets 403
- [ ] Rate limit (>5/min) → 429
- [ ] Audit log created for export

### auto-create-mounting-tasks
- [ ] Missing auth → 401
- [ ] Campaign from different company → 403
- [ ] Only admin/ops → sales gets 403
- [ ] Audit log created

### fetch-tgspdcl-bill / fetch-tgspdcl-payment
- [ ] Missing auth → 401
- [ ] Asset from different company → 403
- [ ] Only admin/finance → viewer gets 403
- [ ] Audit log on bill store

### send-notification-email / send-email
- [ ] Missing auth → 401
- [ ] Recipient not in company DB → 403
- [ ] Rate limit (>10/min) → 429
- [ ] Audit log on send

### send-approval-notification
- [ ] Missing auth → 401
- [ ] Plan from different company → 403
- [ ] Rate limit (>5/min) → 429
- [ ] Audit log

### send-plan-reminders
- [ ] Missing HMAC headers → 401
- [ ] Invalid signature → 401
- [ ] Stale timestamp (>5min) → 401

---

## E. SECRET ROTATION GUIDE

| Secret | Location | Rotation Steps |
|--------|----------|---------------|
| `CRON_HMAC_SECRET` | Edge Functions env | 1. Generate new 64-char hex. 2. Update in Cloud secrets. 3. Update cron caller. 4. Verify all 6 HMAC endpoints. |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-managed | Rotate via Cloud dashboard. |
| `RESEND_API_KEY` | Edge Functions env | 1. New key in Resend. 2. Update secret. 3. Test email. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Edge Functions env | 1. Generate keypair. 2. Update both. 3. Re-subscribe push clients. |
| `LOVABLE_API_KEY` | Auto-managed | Managed by Lovable Cloud. |
