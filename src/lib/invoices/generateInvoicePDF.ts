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

  // Enrich invoice items with OOH snapshot fields.
  // Important: We do NOT recalculate totals here; only hydrate display metadata.
  let enrichedItems = Array.isArray(invoice.items) ? [...invoice.items] : [];
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
        dimensions: item.dimensions ?? source.dimensions,
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
