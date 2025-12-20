import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
  pan?: string;
  logo_url?: string;
}

interface ClientInfo {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
}

interface DocumentDetails {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  displayName: string;
  placeOfSupply?: string;
  stateCode?: string;
  salesPerson?: string;
  validity?: string;
}

// Default Matrix Network Solutions address
const DEFAULT_ADDRESS = {
  line1: 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
  line2: 'Near Begumpet Metro Station, Opp Country Club, Begumpet,',
  cityLine: 'HYDERABAD 500016',
  stateLine: 'Telangana India',
  phone: '+91 9666 444 888',
  email: 'info@matrix-networksolutions.com',
  website: 'www.matrixnetworksolutions.in',
};

/**
 * Renders the Zoho-style header with exact layout:
 * - Logo + Company address on LEFT (grouped together)
 * - Document title on RIGHT (uppercase, dominant)
 * - Divider line
 * Returns the Y position after the header
 */
export function renderLogoHeader(
  doc: jsPDF,
  company: CompanyInfo,
  title: string,
  logoBase64?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const rightMargin = 14;
  let yPos = 20;

  // ========== LEFT SIDE: Logo + Company Info (Zoho Style) ==========
  let logoEndX = leftMargin;
  
  // Draw logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', leftMargin, yPos - 5, 25, 18);
      logoEndX = leftMargin + 28; // Logo width + small gap
    } catch (e) {
      console.log('Logo rendering skipped:', e);
      logoEndX = leftMargin;
    }
  }

  // Company details immediately right of logo
  let companyY = yPos - 2;
  
  // Company Name (bold, dark blue)
  doc.setFontSize(12);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text(company.name, logoEndX, companyY);
  
  companyY += 4.5;
  doc.setFontSize(7);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Address lines
  doc.text(DEFAULT_ADDRESS.line1, logoEndX, companyY);
  companyY += 3;
  doc.text(DEFAULT_ADDRESS.line2, logoEndX, companyY);
  companyY += 3;
  doc.text(`${DEFAULT_ADDRESS.cityLine}, ${DEFAULT_ADDRESS.stateLine}`, logoEndX, companyY);
  
  // Contact info
  companyY += 3;
  doc.text(`Phone: ${DEFAULT_ADDRESS.phone}  |  Email: ${DEFAULT_ADDRESS.email}`, logoEndX, companyY);
  companyY += 3;
  doc.text(`Web: ${DEFAULT_ADDRESS.website}`, logoEndX, companyY);
  
  // GSTIN (on its own line, bold)
  if (company.gstin) {
    companyY += 3.5;
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${company.gstin}`, logoEndX, companyY);
  }

  // ========== RIGHT SIDE: Document Title (uppercase, dominant) ==========
  const rightX = pageWidth - rightMargin;
  
  doc.setFontSize(16);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue to match company name
  doc.text(title.toUpperCase(), rightX, yPos + 5, { align: 'right' });

  // ========== DIVIDER LINE ==========
  const headerBottom = Math.max(yPos + 20, companyY + 5);
  
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, headerBottom, pageWidth - rightMargin, headerBottom);

  // Reset font
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);

  return headerBottom + 5;
}

/**
 * Renders Bill To / Ship To grid (Zoho style)
 */
export function renderBillShipGrid(
  doc: jsPDF,
  client: ClientInfo,
  yPos: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const rightMargin = 14;
  const colMidX = pageWidth / 2;
  const colWidth = (pageWidth - leftMargin - rightMargin) / 2 - 5;

  // Draw grid boxes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  
  // Left box (Bill To)
  doc.rect(leftMargin, yPos, colWidth, 32);
  // Right box (Ship To)
  doc.rect(colMidX + 2.5, yPos, colWidth, 32);

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
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  
  doc.setFont('NotoSans', 'bold');
  doc.text(client.name, leftMargin + 3, leftY);
  leftY += 4;
  
  doc.setFont('NotoSans', 'normal');
  if (client.address) {
    const addressLines = doc.splitTextToSize(client.address, colWidth - 8);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 3, leftY);
      leftY += 3.5;
    });
  }
  
  const cityStatePin = [client.city, client.state, client.pincode].filter(Boolean).join(', ');
  if (cityStatePin) {
    doc.text(cityStatePin, leftMargin + 3, leftY);
    leftY += 4;
  }
  
  if (client.gstin) {
    doc.setFont('NotoSans', 'bold');
    doc.text(`GSTIN: ${client.gstin}`, leftMargin + 3, leftY);
  }

  // Ship To Content (same as Bill To for now)
  let rightY = yPos + 10;
  
  doc.setFont('NotoSans', 'bold');
  doc.text(client.name, colMidX + 5.5, rightY);
  rightY += 4;
  
  doc.setFont('NotoSans', 'normal');
  if (client.address) {
    const addressLines = doc.splitTextToSize(client.address, colWidth - 8);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, colMidX + 5.5, rightY);
      rightY += 3.5;
    });
  }
  
  if (cityStatePin) {
    doc.text(cityStatePin, colMidX + 5.5, rightY);
    rightY += 4;
  }
  
  if (client.gstin) {
    doc.setFont('NotoSans', 'bold');
    doc.text(`GSTIN: ${client.gstin}`, colMidX + 5.5, rightY);
  }

  return yPos + 35;
}

/**
 * Renders Document Details / Other Details grid (Zoho style)
 */
export function renderDetailsGrid(
  doc: jsPDF,
  details: DocumentDetails,
  yPos: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const rightMargin = 14;
  const colMidX = pageWidth / 2;
  const colWidth = (pageWidth - leftMargin - rightMargin) / 2 - 5;

  // Draw grid boxes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  
  // Left box (Document Details)
  doc.rect(leftMargin, yPos, colWidth, 28);
  // Right box (Other Details)
  doc.rect(colMidX + 2.5, yPos, colWidth, 28);

  // Get the correct header label based on document type
  let detailsLabel = '';
  switch (details.documentType) {
    case 'WORK ORDER': detailsLabel = 'Work Order Details'; break;
    case 'ESTIMATE': detailsLabel = 'Estimate Details'; break;
    case 'QUOTATION': detailsLabel = 'Quotation Details'; break;
    case 'PROFORMA INVOICE': detailsLabel = 'Proforma Invoice Details'; break;
    default: detailsLabel = 'Document Details';
  }

  // Left Header
  doc.setFillColor(245, 245, 245);
  doc.rect(leftMargin, yPos, colWidth, 6, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(detailsLabel, leftMargin + 3, yPos + 4);

  // Right Header
  doc.setFillColor(245, 245, 245);
  doc.rect(colMidX + 2.5, yPos, colWidth, 6, 'F');
  doc.text('Other Details', colMidX + 5.5, yPos + 4);

  // Left Content - Document Details
  let leftY = yPos + 11;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);

  // Document Number
  let docLabel = '';
  switch (details.documentType) {
    case 'WORK ORDER': docLabel = 'Work Order #'; break;
    case 'ESTIMATE': docLabel = 'Estimate #'; break;
    case 'QUOTATION': docLabel = 'Quotation #'; break;
    case 'PROFORMA INVOICE': docLabel = 'Proforma #'; break;
    default: docLabel = 'Document #';
  }
  doc.text(`${docLabel}:`, leftMargin + 3, leftY);
  doc.setFont('NotoSans', 'bold');
  doc.text(details.documentNumber, leftMargin + 28, leftY);
  
  leftY += 5;
  doc.setFont('NotoSans', 'normal');
  doc.text('Date:', leftMargin + 3, leftY);
  doc.text(details.documentDate, leftMargin + 28, leftY);
  
  leftY += 5;
  doc.text('Campaign:', leftMargin + 3, leftY);
  const campaignLines = doc.splitTextToSize(details.displayName, colWidth - 32);
  doc.text(campaignLines[0] || '-', leftMargin + 28, leftY);

  // Right Content - Other Details
  let rightY = yPos + 11;
  
  if (details.placeOfSupply) {
    doc.text('Place of Supply:', colMidX + 5.5, rightY);
    const posText = details.stateCode 
      ? `${details.placeOfSupply} (${details.stateCode})`
      : details.placeOfSupply;
    doc.text(posText, colMidX + 32, rightY);
    rightY += 5;
  }
  
  if (details.salesPerson) {
    doc.text('Sales Person:', colMidX + 5.5, rightY);
    doc.text(details.salesPerson, colMidX + 32, rightY);
    rightY += 5;
  }
  
  if (details.validity) {
    doc.text('Validity:', colMidX + 5.5, rightY);
    doc.text(details.validity, colMidX + 32, rightY);
  }

  return yPos + 31;
}

/**
 * Creates a page header renderer for multi-page documents
 */
export function createPageHeaderRenderer(
  company: CompanyInfo,
  title: string,
  logoBase64?: string
) {
  return (doc: jsPDF): number => {
    return renderLogoHeader(doc, company, title, logoBase64);
  };
}
