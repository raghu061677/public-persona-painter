import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
}

/**
 * Renders the Authorized Signatory block (bottom-right aligned)
 * Per Matrix GST Placement spec:
 * - "For," + company name
 * - Signature line
 * - "Authorized Signatory" label
 * - NO GSTIN or PAN in footer
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
 * Renders ONLY the authorized signatory block (right side)
 * Per Matrix GST Placement spec - footer must NOT contain seller GST/PAN
 * Use this for the standardized footer layout
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
