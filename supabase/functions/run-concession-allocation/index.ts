import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const {
      data: { user },
    } = await userClient.auth.getUser();
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
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userCompanyId = cuRows[0].company_id;
    const userRole = cuRows[0].role;

    if (!["admin", "finance"].includes(userRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const companyId = body.company_id || userCompanyId;
    const dryRun = body.dry_run === true;

    // Determine target period (default: previous month)
    const now = new Date();
    const periodYear =
      body.period_year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const periodMonth =
      body.period_month || (now.getMonth() === 0 ? 12 : now.getMonth());

    const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0)); // last day

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // Service role client for writes
    const admin = createClient(supabaseUrl, serviceKey);

    // Check locks
    const { data: monthLocked } = await admin.rpc("is_month_locked", {
      p_company_id: companyId,
      p_date: periodEndStr,
    });
    const { data: fyLocked } = await admin.rpc("is_fy_locked", {
      p_company_id: companyId,
      p_date: periodEndStr,
    });

    if (monthLocked || fyLocked) {
      return new Response(
        JSON.stringify({
          error: "Period is locked",
          period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          month_locked: monthLocked,
          fy_locked: fyLocked,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get active contracts for this company
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

    // Get campaign_assets for booked days calculation
    const { data: campaignAssets } = await admin
      .from("campaign_assets")
      .select("asset_id, booking_start_date, booking_end_date, rent_amount, campaign_id")
      .gte("booking_end_date", periodStartStr)
      .lte("booking_start_date", periodEndStr);

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
        errors.push(
          `Contract ${contract.contract_name}: no eligible assets, skipped`
        );
        continue;
      }

      // Compute allocation per asset
      const postings: any[] = [];
      const totalFee = Number(contract.total_fee);

      if (contract.allocation_method === "per_asset") {
        const perAsset = Math.floor((totalFee / eligible.length) * 100) / 100;
        let remainder = Math.round((totalFee - perAsset * eligible.length) * 100) / 100;

        eligible.forEach((asset: any, idx: number) => {
          let amount = perAsset;
          if (idx === eligible.length - 1) {
            amount = Math.round((amount + remainder) * 100) / 100;
          }
          postings.push({
            company_id: companyId,
            contract_id: contract.id,
            period_year: periodYear,
            period_month: periodMonth,
            period_start: periodStartStr,
            period_end: periodEndStr,
            asset_id: asset.id,
            allocation_method: "per_asset",
            basis_value: 1,
            allocated_amount: amount,
            posting_date: periodEndStr,
            status: "posted",
          });
        });
      } else if (contract.allocation_method === "per_asset_day") {
        // Calculate booked days per eligible asset in this month
        const eligibleIds = new Set(eligible.map((a: any) => a.id));
        const dayMap: Record<string, number> = {};
        let totalDays = 0;

        for (const ca of campaignAssets || []) {
          if (!eligibleIds.has(ca.asset_id)) continue;
          const bStart = new Date(
            Math.max(new Date(ca.booking_start_date!).getTime(), periodStart.getTime())
          );
          const bEnd = new Date(
            Math.min(new Date(ca.booking_end_date!).getTime(), periodEnd.getTime())
          );
          const days =
            Math.max(0, Math.ceil((bEnd.getTime() - bStart.getTime()) / 86400000) + 1);
          dayMap[ca.asset_id] = (dayMap[ca.asset_id] || 0) + days;
          totalDays += days;
        }

        if (totalDays === 0) {
          errors.push(
            `Contract ${contract.contract_name}: no booked days (per_asset_day), skipped`
          );
          continue;
        }

        let allocated = 0;
        const entries = Object.entries(dayMap);
        entries.forEach(([assetId, days], idx) => {
          let amount =
            idx === entries.length - 1
              ? Math.round((totalFee - allocated) * 100) / 100
              : Math.round(((totalFee * days) / totalDays) * 100) / 100;
          allocated += amount;
          postings.push({
            company_id: companyId,
            contract_id: contract.id,
            period_year: periodYear,
            period_month: periodMonth,
            period_start: periodStartStr,
            period_end: periodEndStr,
            asset_id: assetId,
            allocation_method: "per_asset_day",
            basis_value: days,
            allocated_amount: amount,
            posting_date: periodEndStr,
            status: "posted",
          });
        });
      } else if (contract.allocation_method === "per_revenue") {
        const eligibleIds = new Set(eligible.map((a: any) => a.id));
        const revMap: Record<string, number> = {};
        let totalRev = 0;

        for (const ca of campaignAssets || []) {
          if (!eligibleIds.has(ca.asset_id)) continue;
          // Check overlap with period
          const bStart = new Date(ca.booking_start_date!);
          const bEnd = new Date(ca.booking_end_date!);
          if (bEnd < periodStart || bStart > periodEnd) continue;
          const rev = Number(ca.rent_amount || 0);
          revMap[ca.asset_id] = (revMap[ca.asset_id] || 0) + rev;
          totalRev += rev;
        }

        if (totalRev === 0) {
          errors.push(
            `Contract ${contract.contract_name}: no revenue (per_revenue), skipped`
          );
          continue;
        }

        let allocated = 0;
        const entries = Object.entries(revMap);
        entries.forEach(([assetId, rev], idx) => {
          let amount =
            idx === entries.length - 1
              ? Math.round((totalFee - allocated) * 100) / 100
              : Math.round(((totalFee * rev) / totalRev) * 100) / 100;
          allocated += amount;
          postings.push({
            company_id: companyId,
            contract_id: contract.id,
            period_year: periodYear,
            period_month: periodMonth,
            period_start: periodStartStr,
            period_end: periodEndStr,
            asset_id: assetId,
            allocation_method: "per_revenue",
            basis_value: rev,
            allocated_amount: amount,
            posting_date: periodEndStr,
            status: "posted",
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
          postings_preview: postings,
        });
        continue;
      }

      // Insert postings (idempotent via unique index — use ON CONFLICT DO NOTHING)
      let insertedCount = 0;
      for (const p of postings) {
        // Check existing
        const { data: existing } = await admin
          .from("concession_postings")
          .select("id")
          .eq("company_id", p.company_id)
          .eq("contract_id", p.contract_id)
          .eq("period_year", p.period_year)
          .eq("period_month", p.period_month)
          .eq("asset_id", p.asset_id)
          .eq("status", "posted")
          .maybeSingle();

        if (existing) continue; // already posted, idempotent skip

        // Insert posting
        const { data: inserted, error: pErr } = await admin
          .from("concession_postings")
          .insert(p)
          .select("id")
          .single();

        if (pErr) {
          // Likely unique constraint — idempotent
          if (pErr.code === "23505") continue;
          throw pErr;
        }

        // Insert matching asset_expense
        await admin.from("asset_expenses").insert({
          asset_id: p.asset_id,
          category: "concession_allocation",
          description: `Concession: ${contract.contract_name} (${periodYear}-${String(periodMonth).padStart(2, "0")})`,
          amount: p.allocated_amount,
          expense_date: periodEndStr,
          payment_status: "paid",
          metadata: {
            posting_id: inserted.id,
            contract_id: contract.id,
            contract_name: contract.contract_name,
            period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          },
        });

        // Update posting with expense_id link
        insertedCount++;
      }

      results.push({
        contract_id: contract.id,
        contract_name: contract.contract_name,
        method: contract.allocation_method,
        total_fee: totalFee,
        assets_posted: insertedCount,
        assets_skipped: postings.length - insertedCount,
      });
    }

    // Audit log
    if (!dryRun) {
      await admin.from("activity_logs").insert({
        user_id: user.id,
        action: "concession_allocation_run",
        resource_type: "concession_posting",
        resource_id: companyId,
        details: {
          period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          contracts_processed: results.length,
          results,
          errors,
        },
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
