import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storage';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';
import { addWatermarkToImage, loadImageAsDataUrl } from './photoWatermark';

interface ExportData {
  plan: any;
  planItems: any[];
  options: ExportOptions;
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

// Get document number label
function getDocNumberLabel(optionType: string): string {
  const labels: Record<string, string> = {
    quotation: 'Quotation No',
    estimate: 'Estimate No',
    proforma_invoice: 'PI No',
    work_order: 'WO No',
  };
  return labels[optionType] || 'Doc No';
}

// Get document date label
function getDocDateLabel(optionType: string): string {
  const labels: Record<string, string> = {
    quotation: 'Quotation Date',
    estimate: 'Estimate Date',
    proforma_invoice: 'PI Date',
    work_order: 'WO Date',
  };
  return labels[optionType] || 'Date';
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

  // For Quotation / Estimate / Work Order / Proforma, use the standardized finance template
  // (logo header + authorized signatory + unicode-safe currency + consistent layout).
  const { generateStandardizedPDF, formatDateToDDMonYY } = await import('@/lib/pdf/standardPDFTemplate');
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

  const companyName = companyData?.name || (orgSettings as any)?.organization_name || options.companyName || 'Company';
  const companyGSTIN = companyData?.gstin || options.gstin || '';
  const companyPAN = companyData?.pan || '';

  const logoBase64 = await fetchAsDataUrl(companyData?.logo_url || (orgSettings as any)?.logo_url);

  const pointOfContact = getPrimaryContactName(clientWithContacts);

  const start = plan.start_date;
  const end = plan.end_date;
  const days = plan.duration_days || Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));

  const items = (planItems || []).map((item: any, index: number) => {
    const monthlyRate = Number(item.sales_price || item.card_rate || 0);
    const prorataCost = Math.round((monthlyRate / 30) * days);

    // Clean description - single line only
    const description = (item.location || item.asset_id || 'Display').replace(/\n/g, ' ').trim();

    return {
      sno: index + 1,
      area: item.area || item.city || '-',
      description,
      mediaType: item.media_type || '-',
      dimension: item.dimensions || undefined,
      sqft: item.total_sqft || undefined,
      illuminationType: item.illumination_type || undefined,
      startDate: formatDateToDDMonYY(item.start_date || start),
      endDate: formatDateToDDMonYY(item.end_date || end),
      days,
      monthlyRate,
      cost: prorataCost,
    };
  });

  const totalPrinting = (planItems || []).reduce((sum: number, i: any) => sum + Number(i.printing_charges || 0), 0);
  const totalMounting = (planItems || []).reduce((sum: number, i: any) => sum + Number(i.mounting_charges || 0), 0);
  const installationCost = totalPrinting + totalMounting;

  let snoCounter = items.length;

  if (totalPrinting > 0) {
    snoCounter++;
    items.push({
      sno: snoCounter,
      area: '-',
      description: 'Printing Charges',
      mediaType: '-',
      startDate: '-',
      endDate: '-',
      days: 0,
      monthlyRate: 0,
      cost: totalPrinting,
    } as any);
  }

  if (totalMounting > 0) {
    snoCounter++;
    items.push({
      sno: snoCounter,
      area: '-',
      description: 'Mounting Charges',
      mediaType: '-',
      startDate: '-',
      endDate: '-',
      days: 0,
      monthlyRate: 0,
      cost: totalMounting,
    } as any);
  }

  const docTitle = getDocumentHeading(options.optionType) as any;

  // Keep the current plan totals as source-of-truth
  const gst = Number(plan.gst_amount || 0);
  const totalInr = Number(plan.grand_total || 0);
  const baseBeforeGst = Math.max(0, totalInr - gst);
  const displayCost = Math.max(0, baseBeforeGst - installationCost);

  return generateStandardizedPDF({
    documentType: docTitle,
    documentNumber: plan.id,
    documentDate: formatDateToDDMonYY(plan.created_at || new Date().toISOString()),
    displayName: plan.plan_name || plan.id,
    pointOfContact,

    clientName: clientData?.name || plan.client_name || 'Client',
    clientAddress: clientData?.billing_address_line1 || clientData?.address || '-',
    clientCity: clientData?.billing_city || clientData?.city || '',
    clientState: clientData?.billing_state || clientData?.state || '',
    clientPincode: clientData?.billing_pincode || '',
    clientGSTIN: clientData?.gst_number || undefined,

    companyName,
    companyGSTIN,
    companyPAN,
    companyLogoBase64: logoBase64,

    items,
    displayCost,
    installationCost,
    gst,
    totalInr,
    terms: options.termsAndConditions,
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
  doc.text(`${getDocNumberLabel(options.optionType)} : ${plan.id}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const planDate = formatDateToDDMonYY(plan.created_at);
  doc.text(`${getDocDateLabel(options.optionType)} : ${planDate}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const pocName = user?.full_name || 'N/A';
  doc.text(`Point of Contact : ${pocName}`, rightX, rightY, { align: 'right' });

  // Company GSTIN and PAN
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${options.gstin || '36AATFM4107H2Z3'}`, 15, yPos);
  yPos += 5;
  doc.text(`PAN: ${options.gstin?.substring(2, 12) || 'AATFM4107H'}`, 15, yPos);

  yPos += 10;

  // Summary of Charges Table
  const tableData: any[] = [];
  
  planItems.forEach((item) => {
    const startDate = formatDateToDDMonYY(item.start_date || plan.start_date);
    const endDate = formatDateToDDMonYY(item.end_date || plan.end_date);
    const days = plan.duration_days || 30;
    const monthlyRate = item.sales_price || item.card_rate || 0;
    const proRataCost = (monthlyRate / 30) * days;

    tableData.push([
      item.location || item.asset_id,
      startDate,
      endDate,
      days.toString(),
      `₹${monthlyRate.toLocaleString('en-IN')}`,
      `₹${Math.round(proRataCost).toLocaleString('en-IN')}`
    ]);
  });

  // Add printing and mounting rows if needed
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  
  if (totalPrinting > 0) {
    const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
    const printRate = totalSqft > 0 ? Math.round(totalPrinting / totalSqft) : 0;
    tableData.push([
      `Printing ${Math.round(totalSqft)} SQFT @ ${printRate}RS`,
      '',
      '',
      '',
      '',
      `₹${totalPrinting.toLocaleString('en-IN')}`
    ]);
  }
  
  if (totalMounting > 0) {
    const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
    const mountRate = totalSqft > 0 ? Math.round(totalMounting / totalSqft) : 0;
    tableData.push([
      `Mounting ${Math.round(totalSqft)} SQFT @ ${mountRate}RS`,
      '',
      '',
      '',
      '',
      `₹${totalMounting.toLocaleString('en-IN')}`
    ]);
  }

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
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
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
  yPos = doc.lastAutoTable.finalY + 5;

  // Totals Section (Right Aligned)
  const totalsX = pageWidth - 15;
  const displayCost = plan.grand_total - plan.gst_amount;
  const installationCost = totalPrinting + totalMounting;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Cost :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(displayCost - installationCost).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`Installation Cost :`, totalsX - 50, yPos);
  doc.text(`₹${installationCost.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`GST (18%) :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total in INR :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });

  yPos += 15;

  // Terms & Conditions
  if (yPos + 60 > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const termsStartY = yPos - 3;
  const termsHeight = options.termsAndConditions.length * 4.5 + 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);
  
  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 18, yPos);
    yPos += 4.5;
  });

  // Footer
  yPos = pageHeight - 25;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
}

// ============ COMPACT FORMAT ============
function generateCompactPDF(
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

  // Same header as Full Detail
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

  // Right side meta
  const rightX = pageWidth - 15;
  let rightY = 15;
  doc.setFontSize(9);
  doc.text(`Display Name : ${plan.plan_name}`, rightX, rightY, { align: 'right' });
  rightY += 5;
  doc.text(`${getDocNumberLabel(options.optionType)} : ${plan.id}`, rightX, rightY, { align: 'right' });
  rightY += 5;
  doc.text(`${getDocDateLabel(options.optionType)} : ${formatDateToDDMonYY(plan.created_at)}`, rightX, rightY, { align: 'right' });

  yPos += 10;

  // Compact Table: Description | Period | Days | Amount
  const compactData: any[] = [];
  const groupedItems: Record<string, any[]> = {};
  
  // Group by similar rate and dates
  planItems.forEach(item => {
    const key = `${item.sales_price}_${item.start_date}_${item.end_date}`;
    if (!groupedItems[key]) {
      groupedItems[key] = [];
    }
    groupedItems[key].push(item);
  });

  Object.values(groupedItems).forEach(group => {
    const count = group.length;
    const firstItem = group[0];
    const startDate = formatDateToDDMonYY(firstItem.start_date || plan.start_date);
    const endDate = formatDateToDDMonYY(firstItem.end_date || plan.end_date);
    const days = plan.duration_days || 30;
    const unitCost = ((firstItem.sales_price || 0) / 30) * days;
    const totalCost = unitCost * count;

    compactData.push([
      `${count} x ${firstItem.media_type || 'Media'}`,
      `${startDate} - ${endDate}`,
      days.toString(),
      `₹${Math.round(totalCost).toLocaleString('en-IN')}`
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Period', 'Days', 'Amount']],
    body: compactData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // Compact Totals
  const totalsX = pageWidth - 15;
  const displayCost = plan.grand_total - plan.gst_amount;
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const installationCost = totalPrinting + totalMounting;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Cost:`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(displayCost - installationCost).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Printing:`, totalsX - 45, yPos);
  doc.text(`₹${totalPrinting.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Installation:`, totalsX - 45, yPos);
  doc.text(`₹${totalMounting.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`GST (18%):`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total:`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });

  yPos += 12;

  // Compact Terms (smaller font, tighter spacing)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const termsStartY = yPos - 2;
  const termsHeight = options.termsAndConditions.length * 3.5 + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);

  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 17, yPos, { maxWidth: pageWidth - 35 });
    yPos += 3.5;
  });

  // Footer
  yPos = pageHeight - 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
}

// ============ SUMMARY ONLY FORMAT ============
function generateSummaryOnlyPDF(
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
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  yPos += 6;
  doc.setFontSize(12);
  doc.text(`${getDocumentHeading(options.optionType)} - SUMMARY`, 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${client?.name || plan.client_name}`, 15, yPos);
  yPos += 5;
  doc.text(`Plan: ${plan.plan_name}`, 15, yPos);
  yPos += 5;
  doc.text(`Period: ${formatDateToDDMonYY(plan.start_date)} - ${formatDateToDDMonYY(plan.end_date)}`, 15, yPos);

  yPos += 15;

  // Summary Table
  const totalInventories = planItems.length;
  const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const displayCost = plan.grand_total - plan.gst_amount - totalPrinting - totalMounting;

  const summaryData = [
    ['Total Inventories', totalInventories.toString()],
    ['Total SQFT', Math.round(totalSqft).toLocaleString('en-IN')],
    ['Display Cost', `₹${Math.round(displayCost).toLocaleString('en-IN')}`],
    ['Printing Cost', `₹${totalPrinting.toLocaleString('en-IN')}`],
    ['Installation Cost', `₹${totalMounting.toLocaleString('en-IN')}`],
    ['GST (18%)', `₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`],
    ['Grand Total', `₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80, fillColor: [245, 245, 245] },
      1: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: 15, right: pageWidth - 175 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // Terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const termsStartY = yPos - 2;
  const termsHeight = options.termsAndConditions.length * 3.5 + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);

  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 17, yPos, { maxWidth: pageWidth - 35 });
    yPos += 3.5;
  });

  // Footer
  yPos = pageHeight - 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
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
  // First generate the full detail document
  generateFullDetailPDF(doc, plan, planItems, client, user, options, pageWidth, pageHeight);

  // Add new page for photos
  doc.addPage();
  let yPos = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Execution Photos', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Fetch campaign assets with photos and metadata
  const { data: campaignAssets } = await supabase
    .from('campaign_assets')
    .select('asset_id, area, location, city, media_type, latitude, longitude, photos, mounter_name, completed_at')
    .eq('campaign_id', plan.id);

  // Fetch plan items to get asset details
  const { data: planItemsData } = await supabase
    .from('plan_items')
    .select(`
      asset_id,
      media_assets!inner(
        dimensions,
        illumination
      )
    `)
    .eq('plan_id', plan.id);

  const assetDetailsMap = new Map();
  planItemsData?.forEach((item: any) => {
    assetDetailsMap.set(item.asset_id, item.media_assets);
  });

  if (campaignAssets && campaignAssets.length > 0) {
    // Add title page for photo section
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CAMPAIGN EXECUTION PHOTOS', pageWidth / 2, 30, { align: 'center' });
    
    for (const asset of campaignAssets) {
      doc.addPage();
      yPos = 20;
      
      const assetDetails = assetDetailsMap.get(asset.asset_id);
      
      // ======= ASSET HEADER SECTION =======
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, pageWidth - 30, 20, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${asset.asset_id} – ${asset.location}`, pageWidth / 2, yPos + 8, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const subtitle = `${asset.area}, ${assetDetails?.dimensions || 'N/A'}, ${assetDetails?.illumination_type || 'N/A'}`;
      doc.text(subtitle, pageWidth / 2, yPos + 14, { align: 'center' });
      
      // ======= QR CODE SECTION =======
      try {
        let qrCodeUrl = '';
        if (asset.latitude && asset.longitude) {
          qrCodeUrl = `https://www.google.com/maps/?q=${asset.latitude},${asset.longitude}`;
        } else {
          qrCodeUrl = `https://go-ads.app/site/${asset.asset_id}`;
        }
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        
        doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 35, yPos + 2, 18, 18);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.text('Scan for Location', pageWidth - 26, yPos + 21, { align: 'center' });
      } catch (error) {
        console.error('QR code generation error:', error);
      }
      
      yPos += 30;
      
      // ======= PHOTO GRID SECTION (2x2) =======
      const photos = asset.photos as any;
      if (photos) {
        const photoTypes = ['newspaper', 'geotag', 'traffic1', 'traffic2'];
        const photoLabels = ['Newspaper Photo', 'Geo-tag Photo', 'Traffic Shot 1', 'Traffic Shot 2'];
        
        const gridSize = 80;
        const spacing = 10;
        const startX = 15;
        let xPos = startX;
        let gridYPos = yPos;
        
        for (let i = 0; i < photoTypes.length; i++) {
          const photoUrl = photos[photoTypes[i]];
          const col = i % 2;
          const row = Math.floor(i / 2);
          
          xPos = startX + col * (gridSize + spacing);
          gridYPos = yPos + row * (gridSize + 12);
          
          if (photoUrl) {
            try {
              // Get signed URL if it's a storage path
              let imageUrl = photoUrl;
              if (photoUrl.startsWith('campaign-proofs/')) {
                const signedUrl = await getSignedUrl('campaign-proofs', photoUrl, 3600);
                if (signedUrl) imageUrl = signedUrl;
              }
              
              // Add watermark and load image
              const watermarkedImage = await addWatermarkToImage(imageUrl);
              
              // Add image to PDF
              doc.addImage(watermarkedImage, 'JPEG', xPos, gridYPos, gridSize, gridSize);
              
              // Add border
              doc.setDrawColor(220, 220, 220);
              doc.setLineWidth(0.5);
              doc.rect(xPos, gridYPos, gridSize, gridSize);
            } catch (error) {
              console.error('Error loading photo:', error);
              // Draw placeholder on error
              doc.setFillColor(245, 245, 245);
              doc.rect(xPos, gridYPos, gridSize, gridSize, 'F');
              doc.setDrawColor(200, 200, 200);
              doc.rect(xPos, gridYPos, gridSize, gridSize);
            }
          } else {
            // Empty placeholder
            doc.setFillColor(250, 250, 250);
            doc.rect(xPos, gridYPos, gridSize, gridSize, 'F');
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.rect(xPos, gridYPos, gridSize, gridSize);
          }
          
          // Photo label
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(photoLabels[i], xPos + gridSize / 2, gridYPos + gridSize + 5, { align: 'center' });
        }
        
        yPos += 2 * (gridSize + 12) + 10;
      }
      
      // ======= PHOTO METADATA SECTION =======
      doc.setFillColor(250, 250, 250);
      doc.rect(15, yPos, pageWidth - 30, 30, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(15, yPos, pageWidth - 30, 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PHOTO METADATA', 20, yPos + 7);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      const metaY = yPos + 14;
      const leftCol = 20;
      const rightCol = 110;
      
      // GPS Location
      doc.setFont('helvetica', 'bold');
      doc.text('GPS Location:', leftCol, metaY);
      doc.setFont('helvetica', 'normal');
      const gpsText = asset.latitude && asset.longitude 
        ? `${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`
        : 'Not available';
      doc.text(gpsText, leftCol + 25, metaY);
      
      // Timestamp
      doc.setFont('helvetica', 'bold');
      doc.text('Timestamp:', rightCol, metaY);
      doc.setFont('helvetica', 'normal');
      const timestamp = asset.completed_at 
        ? new Date(asset.completed_at).toLocaleString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true 
          })
        : 'N/A';
      doc.text(timestamp, rightCol + 20, metaY);
      
      // Uploaded By
      doc.setFont('helvetica', 'bold');
      doc.text('Uploaded By:', leftCol, metaY + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(asset.mounter_name || 'Operations Team', leftCol + 25, metaY + 7);
      
      // Device (placeholder)
      doc.setFont('helvetica', 'bold');
      doc.text('Device:', rightCol, metaY + 7);
      doc.setFont('helvetica', 'normal');
      doc.text('Mobile Camera', rightCol + 20, metaY + 7);
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Work Order – Photo Proof', pageWidth - 20, pageHeight - 10, { align: 'right' });
      doc.text(`Page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`, 20, pageHeight - 10);
    }
  } else {
    doc.addPage();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No campaign execution photos available yet.', pageWidth / 2, 40, { align: 'center' });
  }
}
