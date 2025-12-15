import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
}

/**
 * Renders the Authorized Signatory block (bottom-right aligned)
 * - "For," + company name
 * - Signature line
 * - "Authorized Signatory" label
 */
export function renderAuthorizedSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x = pageWidth - 70; // Right-aligned position

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // "For," text
  doc.text('For,', x, yPos);
  
  // Company name (bold)
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, x, yPos + 6);
  
  // Signature line
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(x, yPos + 20, x + 50, yPos + 20);
  
  // "Authorized Signatory" label
  doc.setFontSize(9);
  doc.text('Authorized Signatory', x, yPos + 26);
}

/**
 * Renders seller footer (left side) + authorized signatory (right side)
 * Use this for balanced footer layout
 */
export function renderSellerFooterWithSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Left side: Seller info
  doc.text('For,', 15, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 15, yPos + 6);
  doc.setFont('helvetica', 'normal');
  if (company.gstin) {
    doc.text(`GSTIN: ${company.gstin}`, 15, yPos + 12);
  }
  
  // Right side: Authorized Signatory
  renderAuthorizedSignatory(doc, company, yPos);
}
