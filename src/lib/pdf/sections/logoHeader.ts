import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
  pan?: string;
  logo_url?: string;
}

/**
 * Renders the company logo header section
 * - Logo at top-left
 * - Company name centered
 * - Document title below
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

  // Try to add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, yPos, 25, 25);
    } catch (e) {
      console.log('Logo rendering skipped:', e);
    }
  }

  // Company Name (centered)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text(company.name, pageWidth / 2, yPos + 10, { align: 'center' });

  // Document Title (centered, below company name)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, yPos + 18, { align: 'center' });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, yPos + 28, pageWidth - 14, yPos + 28);

  // Reset font
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Return the Y position after the header
  return yPos + 32;
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
