import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storage';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';
import { addWatermarkToImage, loadImageAsDataUrl } from './photoWatermark';
import { formatAssetDisplayCode } from '@/lib/assets/formatAssetDisplayCode';

interface ExportData {
  plan: any;
  planItems: any[];
  options: ExportOptions;
}

// Format date to DD/MM/YYYY
function formatDateToDDMMYYYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

// Format date to DDMonYY (e.g., "15Aug25")
function formatDateToDDMonYY(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}

// Get document type heading
function getDocumentHeading(optionType: string): string {
  const headings: Record<string, string> = {
    quotation: 'QUOTATION',
    estimate: 'ESTIMATE',
    proforma_invoice: 'PROFORMA INVOICE',
    work_order: 'WORK ORDER',
  };
  return headings[optionType] || 'QUOTATION';
}

// Calculate duration display
function getDurationDisplay(days: number): string {
  if (days <= 0) return '-';
  if (days >= 28 && days <= 31) return '1 Month';
  if (days > 31) {
    const months = Math.round(days / 30);
    return `${months} Month${months > 1 ? 's' : ''}`;
  }
  return `${days} Days`;
}

export async function generateUnifiedPDF(data: ExportData): Promise<Blob> {
  const { plan, planItems, options } = data;

  // If user selected the photo-rich format, keep the legacy generator (it has QR + images).
  if (options.format === 'with_photos') {
    // Fetch client details
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', plan.client_id)
      .single();

    // Fetch user details for POC
    const { data: userData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', plan.created_by)
      .single();

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await generateWithPhotosPDF(doc, plan, planItems, clientData, userData, options, pageWidth, pageHeight);
    return doc.output('blob');
  }

  // For Quotation / Estimate / Work Order / Proforma, use the 098-style template
  const { generateStandardizedPDF, formatDateToDDMonYY: formatDate } = await import('@/lib/pdf/standardPDFTemplate');
  const { getPrimaryContactName } = await import('@/lib/pdf/pdfHelpers');

  const fetchAsDataUrl = async (url?: string | null): Promise<string | undefined> => {
    try {
      if (!url) return undefined;
      if (url.startsWith('data:')) return url;
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  // Fetch client + contacts (for Point of Contact)
  const { data: clientData } = await supabase
    .from('clients')
    .select('*')
    .eq('id', plan.client_id)
    .single();

  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', plan.client_id)
    .order('is_primary', { ascending: false });

  const clientWithContacts = {
    ...clientData,
    contacts:
      clientContacts?.map((c: any) => ({
        name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.name,
        first_name: c.first_name,
        last_name: c.last_name,
      })) || [],
  };

  // Fetch company details (for logo + seller footer)
  const { data: companyData } = await supabase
    .from('companies')
    .select('name,gstin,pan,logo_url')
    .eq('id', plan.company_id)
    .single();

  // Fallback: organization branding (some tenants store logo here)
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('logo_url,organization_name')
    .limit(1)
    .maybeSingle();

  const companyName = companyData?.name || (orgSettings as any)?.organization_name || options.companyName || 'Matrix Network Solutions';
  const companyGSTIN = companyData?.gstin || options.gstin || '36AATFM4107H2Z3';
  const companyPAN = companyData?.pan || 'AATFM4107H';

  const logoBase64 = await fetchAsDataUrl(companyData?.logo_url || (orgSettings as any)?.logo_url);

  const pointOfContact = getPrimaryContactName(clientWithContacts);

  const start = plan.start_date;
  const end = plan.end_date;
  const totalDays = plan.duration_days || Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));

  // Map items to 098-style format
  const items = (planItems || []).map((item: any, index: number) => {
    const monthlyRate = Number(item.sales_price || item.card_rate || 0);
    const printingCharge = Number(item.printing_charges || 0);
    const mountingCharge = Number(item.mounting_charges || 0);
    const itemDays = item.duration_days || totalDays;
    // Use full precision for pro-rata calculation, round only the final total
    const prorataCost = Math.round(((monthlyRate / 30) * itemDays + printingCharge + mountingCharge) * 100) / 100;

    // Build location code from media_asset_code or asset_id with company prefix
    const displayCode = formatAssetDisplayCode({
      mediaAssetCode: item.media_asset_code,
      fallbackId: item.asset_id,
      companyName: companyName,
    });
    const locationCode = displayCode 
      ? `[${displayCode}] ${item.location || ''}`.trim()
      : item.location || 'Display';

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
      unitPrice: monthlyRate,
      subtotal: prorataCost,
    };
  });

  // Calculate totals
  const totalPrinting = (planItems || []).reduce((sum: number, i: any) => sum + Number(i.printing_charges || 0), 0);
  const totalMounting = (planItems || []).reduce((sum: number, i: any) => sum + Number(i.mounting_charges || 0), 0);
  
  // Get GST breakdown (CGST + SGST each 9%)
  const gstTotal = Number(plan.gst_amount || 0);
  const cgst = Math.round(gstTotal / 2);
  const sgst = gstTotal - cgst; // Handle odd amounts
  const totalInr = Number(plan.grand_total || 0);
  const untaxedAmount = Math.max(0, totalInr - gstTotal);

  const docTitle = getDocumentHeading(options.optionType) as any;

  return generateStandardizedPDF({
    documentType: docTitle,
    documentNumber: plan.id,
    documentDate: formatDateToDDMonYY(plan.created_at || new Date().toISOString()),
    displayName: plan.plan_name || plan.id,
    pointOfContact,

    clientName: clientData?.name || plan.client_name || 'Client',
    clientAddress: [
      clientData?.billing_address_line1,
      clientData?.billing_address_line2,
    ].filter(Boolean).join(', ') || clientData?.address || '-',
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
    paymentTerms: '30 Net Days',
  });
}

// ============ FULL DETAIL FORMAT ============
function generateFullDetailPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  let yPos = 15;

  // Header Section - Left
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(12);
  doc.text(getDocumentHeading(options.optionType), 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || plan.client_name || '', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (client?.billing_address_line1) {
    doc.text(client.billing_address_line1, 15, yPos);
    yPos += 5;
  }
  if (client?.gst_number) {
    doc.text(`GSTIN: ${client.gst_number}`, 15, yPos);
    yPos += 5;
  }
  const cityStatePin = `${client?.billing_city || ''}, ${client?.billing_state || ''}, ${client?.billing_pincode || ''}`;
  doc.text(cityStatePin, 15, yPos);

  // Header Section - Right
  const rightX = pageWidth - 15;
  let rightY = 15;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Name : ${plan.plan_name}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  doc.text(`Doc No : ${plan.id}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const planDate = formatDateToDDMonYY(plan.created_at);
  doc.text(`Date : ${planDate}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const pocName = user?.full_name || 'N/A';
  doc.text(`Point of Contact : ${pocName}`, rightX, rightY, { align: 'right' });

  yPos += 15;

  // Summary of Charges Table
  const tableData: any[] = [];
  
  planItems.forEach((item) => {
    const startDate = formatDateToDDMonYY(item.start_date || plan.start_date);
    const endDate = formatDateToDDMonYY(item.end_date || plan.end_date);
    const days = plan.duration_days || 30;
    const monthlyRate = item.sales_price || item.card_rate || 0;
    // Use full precision for pro-rata, round only the result
    const proRataCost = Math.round(((monthlyRate / 30) * days) * 100) / 100;

    tableData.push([
      item.location || item.asset_id,
      startDate,
      endDate,
      days.toString(),
      `₹${monthlyRate.toLocaleString('en-IN')}`,
      `₹${Math.round(proRataCost).toLocaleString('en-IN')}`
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Start Date', 'End Date', 'Days', 'Monthly Rate', 'Cost']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', pageWidth - 70, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', pageWidth - 70, yPos);
}

// ============ WITH PHOTOS FORMAT ============
async function generateWithPhotosPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  let yPos = 15;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(getDocumentHeading(options.optionType), 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || plan.client_name || '', 15, yPos);

  // Right side info
  const rightX = pageWidth - 15;
  let rightY = 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Name : ${plan.plan_name}`, rightX, rightY, { align: 'right' });
  rightY += 5;
  doc.text(`Doc No : ${plan.id}`, rightX, rightY, { align: 'right' });

  yPos += 15;

  // Generate QR code
  try {
    const qrUrl = `${window.location.origin}/plans/${plan.id}/share`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 100, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 35, yPos - 10, 25, 25);
  } catch (e) {
    console.error('QR generation failed:', e);
  }

  yPos += 20;

  // Asset photos and details
  for (let i = 0; i < planItems.length; i++) {
    const item = planItems[i];
    
    if (yPos + 80 > pageHeight - 20) {
      doc.addPage();
      yPos = 15;
    }

    // Asset header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${item.location || item.asset_id || 'Media Asset'}`, 15, yPos);
    
    yPos += 8;

    // Try to load and add asset photo
    if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      const photoUrl = item.photos[0];
      try {
        // Handle both signed URLs and storage paths
        let imageUrl = photoUrl;
        if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
          // Extract bucket and path from storage path (e.g., "media-assets/asset-id/photo.jpg")
          const parts = photoUrl.split('/');
          const bucket = parts[0] || 'media-assets';
          const path = parts.slice(1).join('/') || photoUrl;
          const signedUrl = await getSignedUrl(bucket, path);
          imageUrl = signedUrl || photoUrl;
        }
        if (imageUrl) {
          const imageData = await loadImageAsDataUrl(imageUrl);
          if (imageData) {
            const watermarked = await addWatermarkToImage(imageData, item.location || 'Asset');
            doc.addImage(watermarked, 'JPEG', 15, yPos, 60, 45);
            yPos += 50;
          }
        }
      } catch (e) {
        console.error('Photo load failed:', e);
      }
    }

    // Asset details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Area: ${item.area || item.city || '-'}`, 80, yPos - 40);
    doc.text(`Media Type: ${item.media_type || '-'}`, 80, yPos - 35);
    doc.text(`Size: ${item.dimensions || '-'}`, 80, yPos - 30);
    doc.text(`Rate: ₹${(item.sales_price || item.card_rate || 0).toLocaleString('en-IN')}`, 80, yPos - 25);

    yPos += 10;
  }

  // Footer
  yPos = pageHeight - 25;
  doc.setFontSize(10);
  doc.text('For,', pageWidth - 70, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', pageWidth - 70, yPos);
}
