# Go-Ads 360° — Edge Function Security Audit Inventory

> **Generated:** 2026-02-12 | **Phase:** 5 Final  
> **Total Functions:** 87 | **Using Service Role:** 46 | **Migrated to User-Scoped:** 26

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

## A. MIGRATED USER-TRIGGERED FUNCTIONS (Phase 3-5) — ✅ Secure

| # | Function | verify_jwt | Trigger | Service Role | Auth Method | Roles Allowed | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|---------------|------|----------|
| 1 | `create-user` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 2 | `delete-user` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 3 | `update-user` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 4 | `reset-user-password` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 5 | `assign-user-permissions` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 6 | `add-user-to-company` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 7 | `list-users` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 8 | `list-company-users` | true | UI | Mixed | JWT+Role | admin, sales, ops, finance | PII | 🔄 ✅ |
| 9 | `update-company-user` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 10 | `send-user-invite` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 11 | `reset-admin-password` | true | UI | Mixed | JWT+Role | admin | PII | 🔄 ✅ |
| 12 | `seed-demo-data` | true | UI | Mixed | JWT+Role | admin | All | 🔄 ✅ |
| 13 | `clear-demo-data` | true | UI | Mixed | JWT+Role | admin | All | 🔄 ✅ |
| 14 | `convert-plan-to-campaign` | true | UI | Mixed | JWT+Role | admin, sales | Ops+Fin | 🔄 ✅ |
| 15 | `create-direct-campaign` | true | UI | Mixed | JWT+Role | admin, sales | Ops+Fin | 🔄 ✅ |
| 16 | `get-media-availability` | true | UI | Mixed | JWT+Role | admin, sales, ops | Assets | 🔄 ✅ |
| 17 | `validate-media-assets` | true | UI | Mixed | JWT+Role | admin | Assets | 🔄 ✅ |
| 18 | `fix-asset-issues` | true | UI | Mixed | JWT+Role | admin | Assets | 🔄 ✅ |
| 19 | `capture-bill-receipt` | true | UI | Mixed | JWT+Role | admin, finance | Fin | 🔄 ✅ |
| 20 | `auto-generate-invoice` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 21 | `auto-record-expenses` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 22 | `generate-invoice-pdf` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 23 | `import-finance-data` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 24 | `upload-operation-photo` | true | UI | Mixed | JWT+Role | admin, ops | Ops | ✅ |
| 25 | `send-payment-reminders` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |
| 26 | `generate-share-token` | true | UI | Mixed | JWT+Role | admin, finance | Fin | ✅ |

---

## B. HMAC-PROTECTED SYSTEM/CRON ENDPOINTS — 🛡️ Secure

| # | Function | verify_jwt | Trigger | Service Role | Auth Method | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|------|----------|
| 27 | `update-campaign-statuses` | true | Cron | Yes (system) | HMAC | Ops | 🛡️ ✅ |
| 28 | `tgspdcl-monthly-job` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |
| 29 | `fetch-monthly-power-bills` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |
| 30 | `send-daily-alerts` | false | Cron | Yes (system) | HMAC | Ops | 🛡️ ✅ |
| 31 | `send-power-bill-reminders` | false | Cron | Yes (system) | HMAC | Fin | 🛡️ ✅ |

---

## C. PUBLIC TOKEN-SECURED ENDPOINTS — ✅ Secure (with rate limiting)

| # | Function | verify_jwt | Trigger | Service Role | Auth Method | Rate Limited | Data | Decision |
|---|----------|-----------|---------|-------------|-------------|-------------|------|----------|
| 32 | `generate-invoice-pdf-portal` | false | Portal | Yes (scoped) | Share Token | ✅ 10/min/IP | Fin (sanitized) | ✅ |
| 33 | `verify-magic-link` | false | Portal | Yes (needed) | Magic Token | ✅ 5/min/IP | PII | 🔄 ✅ |
| 34 | `verify-client-portal-magic-link` | false | Portal | Yes (needed) | Magic Token | ✅ 5/min/IP | PII | 🔄 ✅ |
| 35 | `send-client-portal-magic-link` | false | Portal | Yes (needed) | None (email) | ✅ 3/min/IP | PII | 🔄 ✅ |
| 36 | `generate-magic-link` | true | UI | Yes (needed) | JWT | N/A (JWT) | PII | ✅ |
| 37 | `get-vapid-public-key` | false | Portal | No | None | ✅ 30/min/IP | None | 🔄 ✅ |
| 38 | `generate-asset-qr` | false | Portal/UI | Yes | None | ✅ 10/min/IP | Assets | 🔄 ✅ |
| 39 | `verify-qr-scan` | false | Mobile | Yes | JWT (manual) | ✅ 10/min/IP | Ops | 🔄 ✅ |

---

## D. USER-TRIGGERED FUNCTIONS — SERVICE ROLE JUSTIFIED (needs auth.admin or cross-RLS)

These functions require service role because they use `auth.admin.*` APIs (create user, generate link) or need cross-company reads that RLS blocks. They still validate JWT and verify the caller's identity.

| # | Function | verify_jwt | Trigger | Why Service Role | Auth Check | Data | Decision |
|---|----------|-----------|---------|-----------------|-----------|------|----------|
| 40 | `create-company-user` | true | UI | auth.admin.createUser | JWT verified | PII | ✅ Justified |
| 41 | `create-company-with-users` | true | UI | auth.admin.createUser | JWT verified | PII | ✅ Justified |
| 42 | `setup-matrix-company` | true | UI | Bootstrap/setup | JWT verified | All | ✅ One-time |
| 43 | `cleanup-duplicate-companies` | true | UI | Cross-company scan | JWT verified | All | ✅ Admin-only |
| 44 | `export-company-data` | true | UI | Cross-table export | JWT verified | All | ✅ Justified |
| 45 | `delete-company` | true | UI | Cascade delete | JWT verified | All | ✅ Justified |
| 46 | `send-client-portal-invite` | true | UI | auth.admin / email | JWT verified | PII | ✅ Justified |
| 47 | `send-welcome-email` | true | UI | Email delivery | JWT verified | PII | ✅ Justified |
| 48 | `migrate-company-data` | true | UI | Cross-company | JWT verified | All | ✅ Admin-only |

---

## E. USER-TRIGGERED — SERVICE ROLE USED BUT AUTH VERIFIED (⚠️ Future migration candidates)

These check JWT manually (`auth.getUser(token)`) but use service role client for queries. They're functional but should migrate to `supabaseUserClient` pattern for defense-in-depth.

| # | Function | verify_jwt | Trigger | Manual JWT Check | Data | Priority |
|---|----------|-----------|---------|-----------------|------|----------|
| 49 | `ai-assistant` | true | UI | ✅ getUser | Ops+Assets | Low (read-only) |
| 50 | `business-ai-assistant` | true | UI | ❌ trusts body companyId | All | ⚠️ **HIGH** |
| 51 | `ask-ai` | true | UI | ❌ trusts body userId/companyId | All | ⚠️ **HIGH** |
| 52 | `ai-proposal-generator` | true | UI | ✅ getUser + auth header | Plans | Medium |
| 53 | `ai-vacant-assets` | true | UI | ✅ getUser + auth header | Assets | Medium |
| 54 | `rate-suggester` | true | UI | ✅ getUser | Assets+Fin | Medium |
| 55 | `generate-campaign-excel` | true | UI | ✅ getUser + company check | Ops+Fin | Medium |
| 56 | `generate-proof-ppt` | true | UI | ✅ getUser + company check | Ops | Medium |
| 57 | `generate-proof-ppt-v2` | true | UI | ✅ getUser + company check | Ops | Medium |
| 58 | `generate-vacant-media-ppt` | true | UI | ❌ trusts body company_id | Assets | ⚠️ **HIGH** |
| 59 | `export-assets-excel` | true | UI | ✅ getUser + company check | Assets | Medium |
| 60 | `batch-generate-qr-codes` | true | UI | ✅ getUser + company check | Assets | Medium |
| 61 | `generate-all-asset-qr` | true | UI | ✅ getUser | Assets | Medium |
| 62 | `auto-create-mounting-tasks` | true | UI/Internal | ❌ No auth check | Ops | ⚠️ **HIGH** |
| 63 | `fetch-tgspdcl-bill` | true | UI | ❌ No visible auth | Fin | ⚠️ **HIGH** |
| 64 | `fetch-tgspdcl-payment` | true | UI | ❌ No visible auth | Fin | ⚠️ **HIGH** |
| 65 | `split-power-bill-expenses` | true | UI | Unknown | Fin | Medium |
| 66 | `send-notification-email` | true | UI/Internal | ❌ No auth check | PII | ⚠️ **HIGH** |
| 67 | `send-email` | true | UI | ❌ No auth check (uses Resend) | PII | ⚠️ **HIGH** |
| 68 | `send-approval-notification` | true | UI | ❌ No auth check | PII+Fin | ⚠️ **HIGH** |
| 69 | `send-plan-reminders` | true | UI | ❌ No auth check | Fin | ⚠️ **HIGH** |
| 70 | `send-push-notification` | true | UI | ❌ No auth check | Ops | Medium |
| 71 | `send-access-request-notification` | true | UI | ✅ Uses ANON_KEY + auth header | PII | ✅ OK |
| 72 | `send-receipt-notification` | true | UI/Internal | ❌ No auth check | Fin | Medium |
| 73 | `send-invoice-reminders` | true | UI | Unknown | Fin | Medium |
| 74 | `check-conflicts` | true | UI | Unknown | Assets | Low |
| 75 | `check-duplicate-asset-codes` | true | UI | Unknown | Assets | Low |
| 76 | `check-unassigned-records` | true | UI | Unknown | Assets | Low |
| 77 | `apply-qr-watermark-existing` | true | UI | Unknown | Assets | Low |
| 78 | `generate-streetview-url` | true | UI | Unknown | Assets | Low |
| 79 | `auto-assign-operations` | true | UI | Unknown | Ops | Medium |
| 80 | `audit-media-assets` | true | UI | Unknown | Assets | Medium |
| 81 | `forecast-media-availability` | true | UI | Unknown | Assets | Low |
| 82 | `revenue-forecast-ai` | true | UI | Unknown | Fin | Medium |
| 83 | `validate-mutation` | true | UI | ❌ No auth check | All | Medium |
| 84 | `validate-mutation-with-rate-limit` | true | UI | ❌ getUser fallback only | All | Medium |
| 85 | `validate-proof-photo` | true | UI | ❌ No auth check (AI only) | Ops | Low |
| 86 | `ai-lead-parser` | true | UI | ❌ No auth check (AI only) | PII | Medium |
| 87 | `ai-photo-quality` | true | UI | ❌ No auth check (AI only) | Ops | Low |

---

## F. FUNCTIONS NOT USING SERVICE ROLE — ✅ No Action Needed

| Function | Notes |
|----------|-------|
| `business-assistant` | Uses ANON_KEY + auth header forwarding ✅ |
| `send-access-request-notification` | Uses ANON_KEY + auth header forwarding ✅ |
| `ai-lead-parser` | No DB access, AI-only ✅ |
| `ai-photo-quality` | No DB access, AI-only ✅ |
| `validate-proof-photo` | No DB access, AI-only ✅ |

---

## G. CRITICAL FINDINGS SUMMARY

### 🔴 HIGH Priority (trust body-provided company_id/userId — cross-tenant risk)

| Function | Issue | Fix |
|----------|-------|-----|
| `business-ai-assistant` | Trusts `companyId` from request body | Derive from JWT via `getAuthContext()` |
| `ask-ai` | Trusts `userId` + `companyId` from body | Derive from JWT via `getAuthContext()` |
| `generate-vacant-media-ppt` | Trusts `company_id` from body | Derive from JWT |
| `auto-create-mounting-tasks` | No auth check at all | Add `withAuth` + `getAuthContext` |
| `fetch-tgspdcl-bill` | No visible auth check | Add `withAuth` + role gate |
| `fetch-tgspdcl-payment` | No visible auth check | Add `withAuth` + role gate |
| `send-notification-email` | No auth — anyone with JWT can send emails | Add role gate |
| `send-email` | No auth — open email sender | Add role gate |
| `send-approval-notification` | No auth check | Add role gate |
| `send-plan-reminders` | No auth check | Add `withAuth` + role gate |

### 🟡 MEDIUM Priority (JWT verified but uses service role for queries)

All functions in section E with "✅ getUser" — functional but should migrate to `supabaseUserClient` for defense-in-depth.

---

## H. SECRET ROTATION GUIDE

| Secret | Location | Rotation Steps |
|--------|----------|---------------|
| `CRON_HMAC_SECRET` | Edge Functions env | 1. Generate new 64-char hex secret. 2. Update in Cloud secrets. 3. Update in cron job caller. 4. Verify all 5 HMAC endpoints respond. |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-managed | Rotate via Cloud dashboard → regenerate keys. All edge functions auto-pick up new value. |
| `RESEND_API_KEY` | Edge Functions env | 1. Generate new key in Resend dashboard. 2. Update secret. 3. Test email delivery. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Edge Functions env | 1. Generate new VAPID keypair. 2. Update both secrets. 3. Re-subscribe all push clients. |
| `LOVABLE_API_KEY` | Auto-managed | Managed by Lovable Cloud — no manual rotation needed. |

---

## I. TEST CHECKLIST

- [ ] **HMAC failure**: Call `update-campaign-statuses` without HMAC headers → expect 401
- [ ] **HMAC replay**: Call with valid HMAC but timestamp > 5 min old → expect 401
- [ ] **capture-bill-receipt**: Call without JWT → expect 401; call with `viewer` role → expect 403
- [ ] **Magic link rate limit**: Send 4+ requests in 1 min from same IP → expect 429 on 4th
- [ ] **QR verify rate limit**: Send 11+ requests in 1 min → expect 429
- [ ] **Invoice portal rate limit**: Already tested (10/min/IP)
- [ ] **Token hash**: Create share token → verify `token` column is NULL, `token_hash` has value
- [ ] **Token verify**: Access portal with raw token → backend hashes and looks up by hash
- [ ] **Cross-tenant**: Call `business-ai-assistant` with body `companyId` ≠ JWT company → must be rejected (⚠️ NOT YET FIXED)
