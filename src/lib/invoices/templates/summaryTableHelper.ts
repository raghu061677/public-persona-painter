// Shared boxed summary table renderer for all invoice templates
// Matches the style used in RO and Quotation PDFs

import jsPDF from 'jspdf';
import { formatCurrency, numberToWords } from './types';

interface SummaryTableOptions {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  balanceDue: number;
  isInterState?: boolean;
}

/**
 * Renders a professional boxed summary table with:
 * - Sub Total
 * - CGST/SGST or IGST rows
 * - Total row (blue highlighted)
 * - Balance Due row (red highlighted)
 * - Amount in Words below
 * 
 * Returns the Y position after the rendered section.
 */
export function renderInvoiceSummaryTable(options: SummaryTableOptions): number {
  const { doc, x, y, width, subtotal, gstPercent, gstAmount, grandTotal, balanceDue, isInterState } = options;

  const cgstAmount = isInterState ? 0 : gstAmount / 2;
  const sgstAmount = isInterState ? 0 : gstAmount / 2;
  const igstAmount = isInterState ? gstAmount : 0;

  const col1W = width * 0.55;
  const col2W = width - col1W;
  const rowH = 6.5;

  type SummaryRow = { label: string; value: number; bold?: boolean; highlight?: 'blue' | 'gray' };

  const rows: SummaryRow[] = [
    { label: 'Sub Total', value: subtotal },
  ];

  if (isInterState) {
    rows.push({ label: `IGST (${gstPercent}%)`, value: igstAmount });
  } else {
    rows.push({ label: `CGST (${gstPercent / 2}%)`, value: cgstAmount });
    rows.push({ label: `SGST (${gstPercent / 2}%)`, value: sgstAmount });
  }

  rows.push({ label: 'Total', value: grandTotal, bold: true, highlight: 'blue' });
  rows.push({ label: 'Balance Due', value: balanceDue, bold: true, highlight: 'gray' });

  let currentY = y;

  rows.forEach((row) => {
    // Add spacing before Total row
    if (row.highlight === 'blue') {
      currentY += 2;
    }

    // Background fill
    if (row.highlight === 'blue') {
      doc.setFillColor(30, 64, 175); // #1E40AF
      doc.rect(x, currentY, width, rowH, 'F');
    } else if (row.highlight === 'gray') {
      doc.setFillColor(243, 244, 246); // #F3F4F6
      doc.rect(x, currentY, width, rowH, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, currentY, width, rowH, 'F');
    }

    // Cell borders
    doc.setDrawColor(209, 213, 219); // #D1D5DB
    doc.setLineWidth(0.3);
    doc.rect(x, currentY, col1W, rowH, 'S');
    doc.rect(x + col1W, currentY, col2W, rowH, 'S');

    // Balance Due top border emphasis
    if (row.highlight === 'gray') {
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.line(x, currentY, x + width, currentY);
    }

    // Text color
    const isTotal = row.highlight === 'blue';
    const textR = isTotal ? 255 : 17;  // #FFFFFF or #111827
    const textG = isTotal ? 255 : 24;
    const textB = isTotal ? 255 : 39;

    // Label
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 8.5 : 8);
    doc.setTextColor(textR, textG, textB);
    doc.text(row.label, x + 3, currentY + rowH - 2);

    // Value (right-aligned)
    doc.text(formatCurrency(row.value), x + col1W + col2W - 3, currentY + rowH - 2, { align: 'right' });

    currentY += rowH;
  });

  // Amount in Words below
  currentY += 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const totalWords = numberToWords(Math.round(grandTotal));
  const amountWordsText = `Total (In Words): Indian Rupees ${totalWords} Only`;
  const wrappedAmountWords = doc.splitTextToSize(amountWordsText, width);
  wrappedAmountWords.forEach((line: string) => {
    doc.text(line, x, currentY);
    currentY += 3.5;
  });

  return currentY;
}
