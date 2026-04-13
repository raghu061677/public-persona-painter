

# Go-Ads Client/GST Module Audit vs Zoho Books Model

---

## A. Current State Summary

### How client data is stored

| Aspect | Current Go-Ads Implementation |
|--------|-------------------------------|
| **Client table** | Single `clients` table, `id` is text PK (state-prefixed, e.g. `TG-0073`, `AP-0001`) |
| **GSTIN** | Stored at **client level** — single `gst_number` column on `clients` |
| **Addresses** | One billing address + one shipping address directly on `clients` (flat columns: `billing_address_line1/2`, `billing_city`, `billing_state`, `billing_pincode`, same for shipping) |
| **State** | Three state fields: `state` (master), `billing_state`, `shipping_state` — all on the same row |
| **Multiple registrations** | **Not supported.** One GSTIN per client record. If a company has GSTINs in Telangana (36xxx) and Andhra Pradesh (37xxx), you must create two separate client records (e.g. TG-0073 and AP-0001) |
| **Client contacts** | Separate `client_contacts` table — contact persons, not addresses/registrations |
| **Tax type** | `tax_type` column exists on `plans`, `campaigns`, and `invoices` — values: `cgst_sgst` or `igst` |
| **Place of supply** | `place_of_supply` column exists on `invoices` only |
| **Invoice snapshots** | `client_gstin_snapshot` and `client_name_snapshot` on invoices — good for immutability |
| **GST applicability** | `is_gst_applicable` boolean on clients — correct |
| **State code** | `state_code` column on clients — used for GST prefix extraction |

### How invoice determines tax type today

1. Plan creation: user manually selects `tax_type` (IGST or CGST/SGST)
2. Campaign inherits `tax_type` from plan
3. Invoice inherits `tax_type` from campaign
4. No automatic derivation from client billing_state vs company state — it's manual selection with fallback logic

### Duplicate client risk

Currently **no duplicates exist** for the same company with different GSTINs (checked). But the architecture **forces** duplicate client records if a company operates in multiple states with different GSTINs. The Vaibhav Jewellers example already has `AP-0001` with GSTIN `37AABCV8928J1ZR`. If they had a Telangana branch, you'd need a separate `TG-xxxx` record.

---

## B. Comparison with Zoho Books Model

| Feature | Zoho Books | Go-Ads Current | Match? |
|---------|------------|----------------|--------|
| Single customer master per company | ✅ One customer, multiple addresses | ❌ One client = one GSTIN = one record | **No match** |
| Multiple billing addresses | ✅ Address book under customer | ❌ Single billing address on client row | **No match** |
| Multiple shipping addresses | ✅ Address book under customer | ❌ Single shipping address on client row | **No match** |
| GSTIN tied to address/branch | ✅ GSTIN per address/registration | ❌ GSTIN at client-level (one per record) | **No match** |
| Invoice selects billing address | ✅ Dropdown from address book | ❌ Inherits from client master only | **No match** |
| Place of supply drives tax | ✅ Automatic from selected address | ⚠️ Manual tax_type selection; place_of_supply on invoice but not auto-derived | **Partial** |
| Tax type auto-detection | ✅ Automatic IGST/CGST based on supply vs company state | ⚠️ Manual with fallback; recently hardened but still not address-driven | **Partial** |
| Contact persons | ✅ Multiple contacts per customer | ✅ `client_contacts` table | **Matches** |
| GST applicability flag | ✅ Per customer | ✅ `is_gst_applicable` boolean | **Matches** |
| Immutable invoice snapshots | ✅ Zoho locks invoice data | ✅ `client_gstin_snapshot`, `client_name_snapshot` | **Matches** |
| TDS handling | ✅ Per customer | ✅ `tds_applicable`, `default_tds_rate`, `tds_section` | **Matches** |
| Payment terms | ✅ Per customer | ✅ `payment_terms` column | **Matches** |

### What may break Zoho sync later

- **Customer mapping**: Go-Ads has N client records for one real company; Zoho expects one customer. Sync would either create duplicate Zoho customers or need a merge/mapping layer.
- **Address selection**: Zoho invoices reference a specific address from the address book. Go-Ads invoices don't have this concept — they snapshot the single client address.
- **GSTIN**: Zoho ties GSTIN to the address/registration. Go-Ads ties it to the client record. Multi-state companies would have mismatched cardinality.

---

## C. Recommended Target Architecture

### Option 1: Minimal Fix (Add child registration/address table)

**Design**: Keep existing `clients` table as the company master. Add a new `client_addresses` (or `client_registrations`) child table:

```text
clients (existing - becomes company master)
  └── client_registrations (NEW)
        ├── id (uuid)
        ├── client_id (FK → clients.id)
        ├── label (e.g. "Head Office", "AP Branch")
        ├── gstin
        ├── billing_address_line1/2, city, state, pincode
        ├── shipping_address_line1/2, city, state, pincode
        ├── state_code
        ├── is_default (boolean)
        └── company_id (tenant isolation)
```

Invoice/plan/campaign would reference `registration_id` to select which address/GSTIN to use.

| Aspect | Assessment |
|--------|------------|
| **Pros** | Minimal disruption; existing client IDs and references preserved; backward compatible (existing single-address clients get one default registration) |
| **Cons** | Client master still has legacy address/GSTIN fields that must coexist during transition; needs UI for registration picker on invoice/plan |
| **Migration complexity** | Low — add table, backfill one default registration per existing client, gradually adopt |
| **Risk to existing data** | Very low — no columns removed, no FK changes |
| **Invoice/report impact** | Invoices would need optional `registration_id`; existing invoices keep working via snapshots |
| **Zoho sync** | Good — one client maps to one Zoho customer; registrations map to Zoho addresses |

### Option 2: Full Zoho-Aligned Restructure

**Design**: Rename/restructure `clients` into a formal `customers` + `customer_addresses` + `customer_registrations` model.

| Aspect | Assessment |
|--------|------------|
| **Pros** | Perfectly mirrors Zoho; clean from day one |
| **Cons** | Massive breaking change; every FK referencing `clients.id` must change; all queries, components, reports, exports affected; high risk |
| **Migration complexity** | Very high — 50+ files reference client_id; invoices, campaigns, plans, ledger, all PDFs |
| **Risk to existing data** | High — requires careful data migration and extensive testing |
| **Invoice/report impact** | Every report, PDF template, and export would need updating |
| **Zoho sync** | Perfect alignment |

---

## D. Best Recommendation

**Option 1 is the clear winner** for Go-Ads.

**Why:**
1. The system is in production with real invoices, campaigns, and financial records referencing `clients.id`
2. Option 1 achieves 90% of Zoho parity with 10% of the risk
3. It can be done in safe phases without touching existing finance logic
4. Existing single-GSTIN clients work exactly as before (their one address becomes the default registration)
5. Multi-state clients like Vaibhav Jewellers can be consolidated: keep one client master, add registrations for AP and TG branches

**Safe phased migration path:**

1. **Phase 1** (schema only): Create `client_registrations` table. Backfill one default registration per existing client from their current address/GSTIN fields. No UI changes.
2. **Phase 2** (UI): Add registration management UI in Client Detail. Allow adding/editing registrations per client.
3. **Phase 3** (plan/invoice selection): Add registration picker dropdown in Plan Builder and Invoice creation. When selected, auto-populate GSTIN, address, state, and auto-derive tax_type.
4. **Phase 4** (consolidation): Merge duplicate client records (same company, different states) into single master + multiple registrations. Update FK references.
5. **Phase 5** (Zoho sync): Map client → Zoho customer, registrations → Zoho addresses.

---

## E. Files / Modules Reviewed

| File/Table | What was checked |
|------------|-----------------|
| `clients` table schema | All 43 columns, address structure, GSTIN placement |
| `client_contacts` table | Contact persons — not addresses |
| `invoices` table | tax_type, gst_mode, place_of_supply, client snapshots |
| `plans` table | client_id, tax_type — no place_of_supply |
| `campaigns` table | client_id, tax_type — no place_of_supply |
| `src/components/clients/EditClientDialog.tsx` | Single billing/shipping address form |
| `src/components/clients/StateSelect.tsx` | State picker using Indian state codes |
| `src/lib/stateCodeMapping.ts` | State-to-code mapping |
| `src/utils/finance.ts` | Invoice ID generation with GST rate prefix logic |
| `src/types/proforma.ts` | Proforma uses client_gstin, client_state — single values |
| Actual data | Verified no current duplicate companies; confirmed Vaibhav Jewellers exists as AP-0001 |

---

## F. Summary Table

| # | Area | Finding |
|---|------|---------|
| 1 | **Current State** | One GSTIN + one address per client record. Multi-state companies require duplicate client records. |
| 2 | **What Matches Zoho** | Contact persons, GST applicability, TDS, payment terms, invoice snapshots |
| 3 | **Gaps / Risks** | No address book; no multi-GSTIN per client; no auto tax-type from address; invoice doesn't select registration; Zoho sync will create duplicates |
| 4 | **Recommended Model** | Option 1 — add `client_registrations` child table, keep existing `clients` as company master |
| 5 | **Best Option** | Option 1 — low risk, phased, backward compatible, 90% Zoho parity |
| 6 | **Safe Migration** | 5 phases: schema → UI → selection → consolidation → Zoho sync |

