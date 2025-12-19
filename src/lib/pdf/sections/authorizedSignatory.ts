import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  gstin?: string;
}

/**
 * Renders the Authorized Signatory block (bottom-right aligned)
 * Per Matrix GST Placement spec:
 * - "For," + company name
 * - Signature placeholder
 * - Signatory name
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
  doc.line(x, yPos + 18, x + 50, yPos + 18);
  
  // Signatory name
  doc.setFontSize(9);
  doc.text('Raghu Gajula', x, yPos + 23);
  
  // "Authorized Signature" label
  doc.setFontSize(8);
  doc.text('Authorized Signature', x, yPos + 28);
}

/**
 * Renders ONLY the authorized signatory block (right side)
 * Per Matrix GST Placement spec - footer must NOT contain seller GST/PAN
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
