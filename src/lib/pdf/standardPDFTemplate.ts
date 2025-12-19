import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { renderLogoHeader, createPageHeaderRenderer } from './sections/logoHeader';
import { renderSellerFooterWithSignatory } from './sections/authorizedSignatory';
import { ensurePdfUnicodeFont } from './fontLoader';

interface PDFDocumentData {
  documentType: 'WORK ORDER' | 'ESTIMATE' | 'QUOTATION' | 'PROFORMA INVOICE';
  documentNumber: string;
  documentDate: string;
  displayName: string;
  pointOfContact: string;

  // Client details (TO section)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;

  // Company/Seller details (FOR section - footer)
  companyName: string;
  companyGSTIN: string;
  companyPAN: string;
  companyLogoBase64?: string; // Optional logo as base64

  // Line items
  items: PDFLineItem[];

  // Totals
  displayCost: number;
  installationCost: number;
  gst: number;
  totalInr: number;

  // Optional overrides
  terms?: string[];
}

interface PDFLineItem {
  sno?: number; // Serial number (auto-generated if not provided)
  area?: string; // Area name (e.g., Kukatpally, Jubilee Hills)
  description: string; // Single-line location description
  mediaType?: string; // Bus Shelter, Hoarding, Unipole, LED, etc.
  dimension?: string; // e.g., "10x20 ft"
  sqft?: number; // Total sqft
  illuminationType?: string; // Backlit, Frontlit, Non-Lit, LED
  startDate: string; // Format: 15Aug25
  endDate: string; // Format: 15Aug25
  days: number;
  monthlyRate: number;
  cost: number;
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

export async function generateStandardizedPDF(data: PDFDocumentData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Ensure ₹ is supported
  await ensurePdfUnicodeFont(doc);

  // Re-usable page header (for multipage tables)
  const headerRenderer = createPageHeaderRenderer(
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  // ========== LOGO HEADER SECTION ==========
  // Header now has: logo LEFT, company name + address + GSTIN RIGHT, title CENTERED below
  let yPos = renderLogoHeader(
    doc,
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  yPos += 5;

  // ========== CLIENT DETAILS "To" SECTION (LEFT SIDE) ==========
  // Per spec: Client name, address, Client GSTIN only - NO seller GST here
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.text('To,', 15, yPos);

  yPos += 5;
  doc.text(data.clientName, 15, yPos);

  yPos += 5;
  if (data.clientAddress) {
    doc.text(data.clientAddress, 15, yPos);
    yPos += 5;
  }

  // City, State, Pincode
  const locationLine = `${data.clientCity || ''}, ${data.clientState || ''} ${data.clientPincode || ''}`.trim();
  if (locationLine && locationLine !== ',') {
    doc.text(locationLine, 15, yPos);
    yPos += 5;
  }

  // Client GSTIN only
  if (data.clientGSTIN) {
    doc.text(`GSTIN: ${data.clientGSTIN}`, 15, yPos);
    yPos += 5;
  }

  // ========== DOCUMENT DETAILS (RIGHT SIDE) ==========
  const rightX = pageWidth - 15;
  let rightY = yPos - 15; // Align with "To" section

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Display Name : ${data.displayName}`, rightX, rightY, { align: 'right' });

  rightY += 5;
  let docLabel = '';
  switch (data.documentType) {
    case 'WORK ORDER':
      docLabel = 'WO No';
      break;
    case 'ESTIMATE':
      docLabel = 'Estimate No';
      break;
    case 'QUOTATION':
      docLabel = 'Quotation No';
      break;
    case 'PROFORMA INVOICE':
      docLabel = 'PI No';
      break;
  }
  doc.text(`${docLabel} : ${data.documentNumber}`, rightX, rightY, { align: 'right' });

  rightY += 5;
  let dateLabel = '';
  switch (data.documentType) {
    case 'WORK ORDER':
      dateLabel = 'WO Date';
      break;
    case 'ESTIMATE':
      dateLabel = 'Estimate Date';
      break;
    case 'QUOTATION':
      dateLabel = 'Quotation Date';
      break;
    case 'PROFORMA INVOICE':
      dateLabel = 'PI Date';
      break;
  }
  doc.text(`${dateLabel} : ${data.documentDate}`, rightX, rightY, { align: 'right' });

  rightY += 5;
  doc.text(`Point of Contact : ${data.pointOfContact || 'N/A'}`, rightX, rightY, { align: 'right' });

  // NO seller GST/PAN in body per spec - it's already in header
  yPos = Math.max(yPos, rightY) + 10;

  // ========== SUMMARY OF CHARGES TABLE ==========
  // Column order: S.No | Area | Description | Media Type | Size | Sqft | Illumination | Start | End | Days | Rate/Month | Cost
  const tableData = data.items.map((item, index) => {
    // Clean description - remove line breaks, keep single line
    const cleanDescription = (item.description || '-').replace(/\n/g, ' ').trim();
    
    return [
      (item.sno || index + 1).toString(), // S.No
      item.area || '-', // Area
      cleanDescription, // Description (single-line)
      item.mediaType || '-', // Media Type
      item.dimension || '-', // Size
      item.sqft ? item.sqft.toString() : '-', // Sqft
      item.illuminationType || '-', // Illumination
      item.startDate || '-', // Start
      item.endDate || '-', // End
      item.days > 0 ? item.days.toString() : '-', // Days
      item.monthlyRate > 0 ? formatCurrencyForPDF(item.monthlyRate) : '-', // Rate/Month
      formatCurrencyForPDF(item.cost), // Cost
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['S.No', 'Area', 'Description', 'Media Type', 'Size', 'Sqft', 'Illumination', 'Start', 'End', 'Days', 'Rate/Month', 'Cost']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 6.5,
      textColor: [0, 0, 0],
      cellPadding: { top: 1.1, right: 1.1, bottom: 1.1, left: 1.1 },
      overflow: 'ellipsize', // single-line, no chaotic wraps
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineWidth: 0.1,
      lineColor: [180, 180, 180],
      cellPadding: { top: 1.1, right: 1.1, bottom: 1.1, left: 1.1 },
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      // Available width = 210 - (8+8) = 194mm
      0: { cellWidth: 8, halign: 'center' }, // S.No
      1: { cellWidth: 18, halign: 'center' }, // Area
      2: { cellWidth: 30, halign: 'left' }, // Description (single-line)
      3: { cellWidth: 18, halign: 'center' }, // Media Type
      4: { cellWidth: 18, halign: 'center' }, // Size
      5: { cellWidth: 10, halign: 'center' }, // Sqft
      6: { cellWidth: 16, halign: 'center' }, // Illumination
      7: { cellWidth: 14, halign: 'center' }, // Start
      8: { cellWidth: 14, halign: 'center' }, // End
      9: { cellWidth: 10, halign: 'center' }, // Days
      10: { cellWidth: 18, halign: 'right' }, // Rate/Month
      11: { cellWidth: 20, halign: 'right' }, // Cost
    },
    margin: { left: 8, right: 8, top: 10 },
    didDrawPage: () => {
      // Keep header on every page
      headerRenderer(doc);
    },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;

  // ========== TOTALS (RIGHT ALIGNED) ==========
  const totalsX = pageWidth - 15;

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Display Cost :`, totalsX - 50, yPos);
  doc.text(formatCurrencyForPDF(data.displayCost), totalsX, yPos, { align: 'right' });

  yPos += 6;
  doc.text(`Installation Cost :`, totalsX - 50, yPos);
  doc.text(formatCurrencyForPDF(data.installationCost), totalsX, yPos, { align: 'right' });

  yPos += 6;
  doc.text(`GST (18%) :`, totalsX - 50, yPos);
  doc.text(formatCurrencyForPDF(data.gst), totalsX, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(12);
  doc.text(`Total in INR :`, totalsX - 50, yPos);
  doc.text(formatCurrencyForPDF(data.totalInr), totalsX, yPos, { align: 'right' });

  yPos += 15;

  // ========== TERMS & CONDITIONS ==========
  const terms = data.terms?.length
    ? data.terms.map((t, idx) => `${idx + 1}. ${t}`)
    : [
        '1. Advance Payment & Purchase Order is Mandatory to start the campaign.',
        '2. Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
        '3. Site available date may change in case of present display Renewal.',
        '4. Site Availability changes every minute, please double check site available dates when you confirm the sites.',
        '5. Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.',
        '6. Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered',
        '   within 5 days of confirmation, we will release the site.',
        '7. In case flex/vinyl/display material is damaged, torn or vandalised, it will be your responsibility to provide',
        '   new flex.',
        '8. Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.',
      ];

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.text('Terms and Conditions -', 15, yPos);

  yPos += 6;
  doc.setFontSize(9);

  // Draw box around terms
  const pageHeight = doc.internal.pageSize.getHeight();
  const boxPadding = 3;

  // paginate terms if needed
  let termY = yPos;
  const startX = 15;
  const maxWidth = pageWidth - 30;

  // Box (first page box only; subsequent pages still show header via didDrawPage)
  const estimatedLineCount = terms.length;
  const estimatedHeight = estimatedLineCount * 4.5 + 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(startX, termY - boxPadding, maxWidth, estimatedHeight);

  terms.forEach((term) => {
    if (termY + 6 > pageHeight - 30) {
      doc.addPage();
      headerRenderer(doc);
      termY = 45;
    }
    const lines = doc.splitTextToSize(term, maxWidth - 6);
    doc.text(lines, startX + 3, termY);
    termY += lines.length * 4.5;
  });

  yPos = termY + 10;

  // ========== FOOTER: SELLER INFO (LEFT) + AUTHORIZED SIGNATORY (RIGHT) ==========
  if (yPos + 40 > pageHeight - 20) {
    doc.addPage();
    headerRenderer(doc);
    yPos = 45;
  }

  renderSellerFooterWithSignatory(doc, { name: data.companyName, gstin: data.companyGSTIN }, yPos);

  return doc.output('blob');
}
