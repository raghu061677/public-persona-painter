// Classic Tax Invoice Template - Unified Professional Design
// Shares the same layout as Quotation and Proforma Invoice PDFs
// Uses shared sections from standardPDFTemplate for consistency

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';
import { renderInvoiceSummaryTable } from './summaryTableHelper';
import { ensurePdfUnicodeFont } from '@/lib/pdf/fontLoader';
import { formatCurrencyForPDF } from '@/lib/pdf/pdfHelpers';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';


// ============= CONSTANTS =============

const PAGE_MARGINS = {
  top: 20,
  left: 14,
  right: 14,
  bottom: 15,
};

const BANK_DETAILS = {
  bankName: 'HDFC Bank Limited',
  branch: 'Karkhana Road, Secunderabad',
  accountName: 'Matrix Network Solutions',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
};

const DEFAULT_ADDRESS = {
  line1: 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
  line2: 'Near Begumpet Metro Station, Opp Country Club, Begumpet,',
  cityLine: 'Hyderabad, Telangana 500016',
  phone: '+91 9666444888',
  email: 'raghu@matrix-networksolutions.com',
};

const DEFAULT_TERMS = [
  'Sites are subject to availability at the time of confirmation.',
  'Payment must be made before campaign start date unless otherwise agreed.',
  'Printing and mounting charges will be extra if applicable.',
  'In case of site unavailability due to government authority, an alternate site will be provided.',
  'Campaign proof photographs will be shared after installation.',
];

// ============= HELPERS =============

function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  return `Indian Rupees ${numberToWords(rupees)} Only`;
}

// Cache stamp and signature images
let cachedStampBase64: string | null = null;

async function loadImageAsBase64(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
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
}

async function loadStampImage(): Promise<string | undefined> {
  if (cachedStampBase64) return cachedStampBase64;
  cachedStampBase64 = (await loadImageAsBase64(stampImageUrl)) || null;
  return cachedStampBase64 || undefined;
}


// ============= HEADER RENDERERS =============

function renderFullHeader(
  doc: jsPDF,
  companyName: string,
  companyGSTIN: string,
  docTitle: string,
  logoBase64?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;

  let yPos = PAGE_MARGINS.top;
  let logoEndX = leftMargin;

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', leftMargin, yPos - 5, 25, 18);
      logoEndX = leftMargin + 28;
    } catch (e) {
      console.log('Logo rendering skipped:', e);
    }
  }

  // Company Name
  let companyY = yPos - 2;
  doc.setFontSize(12);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(companyName, logoEndX, companyY);

  // Address
  companyY += 4.5;
  doc.setFontSize(7);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(DEFAULT_ADDRESS.line1, logoEndX, companyY);
  companyY += 3;
  doc.text(DEFAULT_ADDRESS.line2, logoEndX, companyY);
  companyY += 3;
  doc.text(DEFAULT_ADDRESS.cityLine, logoEndX, companyY);
  companyY += 3;
  doc.text(`Phone: ${DEFAULT_ADDRESS.phone}  |  Email: ${DEFAULT_ADDRESS.email}`, logoEndX, companyY);

  if (companyGSTIN) {
    companyY += 3.5;
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, companyY);
  }

  const logoBottom = yPos + 18;
  const contentBottom = Math.max(logoBottom, companyY + 2);

  // Document Title (right-aligned)
  const rightX = pageWidth - rightMargin;
  const titleY = contentBottom + 6;
  doc.setFontSize(16);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(docTitle, rightX, titleY, { align: 'right' });

  // Divider
  const dividerY = titleY + 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, dividerY, pageWidth - rightMargin, dividerY);

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);

  return dividerY + 5;
}

function renderCompactHeader(
  doc: jsPDF,
  companyName: string,
  logoBase64?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;
  let yPos = PAGE_MARGINS.top;
  let logoEndX = leftMargin;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', leftMargin, yPos - 5, 18, 13);
      logoEndX = leftMargin + 21;
    } catch {
      logoEndX = leftMargin;
    }
  }

  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(companyName, logoEndX, yPos + 2);

  const dividerY = yPos + 10;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, dividerY, pageWidth - rightMargin, dividerY);

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);

  return dividerY + 5;
}

// ============= MAIN RENDERER =============

export async function renderClassicTaxTemplate(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  await ensurePdfUnicodeFont(doc);

  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';

  // Fetch logo
  let logoBase64 = data.logoBase64;
  if (!logoBase64 && data.company?.logo_url) {
    try {
      const res = await fetch(data.company.logo_url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {}
  }

  // ========== 1. HEADER ==========
  let yPos = renderFullHeader(doc, companyName, companyGSTIN, docTitle, logoBase64);
  yPos += 2;

  // ========== 2. BILL TO / SHIP TO ==========
  const colMidX = pageWidth / 2;
  const colWidth = contentWidth / 2 - 5;

  const billTo = {
    name: data.client.name || 'Client',
    address1: data.client.billing_address_line1 || data.client.address || '',
    address2: data.client.billing_address_line2 || '',
    city: data.client.billing_city || data.client.city || '',
    state: data.client.billing_state || data.client.state || '',
    pincode: data.client.billing_pincode || data.client.pincode || '',
    gstin: data.client.gst_number || '',
    contact: data.client.contact_person || '',
  };

  const hasShippingAddress = !!(data.client.shipping_address_line1 || data.client.shipping_city);
  const shipTo = {
    name: data.client.name || 'Client',
    address1: data.client.shipping_address_line1 || billTo.address1,
    city: data.client.shipping_city || billTo.city,
    state: data.client.shipping_state || billTo.state,
    pincode: data.client.shipping_pincode || billTo.pincode,
    gstin: billTo.gstin,
  };

  const boxHeight = 34;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, yPos, colWidth, boxHeight);
  doc.rect(colMidX + 2.5, yPos, colWidth, boxHeight);

  // Bill To Header
  doc.setFillColor(245, 245, 245);
  doc.rect(leftMargin, yPos, colWidth, 6, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To', leftMargin + 3, yPos + 4);

  // Ship To Header
  doc.setFillColor(245, 245, 245);
  doc.rect(colMidX + 2.5, yPos, colWidth, 6, 'F');
  doc.text('Ship To', colMidX + 5.5, yPos + 4);

  // Bill To Content
  let leftY = yPos + 10;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8);
  doc.text(billTo.name, leftMargin + 3, leftY);
  leftY += 4;
  doc.setFont('NotoSans', 'normal');
  if (billTo.address1) {
    const lines = doc.splitTextToSize(billTo.address1, colWidth - 8);
    lines.slice(0, 2).forEach((line: string) => { doc.text(line, leftMargin + 3, leftY); leftY += 3.5; });
  }
  const billCityState = [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ');
  if (billCityState) { doc.text(billCityState, leftMargin + 3, leftY); leftY += 3.5; }
  if (billTo.gstin) { doc.setFont('NotoSans', 'bold'); doc.text(`GSTIN: ${billTo.gstin}`, leftMargin + 3, leftY); leftY += 3.5; }
  if (billTo.contact) { doc.setFont('NotoSans', 'normal'); doc.text(`Contact: ${billTo.contact}`, leftMargin + 3, leftY); }

  // Ship To Content
  let rightY = yPos + 10;
  doc.setFont('NotoSans', 'bold');
  doc.text(shipTo.name, colMidX + 5.5, rightY);
  rightY += 4;
  doc.setFont('NotoSans', 'normal');
  if (shipTo.address1) {
    const lines = doc.splitTextToSize(shipTo.address1, colWidth - 8);
    lines.slice(0, 2).forEach((line: string) => { doc.text(line, colMidX + 5.5, rightY); rightY += 3.5; });
  }
  const shipCityState = [shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(', ');
  if (shipCityState) { doc.text(shipCityState, colMidX + 5.5, rightY); rightY += 3.5; }
  if (shipTo.gstin) { doc.setFont('NotoSans', 'bold'); doc.text(`GSTIN: ${shipTo.gstin}`, colMidX + 5.5, rightY); }

  if (!hasShippingAddress) {
    doc.setFontSize(6);
    doc.setFont('NotoSans', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('(Same as Bill To)', colMidX + 22, yPos + 4);
    doc.setTextColor(0, 0, 0);
  }

  yPos += boxHeight + 3;

  // ========== 3. INVOICE DETAILS / OTHER DETAILS ==========
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, yPos, colWidth, 28);
  doc.rect(colMidX + 2.5, yPos, colWidth, 28);

  // Left Header
  doc.setFillColor(245, 245, 245);
  doc.rect(leftMargin, yPos, colWidth, 6, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.text('Invoice Details', leftMargin + 3, yPos + 4);

  // Right Header
  doc.setFillColor(245, 245, 245);
  doc.rect(colMidX + 2.5, yPos, colWidth, 6, 'F');
  doc.text('Other Details', colMidX + 5.5, yPos + 4);

  // Left Content
  leftY = yPos + 11;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.text('Invoice #:', leftMargin + 3, leftY);
  doc.setFont('NotoSans', 'bold');
  doc.text(data.invoice.id || data.invoice.invoice_no || '-', leftMargin + 28, leftY);
  leftY += 5;
  doc.setFont('NotoSans', 'normal');
  doc.text('Date:', leftMargin + 3, leftY);
  doc.text(formatDate(data.invoice.invoice_date), leftMargin + 28, leftY);
  leftY += 5;
  doc.text('Due Date:', leftMargin + 3, leftY);
  doc.text(formatDate(data.invoice.due_date), leftMargin + 28, leftY);

  // Right Content
  rightY = yPos + 11;
  doc.setFont('NotoSans', 'normal');
  doc.text('Place of Supply:', colMidX + 5.5, rightY);
  doc.text(data.invoice.place_of_supply || 'Telangana (36)', colMidX + 32, rightY);
  rightY += 5;
  doc.text('Sales Person:', colMidX + 5.5, rightY);
  doc.text(data.invoice.sales_person || 'Sales Team', colMidX + 32, rightY);
  rightY += 5;
  doc.text('HSN/SAC:', colMidX + 5.5, rightY);
  doc.text(HSN_SAC_CODE, colMidX + 32, rightY);

  yPos += 31;

  // ========== 4. CAMPAIGN INFO ==========
  if (data.campaign?.campaign_name) {
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, yPos, contentWidth, 16);

    doc.setFillColor(245, 245, 245);
    doc.rect(leftMargin, yPos, contentWidth, 6, 'F');
    doc.setFontSize(9);
    doc.setFont('NotoSans', 'bold');
    doc.text('Campaign Details', leftMargin + 3, yPos + 4);

    let campY = yPos + 10;
    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 3, campY);

    if (data.campaign.start_date && data.campaign.end_date) {
      doc.text(`Period: ${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)}`, colMidX + 5.5, campY);
    }

    yPos += 19;
  }

  yPos += 3;

  // ========== 5. ITEMS TABLE (Unified 6-Column Format) ==========
  const tableStartY = Math.max(yPos, 90);

  const tableBody = data.items.map((item: any, index: number) => {
    const cityVal = item.city || '';
    const locationVal = item.location || item.description || '-';
    const directionVal = item.direction || '-';
    const areaVal = item.area || item.zone || '-';
    const mediaTypeVal = item.media_type || '-';
    const illuminationVal = item.illumination || item.illumination_type || '-';
    const dimensions = item.dimensions || item.dimension_text || item.size || item.dimension || '';
    const sqft = item.total_sqft || item.sqft || item.meta?.total_sqft || '';

    // Location & Description
    const displayLocation = cityVal && locationVal ? `${cityVal} – ${locationVal}` : locationVal || cityVal || '-';
    const locLines: string[] = [displayLocation];
    if (directionVal && directionVal !== '-') locLines.push(`Direction: ${directionVal}`);
    locLines.push(`Area: ${areaVal || '-'}`);
    const locationDesc = locLines.join('\n');

    // Media Specification
    const mediaSpec = [
      `Media Type: ${mediaTypeVal}`,
      dimensions ? `Size: ${dimensions}` : null,
      sqft ? `Sqft: ${sqft}` : null,
      illuminationVal && illuminationVal !== '-' ? `Illumination: ${illuminationVal}` : null,
      `HSN/SAC: ${item.hsn_sac || HSN_SAC_CODE}`,
    ].filter(Boolean).join('\n');

    // Booking Period
    const startDate = item.start_date || item.booking_start_date || data.campaign?.start_date;
    const endDate = item.end_date || item.booking_end_date || data.campaign?.end_date;
    let bookingDisplay = '-';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const durationStr = days >= 28 && days <= 31 ? '1 Month' : days > 31 ? `${Math.round(days / 30)} Months` : `${days} Days`;
      bookingDisplay = `Start: ${formatDate(startDate)}\nEnd: ${formatDate(endDate)}\nDuration: ${durationStr}`;
    }

    // Unit Price (Commercials)
    const baseRate = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || 0;
    const printingCost = item.printing_charges || item.printing_cost || 0;
    const mountingCost = item.mounting_charges || item.mounting_cost || 0;
    const commercials = [
      `Display: ${formatCurrency(baseRate)}`,
      `Printing: ${formatCurrency(printingCost)}`,
      `Mounting: ${formatCurrency(mountingCost)}`,
    ].join('\n');

    const itemTotal = item.amount || item.final_price || item.total || (baseRate + printingCost + mountingCost);

    return [
      (index + 1).toString(),
      locationDesc,
      mediaSpec,
      bookingDisplay,
      commercials,
      formatCurrency(itemTotal),
    ];
  });

  let currentPageCount = 1;

  autoTable(doc, {
    startY: tableStartY,
    head: [['S.No', 'LOCATION &\nDESCRIPTION', 'MEDIA\nSPECIFICATION', 'BOOKING\nPERIOD', 'COMMERCIALS', 'SUBTOTAL']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
      valign: 'top',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'middle' },
      1: { cellWidth: 52 },
      2: { cellWidth: 35, halign: 'left' },
      3: { cellWidth: 32, halign: 'left' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
    },
    margin: { top: 35, left: leftMargin, right: rightMargin, bottom: PAGE_MARGINS.bottom },
    tableWidth: contentWidth,
    rowPageBreak: 'avoid',
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 34, 'F');
        renderCompactHeader(doc, companyName, logoBase64);
      }
      currentPageCount = hookData.pageNumber;
    },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== 6. BANK DETAILS + FINANCIAL SUMMARY (Side by Side) ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || 0;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;
  const isInterState = data.invoice.tax_type === 'igst';
  const gstPercent = parseFloat(data.invoice.gst_percent) || 18;
  const cgst = isInterState ? 0 : gstAmount / 2;
  const sgst = isInterState ? 0 : gstAmount / 2;

  // Check if we need a new page for summary + footer sections
  const availableSpace = pageHeight - yPos - PAGE_MARGINS.bottom;
  if (availableSpace < 90) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
  }

  // LEFT: Bank Details (beside financial summary)
  const bankStartY = yPos;
  
  // Bank Details border box
  const bankBoxWidth = contentWidth * 0.48;
  const bankBoxHeight = 38;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, bankStartY, bankBoxWidth, bankBoxHeight, 'S');

  // Bank Details title in blue
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 64, 175); // #1E40AF
  doc.text('Bank Details', leftMargin + 4, bankStartY + 6);

  // Bank details content
  let bankY = bankStartY + 12;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text(`Bank: ${BANK_DETAILS.bankName}`, leftMargin + 4, bankY);
  bankY += 5;
  doc.text(`Branch: ${BANK_DETAILS.branch}`, leftMargin + 4, bankY);
  bankY += 5;
  doc.text(`A/C No: ${BANK_DETAILS.accountNo}`, leftMargin + 4, bankY);
  bankY += 5;
  doc.text(`IFSC: ${BANK_DETAILS.ifsc}`, leftMargin + 4, bankY);

  // RIGHT: Boxed Summary Table (matching Quotation/RO style)
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;

  const summaryEndY = renderInvoiceSummaryTable({
    doc,
    x: totalsBoxX,
    y: bankStartY,
    width: totalsBoxWidth,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    balanceDue,
    isInterState,
  });

  yPos = Math.max(bankStartY + bankBoxHeight, summaryEndY) + 8;

  // ========== 7. HSN/SAC SUMMARY ==========
  if (yPos > pageHeight - 50) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
  }

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('HSN/SAC Summary:', leftMargin, yPos + 4);

  const hsnHead = isInterState
    ? [['HSN/SAC', 'Taxable Amount', 'IGST Rate', 'IGST Amount', 'Total Tax']]
    : [['HSN/SAC', 'Taxable Amount', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Tax']];

  const hsnBody = isInterState
    ? [[HSN_SAC_CODE, formatCurrency(subtotal), `${gstPercent}%`, formatCurrency(gstAmount), formatCurrency(gstAmount)]]
    : [[
        HSN_SAC_CODE, formatCurrency(subtotal),
        `${gstPercent / 2}%`, formatCurrency(cgst),
        `${gstPercent / 2}%`, formatCurrency(sgst),
        formatCurrency(gstAmount),
      ],
      [
        { content: 'Total', styles: { fontStyle: 'bold' as const } },
        { content: formatCurrency(subtotal), styles: { fontStyle: 'bold' as const } },
        '',
        { content: formatCurrency(cgst), styles: { fontStyle: 'bold' as const } },
        '',
        { content: formatCurrency(sgst), styles: { fontStyle: 'bold' as const } },
        { content: formatCurrency(gstAmount), styles: { fontStyle: 'bold' as const } },
      ]];

  autoTable(doc, {
    startY: yPos + 6,
    head: hsnHead,
    body: hsnBody,
    theme: 'grid',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: 255,
      fontSize: 6.5,
      halign: 'center',
      font: 'NotoSans',
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
      font: 'NotoSans',
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.2,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // ========== 8. SIGNATURE (right side - stamp only, no line/box) ==========
  if (yPos > pageHeight - 65) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
  }

  const signBlockWidth = 55;
  const signX = pageWidth - rightMargin - signBlockWidth;
  const signCenterX = signX + signBlockWidth / 2;

  // "For," text
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('For,', signCenterX, yPos, { align: 'center' });

  // Company name (bold)
  doc.setFont('NotoSans', 'bold');
  doc.text(companyName, signCenterX, yPos + 5, { align: 'center' });

  // Stamp image (centered)
  const stampBase64 = await loadStampImage();
  if (stampBase64) {
    try {
      const stampSize = 28;
      doc.addImage(stampBase64, 'PNG', signCenterX - stampSize / 2, yPos + 8, stampSize, stampSize);
    } catch {}
  }

  // "Authorized Signatory" label only once
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', signCenterX, yPos + 40, { align: 'center' });

  yPos = yPos + 45;

  // Check page space for terms
  if (yPos > pageHeight - 40) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
  }

  // ========== 9. TERMS & CONDITIONS ==========
  const termsToUse = DEFAULT_TERMS;
  const termsHeight = termsToUse.length * 6 + 10;
  if (yPos + termsHeight > pageHeight - PAGE_MARGINS.bottom) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
  }

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions:', leftMargin, yPos);
  yPos += 6;

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);
  termsToUse.forEach((term, idx) => {
    if (yPos + 8 > pageHeight - PAGE_MARGINS.bottom) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 34, 'F');
      yPos = renderCompactHeader(doc, companyName, logoBase64) + 10;
    }
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, contentWidth);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 3.8;
    });
    yPos += 1.5;
  });

  return doc.output('blob');
}
