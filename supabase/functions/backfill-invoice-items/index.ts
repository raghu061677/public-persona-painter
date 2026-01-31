import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('backfill-invoice-items function started');

type BackfillRequest = {
  invoice_ids?: string[];
  limit?: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const body = (await req.json().catch(() => ({}))) as BackfillRequest;
    const invoiceIds = Array.isArray(body.invoice_ids) ? body.invoice_ids.filter(Boolean) : [];
    const limit = Math.min(Math.max(body.limit ?? 500, 1), 2000);

    // Require authentication for broad backfills (no explicit invoice_ids).
    // Allow unauthenticated calls ONLY when specific invoice_ids are provided.
    if (invoiceIds.length === 0) {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If explicit invoice IDs are provided, also backfill invoices.items JSON
    if (invoiceIds.length > 0) {
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, campaign_id, invoice_date, invoice_period_start, invoice_period_end, items')
        .in('id', invoiceIds);

      if (invErr) {
        console.error('invoices fetch error:', invErr);
        return new Response(JSON.stringify({ error: invErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const inv of invoices || []) {
        const rawItems = Array.isArray((inv as any).items) ? ((inv as any).items as any[]) : [];
        if (!inv.campaign_id || rawItems.length === 0) continue;

        const { data: campaignAssets } = await supabase
          .from('campaign_assets')
          .select('id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
          .eq('campaign_id', inv.campaign_id);

        const assetIds = Array.from(new Set((campaignAssets || []).map((a: any) => a.asset_id).filter(Boolean)));
        const { data: mediaAssets } = assetIds.length
          ? await supabase
              .from('media_assets')
              .select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
              .in('id', assetIds)
          : ({ data: [] } as any);

        const caMap = new Map((campaignAssets || []).map((a: any) => [a.id, a]));
        const maMap = new Map((mediaAssets || []).map((a: any) => [a.id, a]));

        const hydratedItems = rawItems.map((it: any) => {
          const caId = it.campaign_asset_id || it.campaign_assets_id;
          const byCa = caId ? caMap.get(caId) : null;
          const byAsset = it.asset_id ? (campaignAssets || []).find((a: any) => a.asset_id === it.asset_id) : null;
          const fallbackCA = (campaignAssets || []).length === 1 ? (campaignAssets as any[])[0] : null;
          const ca = byCa || byAsset || fallbackCA;
          const ma = ca?.asset_id ? maMap.get(ca.asset_id) : (it.asset_id ? maMap.get(it.asset_id) : null);
          const source = ca || ma;

          const assetCode =
            it.asset_code ||
            ma?.media_asset_code ||
            ma?.asset_id_readable ||
            it.asset_id ||
            ca?.asset_id ||
            '-';

          return {
            ...it,
            campaign_asset_id: it.campaign_asset_id ?? ca?.id ?? null,
            asset_id: it.asset_id ?? ca?.asset_id ?? null,
            asset_code: assetCode,
            location: it.location ?? source?.location ?? null,
            area: it.area ?? source?.area ?? null,
            direction: it.direction ?? source?.direction ?? null,
            media_type: it.media_type ?? source?.media_type ?? null,
            illumination: it.illumination ?? source?.illumination_type ?? null,
            dimension_text: it.dimension_text ?? source?.dimensions ?? null,
            total_sqft: it.total_sqft ?? source?.total_sqft ?? null,
            hsn_sac: it.hsn_sac ?? '998361',
          };
        });

        const { error: updInvErr } = await supabase
          .from('invoices')
          .update({ items: hydratedItems })
          .eq('id', (inv as any).id);
        if (updInvErr) console.warn('failed updating invoices.items for', (inv as any).id, updInvErr);

        // If there are no invoice_items rows yet, create them from hydratedItems
        const { data: existingCount } = await supabase
          .from('invoice_items')
          .select('id', { count: 'exact', head: true })
          .eq('invoice_id', (inv as any).id);

        // Supabase returns count in the response metadata; easiest is to re-query a single row
        const { data: anyExisting } = await supabase
          .from('invoice_items')
          .select('id')
          .eq('invoice_id', (inv as any).id)
          .limit(1);

        if (!anyExisting || anyExisting.length === 0) {
          const billStart = (inv as any).invoice_period_start || (inv as any).invoice_date;
          const billEnd = (inv as any).invoice_period_end || (inv as any).invoice_date;
          const billableDays = billStart && billEnd
            ? Math.ceil((new Date(billEnd).getTime() - new Date(billStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0;

          const toInsert = hydratedItems
            .filter((it: any) => it.asset_id || it.campaign_asset_id)
            .map((it: any) => ({
              invoice_id: (inv as any).id,
              campaign_asset_id: it.campaign_asset_id,
              asset_id: it.asset_id,
              asset_code: it.asset_code,
              description: it.description || null,
              location: it.location || null,
              area: it.area || null,
              direction: it.direction || null,
              media_type: it.media_type || null,
              illumination: it.illumination || null,
              dimension_text: it.dimension_text || null,
              hsn_sac: it.hsn_sac || '998361',
              bill_start_date: billStart,
              bill_end_date: billEnd,
              billable_days: billableDays,
              rate_type: 'legacy',
              rate_value: Number(it.rate || it.unit_price || 0) || 0,
              base_amount: Number(it.amount || it.total || 0) || 0,
              printing_cost: Number(it.printing_charges || it.printing_cost || 0) || 0,
              mounting_cost: Number(it.mounting_charges || it.mounting_cost || 0) || 0,
              line_total: Number(it.amount || it.total || 0) || 0,
            }));

          if (toInsert.length > 0) {
            const { error: insErr } = await supabase.from('invoice_items').insert(toInsert);
            if (insErr) console.warn('invoice_items backfill insert failed for', (inv as any).id, insErr);
          }
        }
      }
    }

    let query = supabase
      .from('invoice_items')
      .select(
        'id, invoice_id, campaign_asset_id, asset_id, asset_code, location, area, direction, media_type, illumination, dimension_text, hsn_sac'
      )
      .limit(limit);

    if (invoiceIds.length > 0) {
      query = query.in('invoice_id', invoiceIds);
    } else {
      // Any of the snapshot fields missing
      query = query.or(
        'location.is.null,area.is.null,direction.is.null,media_type.is.null,illumination.is.null,dimension_text.is.null,hsn_sac.is.null'
      );
    }

    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) {
      console.error('invoice_items query error:', rowsErr);
      return new Response(JSON.stringify({ error: rowsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const invoiceItems = (rows || []) as any[];
    if (invoiceItems.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const campaignAssetIds = Array.from(
      new Set(invoiceItems.map((r) => r.campaign_asset_id).filter(Boolean))
    ) as string[];
    const assetIds = Array.from(new Set(invoiceItems.map((r) => r.asset_id).filter(Boolean))) as string[];

    const [campaignAssetsRes, mediaAssetsRes] = await Promise.all([
      campaignAssetIds.length
        ? supabase
            .from('campaign_assets')
            .select('id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
            .in('id', campaignAssetIds)
        : Promise.resolve({ data: [] } as any),
      assetIds.length
        ? supabase
            .from('media_assets')
            .select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
            .in('id', assetIds)
        : Promise.resolve({ data: [] } as any),
    ]);

    const campaignAssets = (campaignAssetsRes as any).data || [];
    const mediaAssets = (mediaAssetsRes as any).data || [];

    const campaignAssetMap = new Map(campaignAssets.map((a: any) => [a.id, a]));
    const mediaAssetMap = new Map(mediaAssets.map((a: any) => [a.id, a]));

    const updates = invoiceItems.map((row) => {
      const ca = row.campaign_asset_id ? campaignAssetMap.get(row.campaign_asset_id) : null;
      const maId = row.asset_id || ca?.asset_id;
      const ma = maId ? mediaAssetMap.get(maId) : null;
      const source = ca || ma;

      const assetCode =
        row.asset_code ||
        ma?.media_asset_code ||
        ma?.asset_id_readable ||
        row.asset_id ||
        '-';

      return {
        id: row.id,
        asset_code: assetCode,
        location: row.location ?? source?.location ?? null,
        area: row.area ?? source?.area ?? null,
        direction: row.direction ?? source?.direction ?? null,
        media_type: row.media_type ?? source?.media_type ?? null,
        illumination: row.illumination ?? source?.illumination_type ?? null,
        dimension_text: row.dimension_text ?? source?.dimensions ?? null,
        hsn_sac: row.hsn_sac ?? '998361',
      };
    });

    // Apply updates in small batches
    let updated = 0;
    for (const batch of chunk(updates, 50)) {
      await Promise.all(
        batch.map(async (u) => {
          const { error } = await supabase
            .from('invoice_items')
            .update({
              asset_code: u.asset_code,
              location: u.location,
              area: u.area,
              direction: u.direction,
              media_type: u.media_type,
              illumination: u.illumination,
              dimension_text: u.dimension_text,
              hsn_sac: u.hsn_sac,
            })
            .eq('id', u.id);
          if (!error) updated += 1;
          else console.warn('update failed for invoice_item', u.id, error);
        })
      );
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
