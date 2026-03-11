import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';
import { fetchImageAsDataUri } from './imageData';
import { getSignedUrl } from '@/utils/storage';
import { getDurationDisplay, calculateCampaignDuration } from '@/lib/utils/campaignDuration';
import { resolveExportSalesperson, resolvePaymentTerms } from '@/lib/utils/exportMetadata';

/**
 * Visual Quotation PDF: standard quotation table + media photo pages in a single PDF.
 */

// Resize image via canvas
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

  try {
    const { data: mediaPhotos } = await supabase
      .from('media_photos')
      .select('photo_url')
      .eq('asset_id', assetId)
      .order('is_primary', { ascending: false })
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
  } catch { /* ignore */ }

  if (photos.length === 0 && primaryPhotoUrl) {
    const d = await resolvePhotoUrl(primaryPhotoUrl);
    if (d) photos.push(d);
  }

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

function fmtDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2,'0')}${m[d.getMonth()]}${d.getFullYear().toString().slice(-2)}`;
}

function fmtDDMMYYYY(s: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function inr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export async function generateVisualQuotationPDF(
  plan: any,
  planItems: any[],
  options: ExportOptions,
): Promise<Blob> {
  // Fetch data
  const { data: clientData } = await supabase.from('clients').select('*').eq('id', plan.client_id).single();
  const { data: clientContacts } = await supabase.from('client_contacts').select('*').eq('client_id', plan.client_id).order('is_primary', { ascending: false });
  const { data: companyData } = await supabase.from('companies').select('name,gstin,pan,logo_url,address_line1,address_line2,city,state,pincode').eq('id', plan.company_id).single();
  const { data: orgSettings } = await supabase.from('organization_settings').select('logo_url,organization_name,default_payment_terms').limit(1).maybeSingle();

  const salesperson = await resolveExportSalesperson(plan);
  const paymentTerms = resolvePaymentTerms(plan.payment_terms, (clientData as any)?.payment_terms, (orgSettings as any)?.default_payment_terms);
  const companyName = companyData?.name || (orgSettings as any)?.organization_name || options.companyName || 'Company';
  const companyGSTIN = companyData?.gstin || options.gstin || '';

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

  const primaryContact = clientContacts?.[0];
  const pocName = primaryContact ? (primaryContact.first_name ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : (primaryContact as any).name) : '';

  const start = plan.start_date;
  const end = plan.end_date;
  const durationCalc = calculateCampaignDuration(start, end);
  const totalDays = plan.duration_days || durationCalc.totalDays;
  const campaignDuration = start && end ? `${fmtDate(start)} - ${fmtDate(end)} (${getDurationDisplay(totalDays)})` : '';

  // Fetch asset photos
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

  // Create PDF
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mg = 14;
  const cw = pw - mg * 2;
  let y = mg;

  // ========== PAGE 1: QUOTATION ==========
  const blue = [30, 64, 175] as const;

  // Header bar
  doc.setFillColor(...blue);
  doc.rect(0, 0, pw, 16, 'F');

  // Logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', mg, 2, 12, 12); } catch { /* skip */ }
  }

  // Company name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, logoBase64 ? mg + 15 : mg, 10);

  // QUOTATION title
  doc.setFontSize(10);
  doc.text('QUOTATION', pw - mg, 10, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  y = 22;

  // Company address
  const companyAddr = [companyData?.address_line1, companyData?.address_line2, companyData?.city, companyData?.state, companyData?.pincode].filter(Boolean).join(', ');
  if (companyAddr) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(companyAddr, mg, y);
    y += 3;
  }
  if (companyGSTIN) {
    doc.text(`GSTIN: ${companyGSTIN}`, mg, y);
    y += 5;
  } else {
    y += 2;
  }

  doc.setTextColor(0, 0, 0);

  // Bill To / Quotation Details side by side
  const colW = cw / 2;

  // Bill To
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blue);
  doc.text('BILL TO', mg, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.setFontSize(9);
  doc.text(clientData?.name || plan.client_name || '', mg, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const clientAddr = [clientData?.billing_address_line1, clientData?.billing_address_line2].filter(Boolean).join(', ');
  if (clientAddr) { doc.text(clientAddr, mg, y); y += 3.5; }
  const clientCityState = [clientData?.billing_city || clientData?.city, clientData?.billing_state || clientData?.state, clientData?.billing_pincode].filter(Boolean).join(', ');
  if (clientCityState) { doc.text(clientCityState, mg, y); y += 3.5; }
  if (clientData?.gst_number) { doc.text(`GSTIN: ${clientData.gst_number}`, mg, y); y += 3.5; }
  if (pocName) { doc.text(`Contact: ${pocName}`, mg, y); y += 3.5; }

  // Quotation Details (right side)
  const detY = y - (clientAddr ? 14 : 7);
  const rX = mg + colW + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blue);
  doc.text('QUOTATION DETAILS', rX, detY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  let dy = detY + 4;
  const detailPairs: [string, string][] = [
    ['Quotation No:', plan.id],
    ['Date:', fmtDate(plan.created_at || new Date().toISOString())],
    ['Campaign:', plan.plan_name || plan.id],
    ['Duration:', campaignDuration],
    ['Validity:', `${(plan as any).quotation_validity_days || 7} Days`],
  ];
  for (const [label, val] of detailPairs) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, rX, dy);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(val, colW - 25);
    doc.text(lines, rX + 23, dy);
    dy += (lines.length > 1 ? lines.length * 3.5 : 4);
  }

  y = Math.max(y, dy) + 4;

  // Campaign Summary strip
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(mg, y, cw, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Media Units: ${(planItems || []).length}`, mg + 5, y + 6.5);
  doc.text(`Total Campaign Budget: Rs. ${inr(Number(plan.grand_total || 0))}`, pw / 2, y + 6.5);
  y += 15;

  // Asset Table
  const tableHead = [['S.No', 'Location / Description', 'Media Spec', 'Booking Period', 'Commercials', 'Total']];
  const tableBody = (planItems || []).map((item: any, idx: number) => {
    const monthlyRate = Number(item.sales_price || item.card_rate || 0);
    const printing = Number(item.printing_charges || 0);
    const mounting = Number(item.mounting_charges || 0);
    const days = item.duration_days || totalDays;
    const proRata = Math.round(((monthlyRate / 30) * days) * 100) / 100;
    const lineTotal = Math.round((proRata + printing + mounting) * 100) / 100;

    const city = item.city || '';
    const loc = item.location || '-';
    const area = item.area || '';

    return [
      (idx + 1).toString(),
      `${city ? city + ' - ' : ''}${loc}\n${area}`,
      `${item.media_type || '-'}\n${item.dimensions || '-'}\n${item.illumination_type || 'NonLit'}`,
      `${fmtDDMMYYYY(item.start_date || start)} to\n${fmtDDMMYYYY(item.end_date || end)}\n${getDurationDisplay(days)}`,
      `Rent: Rs.${inr(proRata)}\nP: Rs.${inr(printing)}\nM: Rs.${inr(mounting)}`,
      `Rs.${inr(lineTotal)}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: blue as any, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, textColor: [40, 40, 40], cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: mg, right: mg },
    styles: { overflow: 'linebreak' },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 5;

  // Financial summary
  const gstTotal = Number(plan.gst_amount || 0);
  const cgst = Math.round(gstTotal / 2);
  const sgst = gstTotal - cgst;
  const grandTotal = Number(plan.grand_total || 0);
  const untaxed = Math.max(0, grandTotal - gstTotal);

  if (y + 30 > ph - 40) { doc.addPage(); y = mg; }

  const sumX = pw - mg - 70;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const summaryRows: [string, string][] = [
    ['Subtotal:', `Rs. ${inr(untaxed)}`],
    ['CGST (9%):', `Rs. ${inr(cgst)}`],
    ['SGST (9%):', `Rs. ${inr(sgst)}`],
  ];
  for (const [lbl, val] of summaryRows) {
    doc.text(lbl, sumX, y);
    doc.text(val, pw - mg, y, { align: 'right' });
    y += 5;
  }
  // Grand total with highlight
  doc.setFillColor(...blue);
  doc.roundedRect(sumX - 3, y - 3, pw - mg - sumX + 6, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', sumX, y + 2.5);
  doc.text(`Rs. ${inr(grandTotal)}`, pw - mg, y + 2.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // Payment Terms
  if (y + 10 > ph - 30) { doc.addPage(); y = mg; }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms:', mg, y);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentTerms, mg + 28, y);
  y += 6;

  // Sales Contact
  if (salesperson.name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Contact:', mg, y);
    doc.setFont('helvetica', 'normal');
    let contactStr = salesperson.name;
    if (salesperson.phone) contactStr += ` | ${salesperson.phone}`;
    if (salesperson.email) contactStr += ` | ${salesperson.email}`;
    doc.text(contactStr, mg + 28, y);
    y += 8;
  }

  // Terms & Conditions
  if (options.termsAndConditions && options.termsAndConditions.length > 0) {
    if (y + 15 > ph - 20) { doc.addPage(); y = mg; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', mg, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    for (let i = 0; i < options.termsAndConditions.length; i++) {
      const term = options.termsAndConditions[i];
      if (!term) continue;
      const lines = doc.splitTextToSize(`${i + 1}. ${term}`, cw - 5);
      if (y + lines.length * 3 > ph - 15) { doc.addPage(); y = mg; }
      doc.text(lines, mg + 2, y);
      y += lines.length * 3 + 1;
    }
  }

  // Client Approval section
  if (y + 25 > ph - 10) { doc.addPage(); y = mg; }
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Approval', mg, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Name: ____________________', mg, y);
  doc.text('Designation: ____________________', mg + 70, y);
  y += 6;
  doc.text('Signature: ____________________', mg, y);
  doc.text('Date: ____________________', mg + 70, y);
  y += 8;
  doc.setFontSize(6.5);
  doc.text('Authorized Signatory', pw - mg, y, { align: 'right' });

  // ========== PAGE 2+: MEDIA PHOTO GALLERY ==========
  const hasPhotos = Array.from(assetPhotoMap.values()).some(p => p.length > 0);
  if (hasPhotos) {
    doc.addPage();
    y = mg;

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
    doc.text(`Reference: ${plan.id}  |  Client: ${clientData?.name || ''}  |  ${campaignDuration}`, mg, y);
    y += 7;

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

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.text(`Generated by ${companyName}`, pw / 2, ph - 6, { align: 'center' });
  }

  return doc.output('blob');
}
