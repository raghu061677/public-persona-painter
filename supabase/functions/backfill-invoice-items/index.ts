// v2.0 - Phase-6 Security: withAuth + getAuthContext + admin role enforcement
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => ({}));
  const invoiceIds = Array.isArray(body.invoice_ids) ? body.invoice_ids.filter(Boolean) : [];
  const limit = Math.min(Math.max(body.limit ?? 500, 1), 2000);

  const serviceClient = supabaseServiceClient();

  // If explicit invoice IDs, backfill invoices.items JSON
  if (invoiceIds.length > 0) {
    // Verify invoices belong to user's company
    const { data: invoices, error: invErr } = await serviceClient
      .from('invoices')
      .select('id, campaign_id, invoice_date, invoice_period_start, invoice_period_end, items, company_id')
      .in('id', invoiceIds)
      .eq('company_id', ctx.companyId);

    if (invErr) return jsonError(invErr.message, 500);

    for (const inv of invoices || []) {
      const rawItems = Array.isArray((inv as any).items) ? ((inv as any).items as any[]) : [];
      if (!inv.campaign_id || rawItems.length === 0) continue;

      const { data: campaignAssets } = await serviceClient
        .from('campaign_assets')
        .select('id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
        .eq('campaign_id', inv.campaign_id);

      const assetIds = Array.from(new Set((campaignAssets || []).map((a: any) => a.asset_id).filter(Boolean)));
      const { data: mediaAssets } = assetIds.length
        ? await serviceClient
            .from('media_assets')
            .select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
            .in('id', assetIds)
        : { data: [] } as any;

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
        const assetCode = it.asset_code || ma?.media_asset_code || ma?.asset_id_readable || it.asset_id || ca?.asset_id || '-';

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

      await serviceClient.from('invoices').update({ items: hydratedItems }).eq('id', (inv as any).id);

      const { data: anyExisting } = await serviceClient
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
            asset_id: it.asset_id, asset_code: it.asset_code,
            description: it.description || null, location: it.location || null,
            area: it.area || null, direction: it.direction || null,
            media_type: it.media_type || null, illumination: it.illumination || null,
            dimension_text: it.dimension_text || null, hsn_sac: it.hsn_sac || '998361',
            bill_start_date: billStart, bill_end_date: billEnd, billable_days: billableDays,
            rate_type: 'legacy', rate_value: Number(it.rate || it.unit_price || 0) || 0,
            base_amount: Number(it.amount || it.total || 0) || 0,
            printing_cost: Number(it.printing_charges || it.printing_cost || 0) || 0,
            mounting_cost: Number(it.mounting_charges || it.mounting_cost || 0) || 0,
            line_total: Number(it.amount || it.total || 0) || 0,
          }));

        if (toInsert.length > 0) {
          await serviceClient.from('invoice_items').insert(toInsert);
        }
      }
    }
  }

  // Query invoice_items that need backfilling, scoped to company
  let query = serviceClient
    .from('invoice_items')
    .select('id, invoice_id, campaign_asset_id, asset_id, asset_code, location, area, direction, media_type, illumination, dimension_text, hsn_sac')
    .limit(limit);

  if (invoiceIds.length > 0) {
    query = query.in('invoice_id', invoiceIds);
  } else {
    query = query.or('location.is.null,area.is.null,direction.is.null,media_type.is.null,illumination.is.null,dimension_text.is.null,hsn_sac.is.null');
  }

  const { data: rows, error: rowsErr } = await query;
  if (rowsErr) return jsonError(rowsErr.message, 500);

  const invoiceItems = (rows || []) as any[];
  if (invoiceItems.length === 0) {
    return jsonSuccess({ success: true, updated: 0 });
  }

  const campaignAssetIds = Array.from(new Set(invoiceItems.map(r => r.campaign_asset_id).filter(Boolean))) as string[];
  const assetIds = Array.from(new Set(invoiceItems.map(r => r.asset_id).filter(Boolean))) as string[];

  const [campaignAssetsRes, mediaAssetsRes] = await Promise.all([
    campaignAssetIds.length
      ? serviceClient.from('campaign_assets').select('id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft').in('id', campaignAssetIds)
      : Promise.resolve({ data: [] } as any),
    assetIds.length
      ? serviceClient.from('media_assets').select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft').in('id', assetIds)
      : Promise.resolve({ data: [] } as any),
  ]);

  const caMap = new Map(((campaignAssetsRes as any).data || []).map((a: any) => [a.id, a]));
  const maMap = new Map(((mediaAssetsRes as any).data || []).map((a: any) => [a.id, a]));

  let updated = 0;
  const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const updates = invoiceItems.map(row => {
    const ca = row.campaign_asset_id ? caMap.get(row.campaign_asset_id) : null;
    const maId = row.asset_id || ca?.asset_id;
    const ma = maId ? maMap.get(maId) : null;
    const source = ca || ma;
    return {
      id: row.id,
      asset_code: row.asset_code || ma?.media_asset_code || ma?.asset_id_readable || row.asset_id || '-',
      location: row.location ?? source?.location ?? null,
      area: row.area ?? source?.area ?? null,
      direction: row.direction ?? source?.direction ?? null,
      media_type: row.media_type ?? source?.media_type ?? null,
      illumination: row.illumination ?? source?.illumination_type ?? null,
      dimension_text: row.dimension_text ?? source?.dimensions ?? null,
      hsn_sac: row.hsn_sac ?? '998361',
    };
  });

  for (const batch of chunk(updates, 50)) {
    await Promise.all(batch.map(async u => {
      const { error } = await serviceClient
        .from('invoice_items')
        .update({
          asset_code: u.asset_code, location: u.location, area: u.area,
          direction: u.direction, media_type: u.media_type,
          illumination: u.illumination, dimension_text: u.dimension_text, hsn_sac: u.hsn_sac,
        })
        .eq('id', u.id);
      if (!error) updated++;
    }));
  }

  await logSecurityAudit({
    functionName: 'backfill-invoice-items', userId: ctx.userId,
    companyId: ctx.companyId, action: 'backfill_invoice_items',
    status: 'success', req,
    metadata: { updated, invoiceIds: invoiceIds.length > 0 ? invoiceIds : 'all_missing' },
  });

  return jsonSuccess({ success: true, updated });
}));
