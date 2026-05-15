# Plan: Professional `/admin/subscription` Page

## Context
- Nav already links **Admin & Settings → Subscription** to `/admin/subscription` (singular), but no route is registered → currently blank.
- An existing platform-admin page lives at `/admin/subscriptions` (plural) — `SubscriptionManagement.tsx` — which manages **every company's** plan. We keep that untouched.
- `useSubscription()` hook already reads `company_subscriptions` for the current company (tier, status, modules, user/asset/campaign limits, end_date) and falls back to a free tier.
- DB has `company_subscriptions` (tier, status, modules, limits, billing_cycle, amount, start/end dates, auto_renew) and a `transactions` table (subscription/portal_fee/commission entries) we can surface as billing history.

## Goal
Create an enterprise-grade, **company-scoped** subscription dashboard at `/admin/subscription` that lets a company admin see and manage their own plan — clean, modern, and consistent with the existing design system (semantic tokens, shadcn/ui, ModernAppLayout + breadcrumbs).

## Page Structure (`src/pages/CompanySubscription.tsx`)

1. **Header**
   - Title "Subscription & Billing" + breadcrumb (Admin › Subscription).
   - Current plan badge (Free / Pro / Enterprise) + status pill (Active / Expired / Trial).
   - Primary CTA: "Upgrade Plan" / "Contact Sales" (Enterprise).

2. **Current Plan Card (hero)**
   - Tier name, monthly/annual price (₹, INR), billing cycle, next renewal date, auto-renew toggle (read-only for non-admins).
   - Days remaining progress indicator if `end_date` set.

3. **Usage Overview (3 KPI cards with progress bars)**
   - Users used / `user_limit` (count from `company_users` where status='active').
   - Media assets used / `asset_limit` (count from `media_assets` filtered by `company_id`, not deleted).
   - Campaigns used / `campaign_limit` (count from `campaigns` for company).
   - Color thresholds: green <70%, amber 70–90%, red >90% via semantic tokens.

4. **Enabled Modules Grid**
   - Pull `AVAILABLE_MODULES` list (10 modules), show enabled vs locked with check/lock icon and short description. Locked modules show "Upgrade to unlock".

5. **Plan Comparison / Upgrade Section**
   - Three pricing cards: **Free / Pro (₹5,000/mo) / Enterprise (Custom)** as defined in project knowledge.
   - Highlight current tier, list features per tier, CTA buttons ("Current Plan" disabled, "Upgrade", "Contact Sales").
   - Clicking Upgrade opens a confirmation dialog (records intent in `transactions` as pending or shows "Contact admin" — Razorpay is out of scope unless requested).

6. **Billing History Table**
   - Reads `transactions` rows where `company_id = current` and `type IN ('subscription','portal_fee')`, ordered desc.
   - Columns: Date (DD/MM/YYYY), Type, Amount (₹ + GST), Status badge.
   - Empty state when no records.

7. **Danger / Account Zone (admins only)**
   - Cancel subscription button (sets `auto_renew=false`, confirmation dialog). No hard delete.

## Routing & Wiring
- Add lazy import + route in `src/App.tsx`:
  `<Route path="subscription" element={<ModernAppLayout><CompanySubscription /></ModernAppLayout></Route>` inside the existing `/admin` parent (no `PlatformAdminGuard` — accessible to company admins).
- Restrict actions (upgrade/cancel) to `companyUser.role === 'admin'` via `useCompany()`.
- Add `'subscription': 'Subscription'` to `breadcrumb-nav.tsx` label map.

## Data & Security
- Reuse `useSubscription()` for plan data; one `useEffect` to fetch usage counts (3 parallel `head:true, count:'exact'` queries scoped by `company_id`).
- All queries scoped by `company_id` from `useCompany()` — RLS already enforces tenant isolation.
- No new tables / migrations needed.

## Design
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `text-primary`, etc.). No raw color classes.
- Responsive grid (1 col mobile → 3 col desktop). Generous spacing, `rounded-2xl` cards, subtle borders, soft shadows consistent with the rest of the admin UI.
- Use lucide icons: `CreditCard`, `Users`, `Building2`, `Megaphone`, `CheckCircle2`, `Lock`, `Sparkles`, `Crown`.

## Files
- **Create**: `src/pages/CompanySubscription.tsx`
- **Edit**: `src/App.tsx` (add lazy import + route)
- **Edit**: `src/components/ui/breadcrumb-nav.tsx` (add label)

## Out of Scope (can do as follow-ups)
- Razorpay checkout integration.
- Editing tier from this page (platform admin keeps `/admin/subscriptions` for that).
- Invoice PDF download per transaction.
