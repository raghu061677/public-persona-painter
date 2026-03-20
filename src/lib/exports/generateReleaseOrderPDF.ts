import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfUnicodeFont } from '@/lib/pdf/fontLoader';
import { formatCurrencyForPDF } from '@/lib/pdf/pdfHelpers';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';
import { getDurationDisplay } from '@/lib/utils/campaignDuration';
import { renderApprovalFooter } from '@/lib/pdf/sections/approvalFooter';

// ============= INTERFACES =============

export interface ROData {
  planId: string;
  planName: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  city?: string;

  // Client (Issued By)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;
  clientContactPerson: string;
  clientPhone?: string;
  clientEmail?: string;

  // Company (Service Provider)
  companyName: string;
  companyAddress: string;
  companyGSTIN: string;
  companyLogoBase64?: string;

  // Line items
  items: ROLineItem[];

  // Totals
  subTotal: number;
  totalPrinting: number;
  totalMounting: number;
  cgst: number;
  sgst: number;
  grandTotal: number;

  // Terms
  terms?: string[];

  // Stamp image as base64 data URL
  stampImageBase64?: string;
}

export interface ROLineItem {
  sno: number;
  // Location & Description
  city: string;
  location: string;
  direction: string;
  area: string;
  // Media Specification
  mediaType: string;
  dimension: string;
  totalSqft: number;
  illumination: string;
  // Booking Period
  startDate: string;
  endDate: string;
  duration: string;
  // Commercials
  rate: number;        // Display cost (pro-rata rent)
  printingCost: number;
  mountingCost: number;
  // Total
  amount: number;      // Line item total (rate + printing + mounting)
  // Legacy (kept for backward compat)
  assetCode?: string;
}

// ============= CONSTANTS =============

const MARGINS = { top: 15, left: 14, right: 14, bottom: 15 };

const SERVICE_PROVIDER = {
  name: 'Matrix Network Solutions',
  address: [
    'H.No: 7-1-19/5/201',
    'Jyothi Bhopal Apartments',
    'Near Begumpet Metro Station',
    'Opp Country Club, Begumpet',
    'Hyderabad – 500016',
  ],
  gstin: '36AATFM4107H2Z3',
};

import { STANDARD_SHORT_TERMS, renderTermsBoxPDF as renderStdTermsBox } from '@/lib/terms/standardTerms';

// ============= HELPERS =============

function formatDateDD_MM_YYYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '-';
  }
}


function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
  let words = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = Math.floor(num / 100); num %= 100;
  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  if (num > 0) {
    if (words !== '') words += 'And ';
    if (num < 20) words += ones[num];
    else { words += tens[Math.floor(num / 10)]; if (num % 10 > 0) words += '-' + ones[num % 10]; }
  }
  return words.trim();
}

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

// ============= MAIN GENERATOR =============

export async function generateReleaseOrderPDF(data: ROData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGINS.left - MARGINS.right;

  await ensurePdfUnicodeFont(doc);

  // Load stamp image
  let stampBase64 = data.stampImageBase64;
  if (!stampBase64) {
    stampBase64 = await loadImageAsBase64(stampImageUrl);
  }

  let yPos = MARGINS.top;

  // ========== HEADER ==========
  yPos = renderROHeader(doc, data, pageWidth, yPos);

  // ========== SECTION 1: ISSUED BY (CLIENT) ==========
  yPos = renderIssuedBySection(doc, data, pageWidth, yPos);

  // ========== SECTION 2: SERVICE PROVIDER ==========
  yPos = renderServiceProviderSection(doc, data, pageWidth, yPos);

  // ========== SECTION 3: CAMPAIGN ASSET TABLE ==========
  yPos = renderAssetTable(doc, data, pageWidth, yPos);

  // ========== SECTION 4: COMMERCIAL SUMMARY ==========
  yPos = renderCommercialSummary(doc, data, pageWidth, yPos);

  // ========== SECTION 5: TERMS & CONDITIONS ==========
  yPos = renderTermsSection(doc, data, pageWidth, pageHeight, yPos);

  // ========== SECTION 6: APPROVAL & SIGNATORY (Reusable Two-Box Layout) ==========
  if (yPos + 60 > pageHeight - MARGINS.bottom) {
    doc.addPage();
    yPos = MARGINS.top;
  }

  yPos = await renderApprovalFooter(doc, yPos, {
    companyName: data.companyName || SERVICE_PROVIDER.name,
    leftTitle: 'Issued By (Client)',
    stampBase64,
    pageWidth,
    leftMargin: MARGINS.left,
    rightMargin: MARGINS.right,
  });

  return doc.output('blob');
}

// ============= SECTION RENDERERS =============

function renderROHeader(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Company logo (if available)
  let logoBottomY = yPos;
  if (data.companyLogoBase64) {
    try {
      doc.addImage(data.companyLogoBase64, 'PNG', leftMargin, yPos, 20, 15);
      logoBottomY = yPos + 15;
    } catch { /* ignore */ }
  }

  const headerX = data.companyLogoBase64 ? leftMargin + 24 : leftMargin;

  // Title
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175); // Deep Blue
  doc.text('RELEASE ORDER (RO)', headerX, yPos + 6);

  // Company name below title
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.companyName || SERVICE_PROVIDER.name, headerX, yPos + 11);

  // Horizontal line below logo/title block
  yPos = Math.max(logoBottomY, yPos + 14) + 2;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.line(leftMargin, yPos, rightEdge, yPos);
  yPos += 5;

  // Document details - Row 1: RO No, Date, City
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'bold');

  const detailsCol1X = leftMargin;
  const detailsCol2X = leftMargin + 90;
  const labelOffset = 38;

  doc.text('Release Order No:', detailsCol1X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(`RO-${data.planId}`, detailsCol1X + labelOffset, yPos);

  doc.setFont('NotoSans', 'bold');
  doc.text('Date:', detailsCol2X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(formatDateDD_MM_YYYY(data.createdAt), detailsCol2X + 12, yPos);

  yPos += 5;

  // Row 2: Campaign name (full width)
  doc.setFont('NotoSans', 'bold');
  doc.text('Campaign:', detailsCol1X, yPos);
  doc.setFont('NotoSans', 'normal');
  const campaignName = data.planName || data.planId;
  // Truncate to fit available width
  const maxCampaignWidth = rightEdge - detailsCol1X - labelOffset - 2;
  const campaignLines = doc.splitTextToSize(campaignName, maxCampaignWidth);
  doc.text(campaignLines[0], detailsCol1X + labelOffset, yPos);

  yPos += 5;

  // Row 3: Period, City
  doc.setFont('NotoSans', 'bold');
  doc.text('Period:', detailsCol1X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(`${formatDateDD_MM_YYYY(data.startDate)} to ${formatDateDD_MM_YYYY(data.endDate)}`, detailsCol1X + labelOffset, yPos);

  doc.setFont('NotoSans', 'bold');
  doc.text('City:', detailsCol2X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.city || '-', detailsCol2X + 12, yPos);

  yPos += 8;
  return yPos;
}

function renderIssuedBySection(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const boxWidth = (rightEdge - leftMargin);

  // Section header
  doc.setFillColor(240, 245, 255); // Light blue background
  doc.rect(leftMargin, yPos, boxWidth, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('SECTION 1: ISSUED BY (CLIENT / AGENCY)', leftMargin + 3, yPos + 5);
  yPos += 10;

  // Client details in a bordered box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const boxStartY = yPos;
  
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const labelX = leftMargin + 3;
  const valueX = leftMargin + 40;

  const drawField = (label: string, value: string) => {
    doc.setFont('NotoSans', 'bold');
    doc.text(label, labelX, yPos);
    doc.setFont('NotoSans', 'normal');
    doc.text(value || '-', valueX, yPos);
    yPos += 5;
  };

  drawField('Company:', data.clientName);
  
  const fullAddress = [data.clientAddress, data.clientCity, data.clientState, data.clientPincode].filter(Boolean).join(', ');
  drawField('Address:', fullAddress.substring(0, 80));
  if (fullAddress.length > 80) {
    doc.text(fullAddress.substring(80), valueX, yPos);
    yPos += 5;
  }
  
  drawField('GSTIN:', data.clientGSTIN || 'N/A');
  drawField('Contact:', data.clientContactPerson);
  
  if (data.clientPhone) drawField('Mobile:', data.clientPhone);
  if (data.clientEmail) drawField('Email:', data.clientEmail);

  // Draw box
  doc.rect(leftMargin, boxStartY - 3, boxWidth, yPos - boxStartY + 5, 'S');
  yPos += 5;
  return yPos;
}

function renderServiceProviderSection(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const boxWidth = rightEdge - leftMargin;

  // Section header
  doc.setFillColor(240, 255, 245); // Light green background
  doc.rect(leftMargin, yPos, boxWidth, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('SECTION 2: SERVICE PROVIDER (MEDIA OWNER)', leftMargin + 3, yPos + 5);
  yPos += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const boxStartY = yPos;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const labelX = leftMargin + 3;
  const valueX = leftMargin + 40;

  doc.setFont('NotoSans', 'bold');
  doc.text('Company:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.companyName || SERVICE_PROVIDER.name, valueX, yPos);
  yPos += 5;

  doc.setFont('NotoSans', 'bold');
  doc.text('Address:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  
  const address = data.companyAddress || SERVICE_PROVIDER.address.join(', ');
  const addressLines = doc.splitTextToSize(address, pageWidth - valueX - MARGINS.right);
  addressLines.forEach((line: string) => {
    doc.text(line, valueX, yPos);
    yPos += 4.5;
  });

  doc.setFont('NotoSans', 'bold');
  doc.text('GSTIN:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.companyGSTIN || SERVICE_PROVIDER.gstin, valueX, yPos);
  yPos += 5;

  doc.rect(leftMargin, boxStartY - 3, boxWidth, yPos - boxStartY + 3, 'S');
  yPos += 5;
  return yPos;
}

function renderAssetTable(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Section header
  doc.setFillColor(245, 245, 250);
  doc.rect(leftMargin, yPos, rightEdge - leftMargin, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('SECTION 3: MEDIA RELEASE DETAILS', leftMargin + 3, yPos + 5);
  yPos += 10;

  const tableBody = data.items.map(item => {
    // Column 2: Location & Description
    const locationDesc = [
      `${item.city || ''} - ${item.location || ''}`.replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '') || '-',
      item.direction ? `Direction: ${item.direction}` : null,
      item.area ? `Area: ${item.area}` : null,
    ].filter(Boolean).join('\n');

    // Column 3: Media Specification
    const mediaSpec = [
      `Media Type: ${item.mediaType || '-'}`,
      `Size: ${item.dimension || '-'}`,
      `Area: ${item.totalSqft || 0} Sqft`,
      `Illumination: ${item.illumination || 'Non-Lit'}`,
    ].join('\n');

    // Column 4: Booking Period
    const bookingPeriod = [
      `Start: ${item.startDate}`,
      `End: ${item.endDate}`,
      `Duration: ${item.duration}`,
    ].join('\n');

    // Column 5: Commercials
    const commercials = [
      `Display: ${formatCurrencyForPDF(item.rate)}`,
      `Printing: ${formatCurrencyForPDF(item.printingCost)}`,
      `Mounting: ${formatCurrencyForPDF(item.mountingCost)}`,
    ].join('\n');

    return [
      String(item.sno),
      locationDesc,
      mediaSpec,
      bookingPeriod,
      commercials,
      formatCurrencyForPDF(item.amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      'S.No',
      'LOCATION & DESCRIPTION',
      'MEDIA SPECIFICATION',
      'BOOKING PERIOD',
      'COMMERCIALS',
      'TOTAL\nAMOUNT',
    ]],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'middle' },
      1: { cellWidth: 52 },
      2: { cellWidth: 35 },
      3: { cellWidth: 32 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 23, halign: 'right', valign: 'middle', fontStyle: 'bold' },
    },
    tableWidth: pageWidth - MARGINS.left - MARGINS.right,
    margin: { left: leftMargin, right: MARGINS.right, top: 35, bottom: MARGINS.bottom },
    rowPageBreak: 'avoid',
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;
  return yPos;
}

function renderCommercialSummary(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Section header
  doc.setFillColor(255, 248, 240);
  doc.rect(leftMargin, yPos, rightEdge - leftMargin, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 100, 0);
  doc.text('SECTION 4: COMMERCIAL SUMMARY', leftMargin + 3, yPos + 5);
  yPos += 12;

  // --- Boxed table for commercial summary ---
  const tableWidth = 90;
  const tableX = rightEdge - tableWidth;
  const col1W = 58;
  const col2W = tableWidth - col1W;
  const rowH = 6.5;

  const taxableAmount = data.subTotal + data.totalPrinting + data.totalMounting;

  const summaryRows: { label: string; value: number; bold?: boolean; highlight?: boolean }[] = [
    { label: 'Sub Total (Rent)', value: data.subTotal },
    { label: 'Printing Charges', value: data.totalPrinting },
    { label: 'Mounting Charges', value: data.totalMounting },
    { label: 'Taxable Amount', value: taxableAmount, bold: true },
    { label: 'CGST @ 9%', value: data.cgst },
    { label: 'SGST @ 9%', value: data.sgst },
    { label: 'GRAND TOTAL', value: data.grandTotal, bold: true, highlight: true },
  ];

  summaryRows.forEach((row) => {
    // Add spacing before Total row
    if (row.highlight) {
      yPos += 2;
    }

    // Background
    if (row.highlight) {
      doc.setFillColor(30, 64, 175); // #1E40AF
      doc.rect(tableX, yPos, tableWidth, rowH, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(tableX, yPos, tableWidth, rowH, 'F');
    }

    // Border
    doc.setDrawColor(209, 213, 219); // #D1D5DB
    doc.setLineWidth(0.3);
    doc.rect(tableX, yPos, col1W, rowH, 'S');
    doc.rect(tableX + col1W, yPos, col2W, rowH, 'S');

    // Label
    doc.setFont('NotoSans', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.highlight ? 9 : 8.5);
    doc.setTextColor(row.highlight ? 255 : 17, row.highlight ? 255 : 24, row.highlight ? 255 : 39);
    doc.text(row.label, tableX + 2, yPos + rowH - 2);

    // Value (right-aligned)
    doc.text(formatCurrencyForPDF(row.value), tableX + col1W + col2W - 2, yPos + rowH - 2, { align: 'right' });

    yPos += rowH;
  });

  // Total in words below the table
  yPos += 3;
  doc.setFont('NotoSans', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const totalWords = `${numberToWords(Math.floor(data.grandTotal))} Rupees Only`;
  doc.text(`Amount in Words: ${totalWords}`, leftMargin, yPos);

  yPos += 8;
  return yPos;
}

function renderTermsSection(doc: jsPDF, data: ROData, pageWidth: number, pageHeight: number, yPos: number): number {
  return renderStdTermsBox(doc, yPos, {
    pageWidth,
    pageHeight,
    leftMargin: MARGINS.left,
    rightMargin: MARGINS.right,
    bottomMargin: MARGINS.bottom,
    fontFamily: 'NotoSans',
    onNewPage: () => { doc.addPage(); return MARGINS.top; },
  });
}

function renderAuthorizationSection(
  doc: jsPDF,
  data: ROData,
  pageWidth: number,
  pageHeight: number,
  yPos: number,
  stampBase64?: string,
): void {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const contentWidth = rightEdge - leftMargin;

  // Need at least 60mm for authorization section
  if (yPos + 60 > pageHeight - MARGINS.bottom) {
    doc.addPage();
    yPos = MARGINS.top;
  }

  // Divider
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, rightEdge, yPos);
  yPos += 5;

  const halfWidth = contentWidth / 2 - 5;
  const leftBoxX = leftMargin;
  const rightBoxX = leftMargin + halfWidth + 10;
  const boxHeight = 55;

  // ---- LEFT BOX: Issued By (Client) ----
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftBoxX, yPos, halfWidth, boxHeight, 'S');

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Issued By (Client)', leftBoxX + 3, yPos + 6);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text(data.clientName, leftBoxX + 3, yPos + 13);

  // Signature line
  doc.setDrawColor(150, 150, 150);
  doc.line(leftBoxX + 3, yPos + 35, leftBoxX + halfWidth - 3, yPos + 35);
  
  doc.setFontSize(7.5);
  doc.text('Signature & Company Seal', leftBoxX + 3, yPos + 40);
  doc.text('Date: _______________', leftBoxX + 3, yPos + 48);

  // ---- RIGHT BOX: Accepted By (Media Owner) ----
  doc.rect(rightBoxX, yPos, halfWidth, boxHeight, 'S');

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.text('Accepted By (Media Owner)', rightBoxX + 3, yPos + 6);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text(data.companyName || SERVICE_PROVIDER.name, rightBoxX + 3, yPos + 13);

  // Stamp image in right box
  if (stampBase64) {
    try {
      const stampSize = 28;
      const stampX = rightBoxX + halfWidth - stampSize - 5;
      const stampY = yPos + 15;
      doc.addImage(stampBase64, 'PNG', stampX, stampY, stampSize, stampSize);
    } catch (e) {
      console.warn('Failed to embed stamp image:', e);
    }
  }

  // Signature line (right box)
  doc.setDrawColor(150, 150, 150);
  doc.line(rightBoxX + 3, yPos + 35, rightBoxX + halfWidth - 35, yPos + 35);
  
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', rightBoxX + 3, yPos + 40);
  doc.text('Date: _______________', rightBoxX + 3, yPos + 48);
}
