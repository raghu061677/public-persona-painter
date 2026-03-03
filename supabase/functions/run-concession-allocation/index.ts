import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's company and role
    const { data: cuRows } = await userClient
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .limit(1);

    if (!cuRows || cuRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No company membership found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userCompanyId = cuRows[0].company_id;
    const userRole = cuRows[0].role;

    if (!["admin", "finance"].includes(userRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const companyId = body.company_id || userCompanyId;

    // Enforce company boundary
    if (companyId !== userCompanyId) {
      return new Response(
        JSON.stringify({ error: "Cross-tenant access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dryRun = body.dry_run === true;

    // Determine target period (default: previous month)
    const now = new Date();
    const periodYear = body.period_year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const periodMonth = body.period_month || (now.getMonth() === 0 ? 12 : now.getMonth());

    const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0));

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // Service role client for writes
    const admin = createClient(supabaseUrl, serviceKey);

    // Check locks
    const [{ data: monthLocked }, { data: fyLocked }] = await Promise.all([
      admin.rpc("is_month_locked", { p_company_id: companyId, p_date: periodEndStr }),
      admin.rpc("is_fy_locked", { p_company_id: companyId, p_date: periodEndStr }),
    ]);

    if (monthLocked || fyLocked) {
      // Log skip
      await admin.from("activity_logs").insert({
        user_id: user.id,
        action: "allocation_skipped_locked_period",
        resource_type: "concession_posting",
        resource_id: companyId,
        details: {
          period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          month_locked: monthLocked, fy_locked: fyLocked,
        },
      });
      return new Response(
        JSON.stringify({
          error: "Period is locked",
          period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          month_locked: monthLocked, fy_locked: fyLocked,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active contracts for this company in this period
    const { data: contracts, error: cErr } = await admin
      .from("concession_contracts")
      .select("*")
      .eq("company_id", companyId)
      .eq("active", true)
      .lte("start_date", periodEndStr)
      .or(`end_date.is.null,end_date.gte.${periodStartStr}`);

    if (cErr) throw cErr;
    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active contracts for this period", postings: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active media assets for this company
    const { data: allAssets } = await admin
      .from("media_assets")
      .select("id, media_type, city, area, zone, status")
      .eq("company_id", companyId)
      .eq("status", "Active");

    // Get campaign_assets for booked days + revenue fallback
    const { data: campaignAssets } = await admin
      .from("campaign_assets")
      .select("asset_id, booking_start_date, booking_end_date, rent_amount, total_price, campaign_id")
      .gte("booking_end_date", periodStartStr)
      .lte("booking_start_date", periodEndStr);

    // ── INVOICE-FIRST revenue query ──
    // Get invoices for this company in this month window
    const { data: monthInvoices } = await admin
      .from("invoices")
      .select("id, company_id, invoice_date, total_amount, status")
      .eq("company_id", companyId)
      .gte("invoice_date", periodStartStr)
      .lte("invoice_date", periodEndStr)
      .in("status", ["Sent", "Paid", "Partial", "Approved"]);

    // Build invoice ID set
    const invoiceIds = (monthInvoices || []).map((inv: any) => inv.id);

    // Get invoice_items grouped by asset_id
    let invoiceRevenueByAsset: Record<string, number> = {};
    if (invoiceIds.length > 0) {
      // Fetch invoice_items (has asset_id + line_total)
      const { data: invItems } = await admin
        .from("invoice_items")
        .select("asset_id, line_total")
        .in("invoice_id", invoiceIds);

      for (const item of invItems || []) {
        if (item.asset_id) {
          invoiceRevenueByAsset[item.asset_id] = (invoiceRevenueByAsset[item.asset_id] || 0) + (item.line_total || 0);
        }
      }

      // Also fetch invoice_line_items (has media_asset_id + amount)
      const { data: lineItems } = await admin
        .from("invoice_line_items")
        .select("media_asset_id, amount")
        .in("invoice_id", invoiceIds);

      for (const li of lineItems || []) {
        if (li.media_asset_id) {
          invoiceRevenueByAsset[li.media_asset_id] = (invoiceRevenueByAsset[li.media_asset_id] || 0) + (li.amount || 0);
        }
      }
    }

    const totalInvoiceRevenue = Object.values(invoiceRevenueByAsset).reduce((s, v) => s + v, 0);

    const results: any[] = [];
    const errors: string[] = [];

    for (const contract of contracts) {
      // Determine eligible assets
      let eligible = allAssets || [];
      const filter = contract.filter_json as any;

      switch (contract.applies_to) {
        case "asset_list":
          if (filter?.asset_ids?.length) {
            const ids = new Set(filter.asset_ids);
            eligible = eligible.filter((a: any) => ids.has(a.id));
          }
          break;
        case "media_type":
          if (filter?.media_type?.length) {
            const types = new Set(filter.media_type.map((t: string) => t.toLowerCase()));
            eligible = eligible.filter((a: any) => types.has((a.media_type || "").toLowerCase()));
          }
          break;
        case "zone":
          if (filter?.zone?.length || filter?.city?.length || filter?.area?.length) {
            eligible = eligible.filter((a: any) => {
              if (filter.zone?.length && filter.zone.includes(a.zone)) return true;
              if (filter.city?.length && filter.city.includes(a.city)) return true;
              if (filter.area?.length && filter.area.includes(a.area)) return true;
              return false;
            });
          }
          break;
        // 'all_assets' => keep all
      }

      if (eligible.length === 0) {
        errors.push(`Contract ${contract.contract_name}: no eligible assets, skipped`);
        if (!dryRun) {
          await admin.from("activity_logs").insert({
            user_id: user.id,
            action: "allocation_skipped_no_basis",
            resource_type: "concession_posting",
            resource_id: contract.id,
            details: { contract_name: contract.contract_name, reason: "no_eligible_assets" },
          });
        }
        continue;
      }

      const postings: any[] = [];
      const totalFee = Number(contract.total_fee);

      if (contract.allocation_method === "per_asset") {
        const perAsset = Math.floor((totalFee / eligible.length) * 100) / 100;
        let allocated = 0;
        eligible.forEach((asset: any, idx: number) => {
          const isLast = idx === eligible.length - 1;
          const amount = isLast
            ? Math.round((totalFee - allocated) * 100) / 100
            : perAsset;
          allocated += amount;
          postings.push({
            company_id: companyId, contract_id: contract.id,
            period_year: periodYear, period_month: periodMonth,
            period_start: periodStartStr, period_end: periodEndStr,
            asset_id: asset.id, allocation_method: "per_asset",
            basis_value: 1, allocated_amount: amount,
            posting_date: periodEndStr, status: "posted",
          });
        });
      } else if (contract.allocation_method === "per_asset_day") {
        const eligibleIds = new Set(eligible.map((a: any) => a.id));
        const dayMap: Record<string, number> = {};
        let totalDays = 0;

        for (const ca of campaignAssets || []) {
          if (!eligibleIds.has(ca.asset_id)) continue;
          const bStart = new Date(Math.max(new Date(ca.booking_start_date!).getTime(), periodStart.getTime()));
          const bEnd = new Date(Math.min(new Date(ca.booking_end_date!).getTime(), periodEnd.getTime()));
          const days = Math.max(0, Math.ceil((bEnd.getTime() - bStart.getTime()) / 86400000) + 1);
          dayMap[ca.asset_id] = (dayMap[ca.asset_id] || 0) + days;
          totalDays += days;
        }

        if (totalDays === 0) {
          errors.push(`Contract ${contract.contract_name}: no booked days (per_asset_day), skipped`);
          if (!dryRun) {
            await admin.from("activity_logs").insert({
              user_id: user.id, action: "allocation_skipped_no_basis",
              resource_type: "concession_posting", resource_id: contract.id,
              details: { contract_name: contract.contract_name, reason: "no_booked_days" },
            });
          }
          continue;
        }

        let allocated = 0;
        const entries = Object.entries(dayMap);
        entries.forEach(([assetId, days], idx) => {
          const isLast = idx === entries.length - 1;
          const amount = isLast
            ? Math.round((totalFee - allocated) * 100) / 100
            : Math.round(((totalFee * days) / totalDays) * 100) / 100;
          allocated += amount;
          postings.push({
            company_id: companyId, contract_id: contract.id,
            period_year: periodYear, period_month: periodMonth,
            period_start: periodStartStr, period_end: periodEndStr,
            asset_id: assetId, allocation_method: "per_asset_day",
            basis_value: days, allocated_amount: amount,
            posting_date: periodEndStr, status: "posted",
          });
        });
      } else if (contract.allocation_method === "per_revenue") {
        const eligibleIds = new Set(eligible.map((a: any) => a.id));

        // ── INVOICE-FIRST: use invoice revenue if available ──
        let revMap: Record<string, number> = {};
        let totalRev = 0;
        let revenueBasis = "invoice";

        // Filter invoice revenue to eligible assets only
        for (const [assetId, rev] of Object.entries(invoiceRevenueByAsset)) {
          if (!eligibleIds.has(assetId)) continue;
          revMap[assetId] = (revMap[assetId] || 0) + rev;
          totalRev += rev;
        }

        // ── FALLBACK: campaign_assets.rent_amount/total_price ──
        if (totalRev === 0) {
          revenueBasis = "campaign_assets_fallback";
          for (const ca of campaignAssets || []) {
            if (!eligibleIds.has(ca.asset_id)) continue;
            const bStart = new Date(ca.booking_start_date!);
            const bEnd = new Date(ca.booking_end_date!);
            if (bEnd < periodStart || bStart > periodEnd) continue;
            const rev = Number(ca.rent_amount || ca.total_price || 0);
            revMap[ca.asset_id] = (revMap[ca.asset_id] || 0) + rev;
            totalRev += rev;
          }
        }

        if (totalRev === 0) {
          errors.push(`Contract ${contract.contract_name}: no revenue (per_revenue), skipped`);
          if (!dryRun) {
            await admin.from("activity_logs").insert({
              user_id: user.id, action: "allocation_skipped_no_basis",
              resource_type: "concession_posting", resource_id: contract.id,
              details: { contract_name: contract.contract_name, reason: "no_revenue", revenue_basis: revenueBasis },
            });
          }
          continue;
        }

        let allocated = 0;
        const entries = Object.entries(revMap);
        entries.forEach(([assetId, rev], idx) => {
          const isLast = idx === entries.length - 1;
          const amount = isLast
            ? Math.round((totalFee - allocated) * 100) / 100
            : Math.round(((totalFee * rev) / totalRev) * 100) / 100;
          allocated += amount;
          postings.push({
            company_id: companyId, contract_id: contract.id,
            period_year: periodYear, period_month: periodMonth,
            period_start: periodStartStr, period_end: periodEndStr,
            asset_id: assetId, allocation_method: "per_revenue",
            basis_value: rev, allocated_amount: amount,
            posting_date: periodEndStr, status: "posted",
            _revenue_basis: revenueBasis, // transient, not stored
          });
        });
      }

      if (dryRun) {
        results.push({
          contract_id: contract.id,
          contract_name: contract.contract_name,
          method: contract.allocation_method,
          total_fee: totalFee,
          asset_count: postings.length,
          revenue_basis: contract.allocation_method === "per_revenue"
            ? (postings[0]?._revenue_basis || "none")
            : undefined,
          postings_preview: postings.map(({ _revenue_basis, ...rest }) => rest),
        });
        continue;
      }

      // ── INSERT POSTINGS (idempotent) ──
      let insertedCount = 0;
      for (const p of postings) {
        const { _revenue_basis, ...posting } = p;

        // Check existing (idempotent)
        const { data: existing } = await admin
          .from("concession_postings")
          .select("id")
          .eq("company_id", posting.company_id)
          .eq("contract_id", posting.contract_id)
          .eq("period_year", posting.period_year)
          .eq("period_month", posting.period_month)
          .eq("asset_id", posting.asset_id)
          .eq("status", "posted")
          .maybeSingle();

        if (existing) continue;

        // Insert posting
        const { data: inserted, error: pErr } = await admin
          .from("concession_postings")
          .insert(posting)
          .select("id")
          .single();

        if (pErr) {
          if (pErr.code === "23505") continue; // unique constraint = idempotent
          throw pErr;
        }

        // Insert matching asset_expense
        await admin.from("asset_expenses").insert({
          asset_id: posting.asset_id,
          category: "concession_allocation",
          description: `Concession: ${contract.contract_name} (${periodYear}-${String(periodMonth).padStart(2, "0")})`,
          amount: posting.allocated_amount,
          expense_date: periodEndStr,
          payment_status: "paid",
          metadata: {
            posting_id: inserted.id,
            contract_id: contract.id,
            contract_name: contract.contract_name,
            allocation_method: posting.allocation_method,
            basis_value: posting.basis_value,
            revenue_basis: _revenue_basis || null,
            period_year: periodYear,
            period_month: periodMonth,
          },
        });

        insertedCount++;
      }

      results.push({
        contract_id: contract.id,
        contract_name: contract.contract_name,
        method: contract.allocation_method,
        total_fee: totalFee,
        assets_posted: insertedCount,
        assets_skipped: postings.length - insertedCount,
        revenue_basis: contract.allocation_method === "per_revenue"
          ? (postings[0]?._revenue_basis || "none")
          : undefined,
      });
    }

    // ── AUDIT LOGS ──
    if (!dryRun) {
      const periodLabel = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
      const auditDetails = {
        period: periodLabel,
        contracts_processed: results.length,
        results,
        errors,
        total_posted: results.reduce((s: number, r: any) => s + (r.assets_posted || 0), 0),
      };

      // activity_logs
      await admin.from("activity_logs").insert({
        user_id: user.id,
        user_name: user.email,
        action: "concession_allocation_run",
        resource_type: "concession_posting",
        resource_id: companyId,
        details: auditDetails,
      });

      // admin_audit_logs
      await admin.from("admin_audit_logs").insert({
        user_id: user.id,
        company_id: companyId,
        action: "concession_allocation_run",
        resource_type: "concession_posting",
        resource_id: companyId,
        details: auditDetails,
      });

      // security_audit_log
      await admin.from("security_audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        action: "concession_allocation_executed",
        resource_type: "concession_posting",
        resource_id: companyId,
        severity: "info",
        details: auditDetails,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
        results,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Concession allocation error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
