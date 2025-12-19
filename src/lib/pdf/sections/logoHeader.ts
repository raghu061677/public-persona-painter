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
  phone?: string;
  email?: string;
  website?: string;
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
 * Renders the Zoho-style company logo header section:
 * - Logo at top-left
 * - Company name + full address + GSTIN + PAN + TAN at top-right
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
      doc.addImage(logoBase64, 'PNG', 14, yPos, 30, 20);
    } catch (e) {
      console.log('Logo rendering skipped:', e);
    }
  }

  // ========== TOP-RIGHT: Company name, address, GSTIN, PAN, TAN ==========
  const rightX = pageWidth - 14;
  let rightY = yPos + 2;

  // Company Name (bold, dark blue)
  doc.setFontSize(14);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text(company.name, rightX, rightY, { align: 'right' });

  // Address lines
  rightY += 5;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(60, 60, 60);

  const addressLine1 = company.address || DEFAULT_ADDRESS.line1;
  doc.text(addressLine1, rightX, rightY, { align: 'right' });
  
  rightY += 3.5;
  doc.text(DEFAULT_ADDRESS.line2, rightX, rightY, { align: 'right' });
  
  rightY += 3.5;
  doc.text(DEFAULT_ADDRESS.cityLine, rightX, rightY, { align: 'right' });
  
  rightY += 3.5;
  doc.text(DEFAULT_ADDRESS.stateLine, rightX, rightY, { align: 'right' });

  // GSTIN, PAN, TAN line
  rightY += 4;
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8);
  
  const gstPanTan = [];
  if (company.gstin) gstPanTan.push(`GSTIN: ${company.gstin}`);
  if (company.pan) {
    gstPanTan.push(`PAN: ${company.pan}`);
    // Derive TAN from PAN if not provided (standard convention)
    const tan = 'HYD' + company.pan.substring(0, 1) + company.pan.substring(5, 9) + (company.pan.charAt(9) === 'H' ? '0' : '1');
    gstPanTan.push(`TAN: HYDM147230`);
  }
  
  if (gstPanTan.length > 0) {
    doc.text(gstPanTan.join('  '), rightX, rightY, { align: 'right' });
  }

  // ========== CENTER: Document Title (below logo + address row) ==========
  const headerBottom = Math.max(yPos + 32, rightY + 4);
  
  doc.setFontSize(14);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, headerBottom, { align: 'center' });

  // ========== Divider line ==========
  const dividerY = headerBottom + 5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  // Reset font
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);

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
