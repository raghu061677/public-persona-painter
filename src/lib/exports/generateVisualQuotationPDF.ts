import { supabase } from '@/integrations/supabase/client';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';
import { fetchImageAsDataUri } from './imageData';
import { getSignedUrl } from '@/utils/storage';
import { getDurationDisplay, calculateCampaignDuration } from '@/lib/utils/campaignDuration';
import { resolveExportSalesperson, resolvePaymentTerms } from '@/lib/utils/exportMetadata';
import { generateStandardizedPDFDoc, formatDateToDDMMYYYY, formatDateToDDMonYY } from '@/lib/pdf/standardPDFTemplate';
import type { PDFDocumentData } from '@/lib/pdf/standardPDFTemplate';
import { getPrimaryContactName } from '@/lib/pdf/pdfHelpers';

/**
 * Visual Quotation PDF:
 * Page 1 = exact same layout as the standard quotation (via generateStandardizedPDFDoc)
 * Page 2+ = Media Asset Gallery with photos
 */

// ---- Image helpers ----

async function resizeImage(srcDataUrl: string, maxWidth = 250, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = srcDataUrl;
  });
}

async function resolvePhotoUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http')) {
    try { return await fetchImageAsDataUri(url); } catch { return null; }
  }
  try {
    const parts = url.split('/');
    const bucket = parts[0] || 'media-assets';
    const path = parts.slice(1).join('/') || url;
    const signed = await getSignedUrl(bucket, path);
    if (!signed) return null;
    return await fetchImageAsDataUri(signed);
  } catch { return null; }
}

async function getAssetPhotos(assetId: string, primaryPhotoUrl?: string | null): Promise<string[]> {
  const photos: string[] = [];

  // Query media_photos - order by uploaded_at desc (is_primary column does NOT exist)
  try {
    const { data: mediaPhotos } = await supabase
      .from('media_photos')
      .select('photo_url')
      .eq('asset_id', assetId)
      .order('uploaded_at', { ascending: false })
      .limit(2);
    if (mediaPhotos) {
      for (const mp of mediaPhotos) {
        if (mp.photo_url) {
          const d = await resolvePhotoUrl(mp.photo_url);
          if (d) photos.push(d);
          if (photos.length >= 2) break;
        }
      }
    }
  } catch (e) {
    console.warn('[VisualQuotation] media_photos query failed for', assetId, e);
  }

  // Fallback to primary_photo_url from media_assets
  if (photos.length === 0 && primaryPhotoUrl) {
    const d = await resolvePhotoUrl(primaryPhotoUrl);
    if (d) photos.push(d);
  }

  // Resize for small PDF size
  const resized: string[] = [];
  for (const p of photos) {
    try { resized.push(await resizeImage(p, 250, 0.7)); } catch { resized.push(p); }
  }
  return resized.slice(0, 2);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2,'0')} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ---- Main export ----

export async function generateVisualQuotationPDF(
  plan: any,
  planItems: any[],
  options: ExportOptions,
): Promise<Blob> {
  // ===== Fetch all required data (same as unifiedPDFExport standard path) =====
  const { data: clientData } = await supabase.from('clients').select('*').eq('id', plan.client_id).single();
  const { data: clientContacts } = await supabase.from('client_contacts').select('*').eq('client_id', plan.client_id).order('is_primary', { ascending: false });
  const { data: companyData } = await supabase.from('companies').select('name,gstin,pan,logo_url').eq('id', plan.company_id).single();
  const { data: orgSettings } = await supabase.from('organization_settings').select('logo_url,organization_name,default_payment_terms').limit(1).maybeSingle();

  const salesperson = await resolveExportSalesperson(plan);
  const resolvedPaymentTerms = resolvePaymentTerms(plan.payment_terms, (clientData as any)?.payment_terms, (orgSettings as any)?.default_payment_terms);
  const companyName = companyData?.name || (orgSettings as any)?.organization_name || options.companyName || 'Company';
  const companyGSTIN = companyData?.gstin || options.gstin || '';
  const companyPAN = companyData?.pan || '';

  // Load logo
  let logoBase64: string | undefined;
  const logoUrl = companyData?.logo_url || (orgSettings as any)?.logo_url;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((r, j) => { const rd = new FileReader(); rd.onload = () => r(String(rd.result)); rd.onerror = j; rd.readAsDataURL(blob); });
      }
    } catch { /* skip */ }
  }

  const clientWithContacts = {
    ...clientData,
    contacts: clientContacts?.map((c: any) => ({
      name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.name,
      first_name: c.first_name,
      last_name: c.last_name,
    })) || [],
  };
  const pointOfContact = getPrimaryContactName(clientWithContacts);

  const start = plan.start_date;
  const end = plan.end_date;
  const campaignDurationCalc = calculateCampaignDuration(start, end);
  const totalDays = plan.duration_days || campaignDurationCalc.totalDays;
  const formatDateForDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate().toString().padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const campaignDuration = start && end
    ? `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)} (${getDurationDisplay(totalDays)})`
    : undefined;

  // Build line items (same format as standard quotation)
  const items = (planItems || []).map((item: any, index: number) => {
    const monthlyRate = Number(item.sales_price || item.card_rate || 0);
    const printingCharge = Number(item.printing_charges || 0);
    const mountingCharge = Number(item.mounting_charges || 0);
    const itemDays = item.duration_days || totalDays;
    const proRataRent = Math.round(((monthlyRate / 30) * itemDays) * 100) / 100;
    const unitPriceTotal = Math.round((proRataRent + printingCharge + mountingCharge) * 100) / 100;
    const cityName = item.city || clientData?.billing_city || '';
    const locationName = item.location || 'Display';
    const locationCode = cityName ? `${cityName} - ${locationName}` : locationName;

    return {
      sno: index + 1,
      locationCode: locationCode.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
      area: item.area || item.city || '-',
      mediaType: item.media_type || 'OOH Media',
      route: item.direction || item.route || '-',
      illumination: item.illumination_type || 'NonLit',
      dimension: (item.dimensions || '-').toString().replace(/\s+/g, ' ').trim(),
      totalSqft: item.total_sqft || 0,
      fromDate: formatDateToDDMMYYYY(item.start_date || start),
      toDate: formatDateToDDMMYYYY(item.end_date || end),
      duration: getDurationDisplay(itemDays),
      unitPrice: proRataRent,
      printingCost: printingCharge,
      mountingCost: mountingCharge,
      subtotal: unitPriceTotal,
    };
  });

  const gstTotal = Number(plan.gst_amount || 0);
  const cgst = Math.round(gstTotal / 2);
  const sgst = gstTotal - cgst;
  const totalInr = Number(plan.grand_total || 0);
  const untaxedAmount = Math.max(0, totalInr - gstTotal);

  // ===== PAGE 1: Use exact same standard quotation template =====
  const pdfData: PDFDocumentData = {
    documentType: 'QUOTATION',
    documentNumber: plan.id,
    documentDate: formatDateToDDMonYY(plan.created_at || new Date().toISOString()),
    displayName: plan.plan_name || plan.id,
    pointOfContact,
    clientName: clientData?.name || plan.client_name || 'Client',
    clientAddress: [clientData?.billing_address_line1, clientData?.billing_address_line2].filter(Boolean).join(', ') || clientData?.address || '-',
    clientCity: clientData?.billing_city || clientData?.city || '',
    clientState: clientData?.billing_state || clientData?.state || '',
    clientPincode: clientData?.billing_pincode || '',
    clientGSTIN: clientData?.gst_number || undefined,
    companyName,
    companyGSTIN,
    companyPAN,
    companyLogoBase64: logoBase64,
    items,
    untaxedAmount,
    cgst,
    sgst,
    totalInr,
    terms: options.termsAndConditions,
    paymentTerms: resolvedPaymentTerms,
    campaignDuration,
    quotationValidityDays: (plan as any).quotation_validity_days || 7,
    totalLocations: (planItems || []).length,
    salesContactName: salesperson.name || undefined,
    salesContactPhone: salesperson.phone || undefined,
    salesContactEmail: salesperson.email || undefined,
    salesPerson: salesperson.name || undefined,
  };

  const doc = await generateStandardizedPDFDoc(pdfData);
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mg = 14;
  const blue = [30, 64, 175] as const;

  // ===== Fetch asset photos =====
  const assetIds = (planItems || []).map((i: any) => i.asset_id).filter(Boolean);
  const assetPrimaryPhotos = new Map<string, string | null>();
  if (assetIds.length > 0) {
    const { data: assetData } = await supabase.from('media_assets').select('id, primary_photo_url').in('id', assetIds);
    if (assetData) assetData.forEach(a => assetPrimaryPhotos.set(a.id, a.primary_photo_url));
  }

  const assetPhotoMap = new Map<string, string[]>();
  for (const item of planItems || []) {
    if (!item.asset_id) continue;
    const photos = await getAssetPhotos(item.asset_id, assetPrimaryPhotos.get(item.asset_id));
    assetPhotoMap.set(item.asset_id, photos);
  }

  // ===== PAGE 2+: MEDIA PHOTO GALLERY =====
  const hasPhotos = Array.from(assetPhotoMap.values()).some(p => p.length > 0);

  doc.addPage();
  let y = mg;

  // Gallery header
  doc.setFillColor(...blue);
  doc.rect(0, 0, pw, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDIA ASSET GALLERY', pw / 2, 9.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y = 20;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reference: ${plan.id}  |  Client: ${clientData?.name || ''}  |  ${campaignDuration || ''}`, mg, y);
  y += 7;

  if (!hasPhotos) {
    // Show clear message when no photos are available
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('No media photos available for selected assets.', pw / 2, y + 20, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Upload photos to media assets to include them in visual quotations.', pw / 2, y + 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  } else {
    for (let i = 0; i < (planItems || []).length; i++) {
      const item = planItems[i];
      const photos = assetPhotoMap.get(item.asset_id) || [];
      if (photos.length === 0) continue;

      const blockH = 65;
      if (y + blockH > ph - 15) { doc.addPage(); y = mg; }

      // Separator
      doc.setDrawColor(210, 210, 210);
      doc.line(mg, y, pw - mg, y);
      y += 3;

      // Title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blue);
      doc.text(`${i + 1}. ${item.location || item.asset_id || 'Media Asset'}`, mg, y);
      y += 5;

      // Details
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const detailText = [
        `Area: ${item.area || '-'}`,
        `Type: ${item.media_type || '-'}`,
        `Size: ${item.dimensions || '-'}`,
        `Period: ${fmtDate(item.start_date || start)} - ${fmtDate(item.end_date || end)}`,
        `Rate: Rs. ${inr(Number(item.sales_price || item.card_rate || 0))}/month`,
      ].join('  |  ');
      doc.text(detailText, mg, y);
      y += 5;

      // Photos
      doc.setTextColor(0, 0, 0);
      const imgW = 80;
      const imgH = 50;
      const gap = 8;
      for (let p = 0; p < photos.length; p++) {
        try {
          doc.addImage(photos[p], 'JPEG', mg + p * (imgW + gap), y, imgW, imgH);
        } catch { /* skip */ }
      }
      y += imgH + 8;
    }
  }

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text(`Generated by ${companyName}`, pw / 2, ph - 6, { align: 'center' });

  return doc.output('blob');
}
