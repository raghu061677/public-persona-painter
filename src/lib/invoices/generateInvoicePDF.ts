import { supabase } from '@/integrations/supabase/client';
import { InvoiceData } from './templates/types';
import { renderInvoicePDF, INVOICE_TEMPLATES, getTemplateConfig } from './templates/registry';

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

export async function generateInvoicePDF(invoiceId: string, templateKey?: string): Promise<Blob> {
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
      .select('id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft, booking_start_date, booking_end_date, rent_amount, printing_cost, mounting_cost, card_rate, negotiated_rate, daily_rate, booked_days')
      .eq('campaign_id', invoice.campaign_id);

    if (campAssets && campAssets.length > 0) {
      // Fetch media_assets for asset_code (display ID like MNS-HYD-BQS-0001)
      const maIds = campAssets.map((ca: any) => ca.asset_id).filter(Boolean);
      const { data: maData } = maIds.length > 0
        ? await supabase.from('media_assets').select('id, media_asset_code').in('id', maIds)
        : { data: [] };
      const maCodeMap = new Map((maData || []).map((m: any) => [m.id, m.media_asset_code || m.id]));

      enrichedItems = campAssets.map((ca: any, idx: number) => {
        const rentAmt = ca.rent_amount || ca.negotiated_rate || ca.card_rate || 0;
        const printAmt = ca.printing_cost || 0;
        const mountAmt = ca.mounting_cost || 0;
        const lineTotal = rentAmt + printAmt + mountAmt;
        return {
          sno: idx + 1,
          campaign_asset_id: ca.id,
          asset_id: ca.asset_id,
          asset_code: maCodeMap.get(ca.asset_id) || ca.asset_id || '-',
          location: ca.location || '-',
          area: ca.area || '-',
          direction: ca.direction || '-',
          media_type: ca.media_type || '-',
          illumination: ca.illumination_type || '-',
          illumination_type: ca.illumination_type || '-',
          dimensions: ca.dimensions || '-',
          total_sqft: ca.total_sqft || 0,
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
          booked_days: ca.booked_days,
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
            .select('id, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
            .in('id', assetIds)
        : Promise.resolve({ data: null } as any),
      campaignAssetIds.length
        ? supabase
            .from('campaign_assets')
            .select(
              'id, asset_id, location, area, direction, media_type, illumination_type, dimensions, total_sqft, booking_start_date, booking_end_date'
            )
            .in('id', campaignAssetIds)
        : Promise.resolve({ data: null } as any),
    ]);

    const mediaAssets = ((mediaAssetsRes as any)?.data || []) as any[];
    const campaignAssets = ((campaignAssetsRes as any)?.data || []) as any[];

    const mediaAssetMap = new Map(mediaAssets.map((a: any) => [a.id, a]));
    const campaignAssetMap = new Map(campaignAssets.map((c: any) => [c.id, c]));

    enrichedItems = enrichedItems.map((item: any) => {
      const caId = item.campaign_asset_id || item.campaign_assets_id;
      const campaignAsset: any = caId ? campaignAssetMap.get(caId) : undefined;
      const assetId: string | undefined = item.asset_id || campaignAsset?.asset_id;
      const mediaAsset: any = assetId ? mediaAssetMap.get(assetId) : undefined;

      const source: any = campaignAsset || mediaAsset;
      if (!source) return item;

      return {
        ...item,
        asset_id: item.asset_id || campaignAsset?.asset_id,
        // Prefer existing snapshot values on item; otherwise use joined values
        location: item.location ?? source.location,
        area: item.area ?? source.area,
        direction: item.direction ?? source.direction,
        media_type: item.media_type ?? source.media_type,
        illumination: item.illumination ?? source.illumination_type,
        illumination_type: item.illumination_type ?? source.illumination_type,
        dimensions: item.dimensions ?? item.dimension_text ?? source.dimensions,
        total_sqft: item.total_sqft ?? source.total_sqft,
        // Booking dates (only if missing)
        booking_start_date: item.booking_start_date ?? campaignAsset?.booking_start_date,
        booking_end_date: item.booking_end_date ?? campaignAsset?.booking_end_date,
      };
    });
  }

  // Load logo
  let logoBase64: string | null = null;
  const logoUrl = companyData?.logo_url || orgSettings?.logo_url;
  if (logoUrl && !logoUrl.startsWith('data:')) {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } else if (logoUrl?.startsWith('data:')) {
    logoBase64 = logoUrl;
  }

  const data: InvoiceData = {
    invoice,
    client,
    campaign,
    items: enrichedItems,
    company: companyData,
    orgSettings: orgSettings,
    logoBase64: logoBase64 || undefined,
  };

  // Use template from invoice or passed parameter
  const effectiveTemplate = templateKey || invoice.pdf_template_key || 'default_existing';
  
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
