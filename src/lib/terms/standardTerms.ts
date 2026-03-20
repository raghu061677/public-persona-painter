/**
 * Standardized Short Terms & Conditions for Go-Ads 360°
 * 
 * Single source of truth used across:
 * - Invoice view page (InvoiceTemplateZoho)
 * - All 3 invoice PDF templates (default, modern clean, classic tax)
 * - Quotation PDF (standardPDFTemplate)
 * - Proforma Invoice PDF
 * - Release Order PDF
 * - Work Order PDF
 * 
 * DO NOT duplicate or hardcode terms elsewhere.
 */

export const STANDARD_SHORT_TERMS: string[] = [
  'Payment: 100% advance or within 7 days from invoice date',
  'GST extra as applicable',
  'TDS (if applicable) must be deposited under our PAN & Form 16A to be shared within timeline',
  'Media subject to availability; blocking valid for 24 hours with written confirmation',
  'Campaign duration as per agreed dates; extension to be informed 7–10 days prior',
  'Printing & mounting charges extra unless specified',
  'No liability for flex damage, theft, or wear & tear after installation',
  'Replacement (if required) will be charged additionally',
  'Any discrepancies must be reported within 48 hours',
  'Jurisdiction: Hyderabad',
];

/**
 * Renders terms as a bordered box in jsPDF documents.
 * Shared renderer for consistent styling across all PDF exports.
 * 
 * @returns new yPos after rendering
 */
export function renderTermsBoxPDF(
  doc: any, // jsPDF instance
  yPos: number,
  options: {
    pageWidth: number;
    pageHeight: number;
    leftMargin: number;
    rightMargin: number;
    bottomMargin?: number;
    fontFamily?: string;
    onNewPage?: () => number; // callback when new page needed, returns new yPos
  }
): number {
  const {
    pageWidth,
    pageHeight,
    leftMargin,
    rightMargin,
    bottomMargin = 15,
    fontFamily = 'helvetica',
    onNewPage,
  } = options;

  const contentWidth = pageWidth - leftMargin - rightMargin;
  const terms = STANDARD_SHORT_TERMS;

  // Pre-calculate height needed
  let estimatedHeight = 14; // title + padding
  terms.forEach((term, idx) => {
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, contentWidth - 8);
    estimatedHeight += lines.length * 3.8 + 1.5;
  });
  estimatedHeight += 6; // bottom padding

  // Check if we need a new page
  if (yPos + estimatedHeight > pageHeight - bottomMargin) {
    if (onNewPage) {
      yPos = onNewPage();
    } else {
      doc.addPage();
      yPos = 20;
    }
  }

  const boxStartY = yPos;

  // Draw border box
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);

  // Title
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont(fontFamily, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', leftMargin + 4, yPos);
  yPos += 6;

  // Terms text
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);

  terms.forEach((term, idx) => {
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, contentWidth - 8);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin + 4, yPos);
      yPos += 3.8;
    });
    yPos += 1;
  });

  yPos += 3;

  // Draw the border rectangle around the whole section
  doc.rect(leftMargin, boxStartY, contentWidth, yPos - boxStartY);

  yPos += 4;
  return yPos;
}
