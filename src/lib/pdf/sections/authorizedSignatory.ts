import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
}

/**
 * Renders the Authorized Signatory block (bottom-right aligned)
 * Per Zoho style spec:
 * - "For," + company name
 * - Signature placeholder line
 * - "Authorized Signatory" label
 * - NO GSTIN or PAN in footer
 */
export function renderAuthorizedSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = 14;
  const x = pageWidth - rightMargin - 50; // Right-aligned position

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // "For," text
  doc.text('For,', x, yPos);
  
  // Company name (bold)
  doc.setFont('NotoSans', 'bold');
  doc.text(company.name, x, yPos + 5);
  
  // Signature line/space
  doc.setFont('NotoSans', 'normal');
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(x, yPos + 20, x + 50, yPos + 20);
  
  // "Authorized Signatory" label
  doc.setFontSize(8);
  doc.text('Authorized Signatory', x, yPos + 25);
}

/**
 * Renders ONLY the authorized signatory block (right side)
 * Footer must NOT contain seller GST/PAN
 */
export function renderSellerFooterWithSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): void {
  // Only render the authorized signatory block on the right
  // NO seller info with GSTIN on the left per spec
  renderAuthorizedSignatory(doc, company, yPos);
}
