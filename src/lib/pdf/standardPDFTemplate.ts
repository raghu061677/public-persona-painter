import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { 
  renderLogoHeader, 
  renderBillShipGrid, 
  renderDetailsGrid,
  createPageHeaderRenderer 
} from './sections/logoHeader';
import { renderSellerFooterWithSignatory } from './sections/authorizedSignatory';
import { renderApprovalFooter } from './sections/approvalFooter';
import { ensurePdfUnicodeFont } from './fontLoader';

// ============= INTERFACES =============

export interface PDFDocumentData {
  documentType: 'WORK ORDER' | 'ESTIMATE' | 'QUOTATION' | 'PROFORMA INVOICE';
  documentNumber: string;
  documentDate: string;
  displayName: string;
  pointOfContact: string;

  // Client details (Bill To / Ship To)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;

  // Company/Seller details
  companyName: string;
  companyGSTIN: string;
  companyPAN: string;
  companyLogoBase64?: string;

  // Other details (Zoho style)
  placeOfSupply?: string;
  stateCode?: string;
  salesPerson?: string;
  validity?: string;

  // Line items (098-style)
  items: PDFLineItem[];

  // Totals
  untaxedAmount: number;
  cgst: number;
  sgst: number;
  totalInr: number;

  // Optional overrides
  terms?: string[];
  paymentTerms?: string;

  // Professional quotation metadata
  campaignDuration?: string;        // "01 Mar 2026 – 31 Mar 2026"
  quotationValidityDays?: number;   // e.g. 7
  totalLocations?: number;          // asset count
  salesContactName?: string;        // plan salesperson name
  salesContactPhone?: string;       // plan salesperson phone
  salesContactEmail?: string;       // plan salesperson email
}

export interface PDFLineItem {
  sno: number;
  // LOCATION & DESCRIPTION column content
  locationCode: string;    // e.g., "[A4-36] Abids beside Chermas"
  area: string;            // e.g., "Abids" (Zone/Area)
  mediaType: string;       // e.g., "Bus Shelter"
  route: string;           // e.g., "Towards GPO" (direction)
  illumination: string;    // e.g., "BackLit"
  
  // SIZE column
  dimension: string;       // e.g., "20X5-9.5X3"
  totalSqft: number;       // e.g., 161
  
  // BOOKING column
  fromDate: string;        // e.g., "27/09/2025"
  toDate: string;          // e.g., "26/10/2025"
  duration: string;        // e.g., "1 Month" or "30 Days"
  
  // Pricing - separate cost breakdown
  unitPrice: number;       // Display cost (pro-rata rent only)
  printingCost?: number;   // Printing charges
  mountingCost?: number;   // Installation/mounting charges
  subtotal: number;        // Final amount for this item (display + printing + mounting)
}

// ============= UTILITY FUNCTIONS =============

// Format date to DD/MM/YYYY
export function formatDateToDDMMYYYY(dateString: string): string {
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
export function formatDateToDDMonYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}${month}${year}`;
  } catch {
    return '-';
  }
}

// Convert number to words (Indian style)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  
  if (num > 0) {
    if (words !== '') words += 'And ';
    if (num < 20) {
      words += ones[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) words += '-' + ones[num % 10];
    }
  }

  return words.trim();
}

function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = numberToWords(rupees) + ' Rupees';
  if (paise > 0) {
    words += ' And ' + numberToWords(paise) + ' Paise';
  }
  return words + ' Only';
}

// ============= CONSTANTS =============

const BANK_DETAILS = {
  bankName: 'HDFC Bank Limited',
  branch: 'Karkhana Road, Secunderabad – 500009',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
};

const PAGE_MARGINS = {
  top: 20,
  left: 14,
  right: 14,
  bottom: 15, // Reduced from 20 for better space usage
};

// Minimum space needed for footer section (terms + signatory)
const FOOTER_RESERVE = 80;

// ============= MAIN PDF GENERATOR =============

export async function generateStandardizedPDF(data: PDFDocumentData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;

  // Ensure ₹ is supported
  await ensurePdfUnicodeFont(doc);

  // Create reusable page header renderers (full for page 1, compact for page 2+)
  const headerRenderers = createPageHeaderRenderer(
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  // ========== 1. LOGO HEADER (Zoho Style, Page 1) ==========
  let yPos = headerRenderers.full(doc);

  yPos += 2;

  // ========== 2. BILL TO / SHIP TO GRID ==========
  yPos = renderBillShipGrid(
    doc,
    {
      name: data.clientName,
      address: data.clientAddress,
      city: data.clientCity,
      state: data.clientState,
      pincode: data.clientPincode,
      gstin: data.clientGSTIN,
    },
    yPos
  );

  yPos += 2;

  // ========== 3. DOCUMENT DETAILS / OTHER DETAILS GRID ==========
  yPos = renderDetailsGrid(
    doc,
    {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentDate: data.documentDate,
      displayName: data.displayName,
      placeOfSupply: data.placeOfSupply || data.clientState,
      stateCode: data.stateCode || getStateCode(data.clientState),
      salesPerson: data.salesPerson || data.pointOfContact,
      validity: data.validity || (data.quotationValidityDays ? `${data.quotationValidityDays} Days` : (data.documentType === 'ESTIMATE' || data.documentType === 'QUOTATION' ? '7 Days' : undefined)),
      campaignDuration: data.campaignDuration,
    },
    yPos
  );

  yPos += 3;

  // ========== 3.5 CAMPAIGN SUMMARY BLOCK ==========
  if (data.totalLocations && data.totalLocations > 0) {
    const summaryBoxY = yPos;
    const summaryBoxW = pageWidth - leftMargin - rightMargin;
    const halfW = summaryBoxW / 2;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(leftMargin, summaryBoxY, summaryBoxW, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Total Media Units: ${data.totalLocations}`, leftMargin + 5, summaryBoxY + 6.5);
    doc.text(`Total Campaign Budget: ${formatCurrencyForPDF(data.totalInr)}`, leftMargin + halfW, summaryBoxY + 6.5);
    doc.setTextColor(0, 0, 0);
    yPos = summaryBoxY + 14;
  }

  yPos += 2;

  // ========== 4. OOH LINE ITEMS TABLE (098 Style) ==========
  // Table must always start below the header area.
  const tableStartY = Math.max(yPos, 90);

  const tableBody = data.items.map((item) => {
    // Column 2: Location & Description
    const locationParts: string[] = [];
    const mainLocation = item.locationCode.replace(/\[.*?\]\s*/, ''); // strip asset codes like [MNS-HYD-BQS-0032]
    if (mainLocation) locationParts.push(mainLocation);
    if (item.route && item.route !== '-') locationParts.push(`Direction: ${item.route}`);
    if (item.area && item.area !== '-') locationParts.push(`Area: ${item.area}`);
    const locationDesc = locationParts.join('\n') || '-';

    // Column 3: Media Specification
    const mediaSpec = [
      `Media Type: ${item.mediaType}`,
      `Size: ${item.dimension}`,
      `Area: ${item.totalSqft || 0} Sqft`,
      `Illumination: ${item.illumination || 'Non-Lit'}`,
    ].join('\n');

    // Column 4: Booking Period
    const bookingCell = `Start: ${item.fromDate}\nEnd: ${item.toDate}\nDuration: ${item.duration}`;

    // Column 5: Commercials
    const commercials = [
      `Display: ${formatCurrencyForPDF(item.unitPrice)}`,
      `Printing: ${formatCurrencyForPDF(item.printingCost || 0)}`,
      `Mounting: ${formatCurrencyForPDF(item.mountingCost || 0)}`,
    ].join('\n');

    return [
      item.sno.toString(),
      locationDesc,
      mediaSpec,
      bookingCell,
      commercials,
      formatCurrencyForPDF(item.subtotal),
    ];
  });

  // Track page count for header rendering
  let currentPageCount = 1;

  const tableHeaders = [['S.No', 'LOCATION &\nDESCRIPTION', 'MEDIA\nSPECIFICATION', 'BOOKING\nPERIOD', 'COMMERCIALS', 'TOTAL\nAMOUNT']];

  const tableColumnStyles = {
    0: { cellWidth: 10, halign: 'center' as const, valign: 'middle' as const },
    1: { cellWidth: 52 },
    2: { cellWidth: 35, halign: 'left' as const },
    3: { cellWidth: 32, halign: 'left' as const },
    4: { cellWidth: 30, halign: 'right' as const },
    5: { cellWidth: 23, halign: 'right' as const, fontStyle: 'bold' as const },
  };
  
  autoTable(doc, {
    startY: tableStartY,
    head: tableHeaders,
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
    columnStyles: tableColumnStyles,
    // CRITICAL: Reserve safe header area on EVERY page (35mm for compact header)
    // Page 1 already has header rendered, but page 2+ needs margin.top to leave room
    margin: { top: 35, left: leftMargin, right: rightMargin, bottom: PAGE_MARGINS.bottom },
    tableWidth: pageWidth - leftMargin - rightMargin,
    // CRITICAL: Prevent row splitting across pages
    rowPageBreak: 'avoid',
    // Handle page breaks properly
    didDrawPage: (hookData) => {
      // Page 2+ should ONLY have compact header (no title/address/GST)
      // Render compact header at fixed position, BEFORE table content
      if (hookData.pageNumber > 1) {
        // Clear the header area first to prevent any overlap
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 34, 'F');
        // Render compact header
        headerRenderers.compact(doc);
      }
      currentPageCount = hookData.pageNumber;
    },
  });

  // @ts-ignore - jspdf-autotable adds lastAutoTable
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== 5. SUMMARY & BANK DETAILS (Side by Side, Zoho Style) ==========
  // Calculate required space dynamically based on actual content
  // Bank details: ~25mm, Summary table: ~25mm, Payment terms: ~8mm, Signatory: ~25mm
  // Terms: varies based on count (~4mm per term after wrapping)
  const termsCount = (data.terms?.length || 8);
  const estimatedTermsSpace = termsCount * 5 + 10; // ~5mm per term + header
  const requiredSpace = 25 + 25 + 8 + 25 + estimatedTermsSpace; // ~83mm for default 8 terms
  const availableSpace = pageHeight - yPos - PAGE_MARGINS.bottom;
  
  // Only add new page if absolutely necessary (less than minimum required)
  if (availableSpace < Math.min(requiredSpace, 75)) {
    doc.addPage();
    // Clear header area and render compact header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = headerRenderers.compact(doc) + 10;
  }

  const contentWidth = pageWidth - leftMargin - rightMargin;
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;
  const summaryStartX = leftMargin + leftColWidth + 5;

  // ----- RIGHT SIDE: Boxed Summary Table -----
  const tableWidth = rightColWidth - 5;
  const tableX = summaryStartX;
  const col1W = tableWidth * 0.58;
  const col2W = tableWidth - col1W;
  const rowH = 6.5;

  const summaryRows: { label: string; value: number; bold?: boolean; highlight?: boolean }[] = [
    { label: 'Sub Total', value: data.untaxedAmount },
    { label: 'CGST @ 9%', value: data.cgst },
    { label: 'SGST @ 9%', value: data.sgst },
    { label: 'Total', value: data.totalInr, bold: true, highlight: true },
  ];

  let summaryY = yPos;
  let totalRowBottomY = yPos;
  summaryRows.forEach((row) => {
    if (row.highlight) {
      summaryY += 2;
    }

    if (row.highlight) {
      doc.setFillColor(30, 64, 175);
      doc.rect(tableX, summaryY, tableWidth, rowH, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(tableX, summaryY, tableWidth, rowH, 'F');
    }

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.rect(tableX, summaryY, col1W, rowH, 'S');
    doc.rect(tableX + col1W, summaryY, col2W, rowH, 'S');

    doc.setFont('NotoSans', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.highlight ? 9 : 8.5);
    doc.setTextColor(row.highlight ? 255 : 17, row.highlight ? 255 : 24, row.highlight ? 255 : 39);
    doc.text(row.label, tableX + 2, summaryY + rowH - 2);
    doc.text(formatCurrencyForPDF(row.value), tableX + col1W + col2W - 2, summaryY + rowH - 2, { align: 'right' });

    summaryY += rowH;
    totalRowBottomY = summaryY;
  });

  // ----- LEFT SIDE: Bank Details (bordered box matching summary height) -----
  const bankBoxX = leftMargin;
  const bankBoxWidth = leftColWidth;
  const bankBoxHeight = totalRowBottomY - yPos;
  const bankPad = 4;

  // Draw bordered box to match the summary table height
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(bankBoxX, yPos, bankBoxWidth, bankBoxHeight, 'S');

  // Title
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Bank Details', bankBoxX + bankPad, yPos + 6);

  // Bank info
  let bankY = yPos + 12;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(BANK_DETAILS.bankName, bankBoxX + bankPad, bankY);
  bankY += 4.5;

  doc.setFont('NotoSans', 'normal');
  doc.text(`Branch: ${BANK_DETAILS.branch}`, bankBoxX + bankPad, bankY);
  bankY += 4.5;
  doc.text(`A/c No: ${BANK_DETAILS.accountNo}`, bankBoxX + bankPad, bankY);
  bankY += 4.5;
  doc.text(`IFSC: ${BANK_DETAILS.ifsc}`, bankBoxX + bankPad, bankY);
  bankY += 4.5;
  doc.text(`MICR: ${BANK_DETAILS.micr}`, bankBoxX + bankPad, bankY);

  // Total in words below the summary table
  summaryY += 3;
  doc.setFont('NotoSans', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const totalWords = amountToWords(data.totalInr);
  const amountWordsWidth = pageWidth - tableX - rightMargin;
  const amountWordsText = `Total (In Words): ${totalWords}`;
  const wrappedAmountWords = doc.splitTextToSize(amountWordsText, amountWordsWidth);
  wrappedAmountWords.forEach((line: string) => {
    doc.text(line, tableX, summaryY);
    summaryY += 4;
  });
  let summaryEndY = summaryY;

  yPos = Math.max(bankY, summaryEndY) + 8;

  // ========== 6. PAYMENT TERMS ==========
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Payment Terms: ${data.paymentTerms || 'Net 30 Days'}`, leftMargin, yPos);
  yPos += 6;

  // ========== 6.5. SALES CONTACT ==========
  if (data.salesContactName) {
    doc.setFontSize(9);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Sales Contact', leftMargin, yPos);
    yPos += 5;
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(data.salesContactName, leftMargin, yPos);
    yPos += 4;
    if (data.salesContactPhone) {
      doc.text(`Phone: ${data.salesContactPhone}`, leftMargin, yPos);
      yPos += 4;
    }
    if (data.salesContactEmail) {
      doc.text(`Email: ${data.salesContactEmail}`, leftMargin, yPos);
      yPos += 4;
    }
    yPos += 2;
  }


  yPos += 2;

  yPos += 2;

  // ========== 7. TERMS & CONDITIONS (Shared Standard) ==========
  const { renderTermsBoxPDF: renderStdTerms } = await import('@/lib/terms/standardTerms');
  yPos = renderStdTerms(doc, yPos, {
    pageWidth,
    pageHeight,
    leftMargin,
    rightMargin,
    bottomMargin: PAGE_MARGINS.bottom,
    fontFamily: 'NotoSans',
    onNewPage: () => {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 34, 'F');
      return headerRenderers.compact(doc) + 10;
    },
  });

  yPos += 8;

  // ========== 7.5. APPROVAL & SIGNATORY BOXES (Side by Side) ==========
  // Ensure minimum space for the two-box footer (~60mm)
  if (yPos + 60 > pageHeight - PAGE_MARGINS.bottom) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = headerRenderers.compact(doc) + 10;
  }

  yPos = await renderApprovalFooter(doc, yPos, {
    companyName: data.companyName,
    pageWidth,
    leftMargin,
    rightMargin,
  });

  return doc.output('blob');
}

/**
 * Same as generateStandardizedPDF but returns the jsPDF doc object
 * so callers can append additional pages (e.g. visual gallery).
 */
export async function generateStandardizedPDFDoc(data: PDFDocumentData): Promise<jsPDF> {
  // Re-use the same logic but intercept before blob output
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;

  await ensurePdfUnicodeFont(doc);

  const headerRenderers = createPageHeaderRenderer(
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  let yPos = headerRenderers.full(doc);
  yPos += 2;

  yPos = renderBillShipGrid(
    doc,
    {
      name: data.clientName,
      address: data.clientAddress,
      city: data.clientCity,
      state: data.clientState,
      pincode: data.clientPincode,
      gstin: data.clientGSTIN,
    },
    yPos
  );
  yPos += 2;

  yPos = renderDetailsGrid(
    doc,
    {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentDate: data.documentDate,
      displayName: data.displayName,
      placeOfSupply: data.placeOfSupply || data.clientState,
      stateCode: data.stateCode || getStateCode(data.clientState),
      salesPerson: data.salesPerson || data.pointOfContact,
      validity: data.validity || (data.quotationValidityDays ? `${data.quotationValidityDays} Days` : (data.documentType === 'ESTIMATE' || data.documentType === 'QUOTATION' ? '7 Days' : undefined)),
      campaignDuration: data.campaignDuration,
    },
    yPos
  );
  yPos += 3;

  if (data.totalLocations && data.totalLocations > 0) {
    const summaryY = yPos;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(leftMargin, summaryY, contentWidth, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Total Media Units: ${data.totalLocations}`, leftMargin + 5, summaryY + 6.5);
    doc.text(`Total Campaign Budget: ${formatCurrencyForPDF(data.totalInr)}`, pageWidth / 2, summaryY + 6.5);
    doc.setTextColor(0, 0, 0);
    yPos = summaryY + 14;
  }

  // Table
  const tableHead = [['S.No', 'Location / Description', 'Media Specification', 'Booking Period', 'Commercials', 'Total Amount']];
  const tableBody = data.items.map(item => {
    const locationBlock = `${item.locationCode}\nArea: ${item.area}\nRoute: ${item.route}`;
    const specBlock = `${item.mediaType}\n${item.dimension}\n${item.illumination}`;
    const bookingBlock = `${item.fromDate} to\n${item.toDate}\n${item.duration}`;
    const commercialsBlock = `Rent: ${formatCurrencyForPDF(item.unitPrice)}\nP: ${formatCurrencyForPDF(item.printingCost || 0)}\nM: ${formatCurrencyForPDF(item.mountingCost || 0)}`;
    const totalBlock = formatCurrencyForPDF(item.subtotal);
    return [item.sno.toString(), locationBlock, specBlock, bookingBlock, commercialsBlock, totalBlock];
  });

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7, textColor: [40, 40, 40], cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    styles: { overflow: 'linebreak' },
    didDrawPage: (hookData: any) => {
      if (hookData.pageNumber > 1) {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 34, 'F');
        headerRenderers.compact(doc);
      }
    },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;

  // Financial summary + bank details (boxed, matching standard template)
  const contentWidth = pageWidth - leftMargin - rightMargin;
  if (yPos + 60 > pageHeight - 40) { doc.addPage(); yPos = 20; }

  const bankColW = contentWidth * 0.55;
  const totalsColW = contentWidth * 0.45;
  const totalsX = leftMargin + bankColW + 5;
  const boxY = yPos;

  // RIGHT: Financial Summary (render first to get height)
  const totalsTableW = totalsColW - 5;
  const tCol1W = totalsTableW * 0.58;
  const tCol2W = totalsTableW - tCol1W;
  const tRowH = 6.5;

  const docSummaryRows: { label: string; value: number; bold?: boolean; highlight?: boolean }[] = [
    { label: 'Sub Total', value: data.untaxedAmount },
    { label: 'CGST @ 9%', value: data.cgst },
    { label: 'SGST @ 9%', value: data.sgst },
    { label: 'Total', value: data.totalInr, bold: true, highlight: true },
  ];

  let docSummaryY = boxY;
  docSummaryRows.forEach((row) => {
    if (row.highlight) docSummaryY += 2;
    if (row.highlight) {
      doc.setFillColor(30, 64, 175);
      doc.rect(totalsX, docSummaryY, totalsTableW, tRowH, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(totalsX, docSummaryY, totalsTableW, tRowH, 'F');
    }
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.rect(totalsX, docSummaryY, tCol1W, tRowH, 'S');
    doc.rect(totalsX + tCol1W, docSummaryY, tCol2W, tRowH, 'S');
    doc.setFont('NotoSans', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.highlight ? 9 : 8.5);
    doc.setTextColor(row.highlight ? 255 : 17, row.highlight ? 255 : 24, row.highlight ? 255 : 39);
    doc.text(row.label, totalsX + 2, docSummaryY + tRowH - 2);
    doc.text(formatCurrencyForPDF(row.value), totalsX + tCol1W + tCol2W - 2, docSummaryY + tRowH - 2, { align: 'right' });
    docSummaryY += tRowH;
  });

  // LEFT: Bank Details bordered box (height matches summary)
  const bankBoxHeight = docSummaryY - boxY;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, boxY, bankColW, bankBoxHeight, 'S');

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Bank Details', leftMargin + 4, boxY + 6);

  let bkY = boxY + 12;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(BANK_DETAILS.bankName, leftMargin + 4, bkY);
  bkY += 4.5;
  doc.setFont('NotoSans', 'normal');
  doc.text(`Branch: ${BANK_DETAILS.branch}`, leftMargin + 4, bkY);
  bkY += 4.5;
  doc.text(`A/c No: ${BANK_DETAILS.accountNo}`, leftMargin + 4, bkY);
  bkY += 4.5;
  doc.text(`IFSC: ${BANK_DETAILS.ifsc}`, leftMargin + 4, bkY);
  bkY += 4.5;
  doc.text(`MICR: ${BANK_DETAILS.micr}`, leftMargin + 4, bkY);
  doc.setTextColor(0, 0, 0);

  yPos = boxY + bankBoxHeight + 5;

  // Payment terms
  if (data.paymentTerms) {
    if (yPos + 8 > pageHeight - 60) { doc.addPage(); yPos = 20; }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    const ptLines = doc.splitTextToSize(data.paymentTerms, contentWidth - 30);
    doc.text(ptLines, leftMargin + 28, yPos);
    yPos += ptLines.length * 3.5 + 3;
  }

  // Sales contact
  if (data.salesContactName) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Contact:', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    let contactStr = data.salesContactName;
    if (data.salesContactPhone) contactStr += ` | ${data.salesContactPhone}`;
    if (data.salesContactEmail) contactStr += ` | ${data.salesContactEmail}`;
    doc.text(contactStr, leftMargin + 28, yPos);
    yPos += 6;
  }

  // Terms
  if (data.terms && data.terms.length > 0) {
    if (yPos + 15 > pageHeight - 40) { doc.addPage(); yPos = 20; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', leftMargin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    for (let i = 0; i < data.terms.length; i++) {
      if (!data.terms[i]) continue;
      const lines = doc.splitTextToSize(`${i + 1}. ${data.terms[i]}`, contentWidth - 5);
      if (yPos + lines.length * 3 > pageHeight - 15) { doc.addPage(); yPos = 20; }
      doc.text(lines, leftMargin + 2, yPos);
      yPos += lines.length * 3 + 1;
    }
  }

  // Approval & Signatory boxes
  if (yPos + 60 > pageHeight - 10) { doc.addPage(); yPos = 20; }
  yPos += 5;

  yPos = await renderApprovalFooter(doc, yPos, {
    companyName: data.companyName,
    pageWidth,
    leftMargin,
    rightMargin,
  });

  return doc;
}

// ============= HELPER FUNCTIONS =============

// Get state code from state name (for Place of Supply)
function getStateCode(state?: string): string {
  if (!state) return '';
  
  const stateCodes: Record<string, string> = {
    'Andhra Pradesh': '37',
    'Telangana': '36',
    'Karnataka': '29',
    'Tamil Nadu': '33',
    'Maharashtra': '27',
    'Gujarat': '24',
    'Delhi': '07',
    'Uttar Pradesh': '09',
    'West Bengal': '19',
    'Rajasthan': '08',
    'Kerala': '32',
    'Odisha': '21',
    'Bihar': '10',
    'Punjab': '03',
    'Haryana': '06',
    'Madhya Pradesh': '23',
    'Jharkhand': '20',
    'Chhattisgarh': '22',
    'Assam': '18',
    'Goa': '30',
    'Himachal Pradesh': '02',
    'Uttarakhand': '05',
    'Jammu and Kashmir': '01',
    'Chandigarh': '04',
    'Puducherry': '34',
  };
  
  return stateCodes[state] || '';
}
