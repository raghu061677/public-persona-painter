import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
  pan?: string;
  logo_url?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

/**
 * Renders the company logo header section per Matrix GST Placement spec:
 * - Logo at top-left
 * - Company name + address + GSTIN at top-right
 * - Document title centered below
 * - Divider line
 */
export function renderLogoHeader(
  doc: jsPDF,
  company: CompanyInfo,
  title: string,
  logoBase64?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;

  // ========== TOP-LEFT: Logo only ==========
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, yPos, 25, 25);
    } catch (e) {
      console.log('Logo rendering skipped:', e);
    }
  }

  // ========== TOP-RIGHT: Company name, address, GSTIN ==========
  const rightX = pageWidth - 14;
  let rightY = yPos + 5;

  // Company Name (bold)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text(company.name, rightX, rightY, { align: 'right' });

  // Company Address (multi-line)
  rightY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Default address if not provided
  const addressLines = company.address 
    ? [company.address]
    : [
        'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
        'Near Begumpet Metro Station, Opp Country Club,',
      ];

  addressLines.forEach((line) => {
    doc.text(line, rightX, rightY, { align: 'right' });
    rightY += 4;
  });

  // City, State, Pincode
  const cityLine = company.city && company.state 
    ? `${company.city}, ${company.state} - ${company.pincode || ''}`
    : 'Hyderabad, Telangana - 500016';
  doc.text(cityLine, rightX, rightY, { align: 'right' });
  rightY += 5;

  // Seller GSTIN only (no PAN here)
  if (company.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${company.gstin}`, rightX, rightY, { align: 'right' });
    rightY += 4;
  }

  // ========== CENTER: Document Title (below logo + address row) ==========
  const headerBottom = Math.max(yPos + 28, rightY + 2);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, headerBottom, { align: 'center' });

  // ========== Divider line ==========
  const dividerY = headerBottom + 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  // Reset font
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Return the Y position after the header
  return dividerY + 4;
}

/**
 * Renders company logo and info for multi-page documents
 * Can be used in autoTable's didDrawPage callback
 */
export function createPageHeaderRenderer(
  company: CompanyInfo,
  title: string,
  logoBase64?: string
) {
  return (doc: jsPDF) => {
    renderLogoHeader(doc, company, title, logoBase64);
  };
}
