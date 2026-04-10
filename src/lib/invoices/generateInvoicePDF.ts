import { supabase } from '@/integrations/supabase/client';
import { InvoiceData } from './templates/types';
import { renderInvoicePDF, INVOICE_TEMPLATES, getTemplateConfig } from './templates/registry';
import { prorateInvoiceLineItems } from './prorateLineItems';
import { fetchProofGalleryData } from './templates/invoiceWithProofTemplate';

// Re-export for external use
export { INVOICE_TEMPLATES, getTemplateConfig };

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(invoiceId: string, templateKey?: string, options?: { attachProofGallery?: boolean }): Promise<Blob> {
  // Fetch invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) throw new Error('Invoice not found');

  // Fetch client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', invoice.client_id)
    .single();

  if (clientError || !client) throw new Error('Client not found');

  // Fetch campaign details if available
  let campaign = null;
  if (invoice.campaign_id) {
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', invoice.campaign_id)
      .single();
    campaign = campaignData;
  }

  // Fetch company details
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', invoice.company_id)
    .single();

  // Fetch organization settings as fallback
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('*')
    .single();

  // Fetch persisted invoice_items snapshots (preferred for stable PDFs)
  const { data: invoiceItemsSnapshot } = await supabase
    .from('invoice_items')
    .select(
      'invoice_id, campaign_asset_id, asset_id, asset_code, location, area, direction, media_type, illumination, dimension_text, hsn_sac, bill_start_date, bill_end_date'
    )
    .eq('invoice_id', invoiceId);

  // Enrich invoice items with OOH snapshot fields.
  // Important: We do NOT recalculate totals here; only hydrate display metadata.
  let enrichedItems = Array.isArray(invoice.items) ? [...invoice.items] : [];

  // Check if items lack asset details (legacy summary-only items)
  const itemsLackAssetInfo = enrichedItems.length > 0 && enrichedItems.every(
    (item: any) => !item.asset_id && !item.campaign_asset_id && !item.campaign_assets_id && !item.location
  );

  // If items are summary-only and we have a campaign, rebuild from campaign_assets
  if (itemsLackAssetInfo && invoice.campaign_id) {
    const { data: campAssets } = await supabase
      .from('campaign_assets')
      .select('id, asset_id, city, location, area, direction, media_type, illumination_type, dimensions, total_sqft, booking_start_date, booking_end_date, rent_amount, printing_cost, mounting_cost, printing_charges, mounting_charges, card_rate, negotiated_rate, daily_rate, booked_days')
      .eq('campaign_id', invoice.campaign_id);

    if (campAssets && campAssets.length > 0) {
      // Fetch media_assets for asset_code (display ID like MNS-HYD-BQS-0001)
      const maIds = campAssets.map((ca: any) => ca.asset_id).filter(Boolean);
      const { data: maData } = maIds.length > 0
        ? await supabase.from('media_assets').select('id, media_asset_code').in('id', maIds)
        : { data: [] };
      const maCodeMap = new Map((maData || []).map((m: any) => [m.id, m.media_asset_code || null]));

      enrichedItems = campAssets.map((ca: any, idx: number) => {
        // CRITICAL: Prefer existing invoice JSONB item pricing (immutable snapshot)
        // over campaign_assets totals which may store campaign-level rates
        const existing: any = (enrichedItems && enrichedItems[idx]) || {};
        const printAmt = Number(existing.printing_charges ?? existing.printing_cost ?? ca.printing_charges ?? ca.printing_cost ?? 0);
        const mountAmt = Number(existing.mounting_charges ?? existing.mounting_cost ?? ca.mounting_charges ?? ca.mounting_cost ?? 0);
        const explicitRent = existing.rent_amount ?? existing.rate;
        const derivedRentFromAmount = existing.amount != null
          ? Math.max(0, Number(existing.amount) - printAmt - mountAmt)
          : null;
        const rentAmt = Number(explicitRent ?? derivedRentFromAmount ?? ca.rent_amount ?? 0);
        const lineTotal = rentAmt + printAmt + mountAmt;
        // Use null instead of '-' so downstream hydration from media_assets can fill gaps
        const validOrNull = (v: any) => (v && v !== '-' && v !== 'N/A') ? v : null;
        return {
          sno: idx + 1,
          campaign_asset_id: ca.id,
          asset_id: ca.asset_id,
          asset_code: maCodeMap.get(ca.asset_id) || null,
          city: validOrNull(ca.city),
          location: validOrNull(ca.location),
          area: validOrNull(ca.area),
          direction: validOrNull(ca.direction),
          media_type: validOrNull(ca.media_type),
          illumination: validOrNull(ca.illumination_type),
          illumination_type: validOrNull(ca.illumination_type),
          dimensions: validOrNull(ca.dimensions),
          total_sqft: ca.total_sqft || null,
          booking_start_date: ca.booking_start_date,
          booking_end_date: ca.booking_end_date,
          description: `Display Rent`,
          rate: rentAmt,
          amount: lineTotal,
          total: lineTotal,
          rent_amount: rentAmt,
          quantity: 1,
          printing_charges: printAmt,
          mounting_charges: mountAmt,
          printing_cost: printAmt,
          mounting_cost: mountAmt,
          hsn_sac: '998361',
          booked_days: (ca.booking_start_date && ca.booking_end_date) ? Math.max(1, Math.floor((new Date(ca.booking_end_date).getTime() - new Date(ca.booking_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : (ca.booked_days || 0),
          daily_rate: ca.daily_rate,
        };
      });
    }
  }

  // 1) First hydrate from invoice_items snapshot table (stable, generation-time)
  if (enrichedItems.length > 0 && Array.isArray(invoiceItemsSnapshot) && invoiceItemsSnapshot.length > 0) {
    const byCampaignAssetId = new Map(
      invoiceItemsSnapshot
        .filter((r: any) => r?.campaign_asset_id)
        .map((r: any) => [r.campaign_asset_id, r])
    );
    const byAssetId = new Map(
      invoiceItemsSnapshot
        .filter((r: any) => r?.asset_id)
        .map((r: any) => [r.asset_id, r])
    );
    const byAssetCode = new Map(
      invoiceItemsSnapshot
        .filter((r: any) => r?.asset_code)
        .map((r: any) => [r.asset_code, r])
    );

    enrichedItems = enrichedItems.map((item: any) => {
      const caId = item.campaign_asset_id || item.campaign_assets_id;
      const snap: any =
        (caId ? byCampaignAssetId.get(caId) : undefined) ||
        (item.asset_id ? byAssetId.get(item.asset_id) : undefined) ||
        (item.asset_code ? byAssetCode.get(item.asset_code) : undefined);

      if (!snap) return item;

      return {
        ...item,
        asset_id: item.asset_id ?? snap.asset_id,
        asset_code: item.asset_code ?? snap.asset_code,
        location: item.location ?? snap.location,
        area: item.area ?? snap.area,
        direction: item.direction ?? snap.direction,
        media_type: item.media_type ?? snap.media_type,
        illumination: item.illumination ?? snap.illumination,
        dimension_text: item.dimension_text ?? snap.dimension_text,
        hsn_sac: item.hsn_sac ?? snap.hsn_sac,
        // Map billing dates to booking fields if missing
        booking_start_date: item.booking_start_date ?? snap.bill_start_date,
        booking_end_date: item.booking_end_date ?? snap.bill_end_date,
        // Template compatibility
        dimensions: item.dimensions ?? snap.dimension_text,
      };
    });
  }

  if (enrichedItems.length > 0) {
    const assetIds = Array.from(
      new Set(enrichedItems.map((item: any) => item.asset_id).filter(Boolean))
    );
    const campaignAssetIds = Array.from(
      new Set(
        enrichedItems
          .map((item: any) => item.campaign_asset_id || item.campaign_assets_id)
          .filter(Boolean)
      )
    );

    const [mediaAssetsRes, campaignAssetsRes] = await Promise.all([
      assetIds.length
        ? supabase
            .from('media_assets')
            .select('id, media_asset_code, city, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
            .in('id', assetIds)
        : Promise.resolve({ data: null } as any),
      campaignAssetIds.length
        ? supabase
            .from('campaign_assets')
            .select(
              'id, asset_id, city, location, area, direction, media_type, illumination_type, dimensions, total_sqft, booking_start_date, booking_end_date, rent_amount, printing_charges, mounting_charges, daily_rate, booked_days'
            )
            .in('id', campaignAssetIds)
        : Promise.resolve({ data: null } as any),
    ]);

    const mediaAssets = ((mediaAssetsRes as any)?.data || []) as any[];
    const campaignAssets = ((campaignAssetsRes as any)?.data || []) as any[];

    const mediaAssetMap = new Map(mediaAssets.map((a: any) => [a.id, a]));
    const campaignAssetMap = new Map(campaignAssets.map((c: any) => [c.id, c]));

    // Helper: pick the first truthy, non-placeholder value
    const pick = (...vals: any[]) => vals.find(v => v != null && v !== '' && v !== '-' && v !== 'N/A') ?? null;

    enrichedItems = enrichedItems.map((item: any) => {
      // Skip discount/adjustment line items
      if (!item.campaign_asset_id && !item.campaign_assets_id && !item.asset_id) return item;
      const caId = item.campaign_asset_id || item.campaign_assets_id;
      const campaignAsset: any = caId ? campaignAssetMap.get(caId) : undefined;
      const assetId: string | undefined = item.asset_id || campaignAsset?.asset_id;
      const mediaAsset: any = assetId ? mediaAssetMap.get(assetId) : undefined;

      const source: any = campaignAsset || mediaAsset;
      if (!source) return item;

      // CRITICAL: Invoice JSONB items are the IMMUTABLE source of truth for pricing.
      // campaign_assets/media_assets are only used to backfill MISSING metadata
      // (location, dimensions, etc.), NEVER to override financial values.
      // campaign_assets.rent_amount stores the FULL campaign-level rate, not prorated monthly.
      const printingCharges = Number(item.printing_charges ?? item.printing_cost ?? campaignAsset?.printing_charges ?? 0);
      const mountingCharges = Number(item.mounting_charges ?? item.mounting_cost ?? campaignAsset?.mounting_charges ?? 0);
      const explicitRent = item.rent_amount ?? item.rate;
      const derivedRentFromAmount = item.amount != null
        ? Math.max(0, Number(item.amount) - printingCharges - mountingCharges)
        : null;
      const rentAmount = Number(explicitRent ?? derivedRentFromAmount ?? campaignAsset?.rent_amount ?? 0);
      // Recalculate line total from components — never trust pre-computed totals from external sources
      const lineTotal = rentAmount + printingCharges + mountingCharges;

      return {
        ...item,
        asset_id: item.asset_id || campaignAsset?.asset_id,
        asset_code: mediaAsset?.media_asset_code || (item.asset_code && !/^[0-9a-f]{8}-/.test(item.asset_code) ? item.asset_code : null),
        city: pick(item.city, campaignAsset?.city, mediaAsset?.city) || '',
        location: pick(item.location, campaignAsset?.location, mediaAsset?.location) || '-',
        area: pick(item.area, campaignAsset?.area, mediaAsset?.area) || '-',
        direction: pick(item.direction, campaignAsset?.direction, mediaAsset?.direction) || '-',
        media_type: pick(item.media_type, campaignAsset?.media_type, mediaAsset?.media_type) || '-',
        illumination: pick(item.illumination, campaignAsset?.illumination_type, mediaAsset?.illumination_type) || '-',
        illumination_type: pick(item.illumination_type, campaignAsset?.illumination_type, mediaAsset?.illumination_type) || '-',
        dimensions: pick(item.dimensions, item.dimension_text, campaignAsset?.dimensions, mediaAsset?.dimensions) || '-',
        total_sqft: pick(item.total_sqft, campaignAsset?.total_sqft, mediaAsset?.total_sqft) || 0,
        booking_start_date: item.booking_start_date ?? campaignAsset?.booking_start_date,
        booking_end_date: item.booking_end_date ?? campaignAsset?.booking_end_date,
        // Pricing: stored JSONB values take priority over campaign_assets
        rent_amount: rentAmount,
        rate: rentAmount,
        printing_charges: printingCharges,
        mounting_charges: mountingCharges,
        amount: lineTotal,
        total: lineTotal,
        booked_days: (() => { const s = item.booking_start_date ?? campaignAsset?.booking_start_date; const e = item.booking_end_date ?? campaignAsset?.booking_end_date; return (s && e) ? Math.max(1, Math.floor((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24)) + 1) : (campaignAsset?.booked_days ?? item.booked_days); })(),
        daily_rate: item.daily_rate ?? campaignAsset?.daily_rate,
      };
    });
  }

  // Fetch last payment date and TDS totals for this invoice
  let lastPaymentDate: string | null = null;
  let totalTdsAmount = 0;
  if (invoice.paid_amount && parseFloat(String(invoice.paid_amount)) > 0) {
    const { data: paymentRows } = await supabase
      .from('payment_records')
      .select('payment_date, tds_amount')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });
    if (paymentRows && paymentRows.length > 0) {
      lastPaymentDate = paymentRows[0].payment_date || null;
      totalTdsAmount = paymentRows.reduce((sum: number, p: any) => sum + (p.tds_amount || 0), 0);
    }
  }

  // Load logo
  let logoBase64: string | null = null;
  const logoUrl = companyData?.logo_url || orgSettings?.logo_url;
  if (logoUrl && !logoUrl.startsWith('data:')) {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } else if (logoUrl?.startsWith('data:')) {
    logoBase64 = logoUrl;
  }

  // Prorate line items so line totals match invoice sub_total
  const invoiceSubTotal: number = parseFloat(String(invoice.sub_total)) || 0;
  const proratedItems: any[] = prorateInvoiceLineItems(enrichedItems, invoiceSubTotal);

  const data: InvoiceData & { __proofGalleryAssets?: any[] } = {
    invoice: { ...invoice, last_payment_date: lastPaymentDate, total_tds_amount: totalTdsAmount },
    client,
    campaign,
    items: proratedItems,
    company: companyData,
    orgSettings: orgSettings,
    logoBase64: logoBase64 || undefined,
  };

  // Use template from invoice or passed parameter
  const effectiveTemplate = templateKey || invoice.pdf_template_key || 'default_existing';

  // If proof gallery template and attach option is enabled, fetch proof data
  if (effectiveTemplate === 'invoice_with_proof' && options?.attachProofGallery !== false && invoice.campaign_id) {
    try {
      const proofBlocks = await fetchProofGalleryData(invoice.campaign_id, proratedItems);
      data.__proofGalleryAssets = proofBlocks;
    } catch (e) {
      console.error('Failed to fetch proof gallery data:', e);
      // Continue without proof - invoice still generates
    }
  }
  
  return renderInvoicePDF(data, effectiveTemplate);
}

// Helper function for date formatting (used by external callers if needed)
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
