

## Enhanced Billing Alerts Widget — Period-Aware with Missed Billing Detection

### What exists today
The `BillingAlertsWidget` is already on the Revenue Control Center and correctly separated from financial KPIs. However, it has issues:
1. **Wrong billing_cycle matching** — checks for `one_time`/`single` but DB uses `DAILY`/`MONTHLY`
2. **No period-aware logic** — counts total invoices vs expected months, doesn't check which specific periods are covered
3. **No missed billing period detection** — doesn't flag past months that ended without an invoice
4. **Only 3 alert categories** — needs cancelled/regeneration and missed period categories
5. **Title says "Billing Alerts"** — user wants "Running Campaigns – Invoice Pending"

### Plan

**File: `src/components/reports/BillingAlertsWidget.tsx`** — Rewrite internal logic (same file, same component name, same integration point)

#### 1. Fix billing_cycle detection
- `DAILY` campaigns (≤30 days) → treat as single-invoice campaigns
- `MONTHLY` campaigns → period-wise billing, one invoice per calendar month overlap

#### 2. Period-aware invoice matching
For each running campaign:
- Generate billable periods using campaign start/end dates (same logic as `useCampaignBillingPeriods`)
- For each period, check if a finalized invoice exists covering that period using 3-tier priority: `invoice_period_start/end` → `billing_month` → date overlap
- Fetch invoice fields: `campaign_id, is_draft, status, billing_month, invoice_period_start, invoice_period_end, invoice_no`

#### 3. Alert categories (expanded)
| Category | Condition |
|---|---|
| `no_invoice` | No invoice at all for the campaign |
| `draft_only` | Only draft invoices exist, no finalized |
| `partially_invoiced` | Some periods covered, others not |
| `cancelled_needs_regen` | Only cancelled invoices exist for a period |
| `missed_period` | A past billable period ended with no finalized invoice |

#### 4. Single vs Monthly logic

**DAILY (single-invoice) campaigns:**
- Expected: 1 finalized invoice for the full campaign span
- Alert if: zero finalized, or only draft/cancelled

**MONTHLY campaigns:**
- Generate calendar month slices overlapping campaign dates
- For each slice up to today: check if covered by a finalized invoice
- Current month = active period alert
- Past months without coverage = missed period alert

#### 5. UI enhancements
- Title: "Running Campaigns – Invoice Pending"
- Summary chips: Running campaigns count, No Invoice, Draft Pending, Missed Periods, Partially Invoiced
- Each row shows: campaign name, campaign ID snippet, client, dates, billing mode badge, alert category badge, pending period info
- Actions: View Campaign, Open Draft (if draft exists), Generate Invoice (link to billing tab)
- Missed periods shown with specific month labels (e.g., "March 2026 — not invoiced")

#### 6. Data fetching
- Query `campaigns` where `status = 'Running'`
- Query `invoices` for those campaign IDs with fields: `campaign_id, is_draft, status, billing_month, invoice_period_start, invoice_period_end`
- Filter logic: finalized = `is_draft = false AND status NOT IN ('Cancelled')`
- All client-side computation, no schema changes

### Files changed
| File | Change |
|---|---|
| `src/components/reports/BillingAlertsWidget.tsx` | Rewrite alert logic with period-aware detection, expanded categories, corrected billing_cycle values, missed period tracking, updated UI |

### What stays untouched
- Revenue KPIs — no change
- RevenueControlCenter.tsx — already imports BillingAlertsWidget, no change needed
- No schema changes
- No finance engine changes
- No paid invoice modifications

