// Shared boxed summary table renderer for all invoice templates
// Matches the style used in RO and Quotation PDFs

import jsPDF from 'jspdf';
import { formatCurrency, formatDate, numberToWords } from './types';

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
  paidAmount?: number;
  tdsAmount?: number;
  paidDate?: string | null;
  isInterState?: boolean;
}

/**
 * Renders a professional boxed summary table with:
 * - Sub Total
 * - CGST/SGST or IGST rows
 * - Total row (blue highlighted)
 * - Amount in Words below
 * 
 * Returns { endY, totalRowBottomY } where totalRowBottomY is the bottom of the blue Total row.
 */
export function renderInvoiceSummaryTable(options: SummaryTableOptions): { endY: number; totalRowBottomY: number } {
  const { doc, x, y, width, subtotal, gstPercent, gstAmount, grandTotal, balanceDue, paidAmount, tdsAmount, paidDate, isInterState } = options;

  const cgstAmount = isInterState ? 0 : gstAmount / 2;
  const sgstAmount = isInterState ? 0 : gstAmount / 2;
  const igstAmount = isInterState ? gstAmount : 0;

  const col1W = width * 0.55;
  const col2W = width - col1W;
  const rowH = 6.5;

  type SummaryRow = { label: string; value: number; bold?: boolean; highlight?: 'blue' | 'gray' | 'green' | 'orange' };

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

  // Add Amount Received, TDS, and Balance Due if there are payments
  const effectivePaid = paidAmount != null ? paidAmount : (grandTotal - balanceDue - (tdsAmount || 0));
  const effectiveTds = tdsAmount || 0;
  if (effectivePaid > 0 || effectiveTds > 0) {
    const dateStr = paidDate ? ` (${formatDate(paidDate)})` : '';
    if (effectivePaid > 0) {
      rows.push({ label: `Amount Received${dateStr}`, value: effectivePaid, bold: true, highlight: 'green' });
    }
    if (effectiveTds > 0) {
      rows.push({ label: 'TDS Deducted', value: effectiveTds, bold: true, highlight: 'green' });
    }
    rows.push({ label: 'Balance Due', value: balanceDue, bold: true, highlight: 'orange' });
  }

  let currentY = y;
  let totalRowBottomY = y;

  rows.forEach((row) => {
    // Add spacing before Total row or Amount Received row
    if (row.highlight === 'blue' || row.highlight === 'green') {
      currentY += 2;
    }

    // Background fill
    if (row.highlight === 'blue') {
      doc.setFillColor(30, 64, 175); // #1E40AF
      doc.rect(x, currentY, width, rowH, 'F');
    } else if (row.highlight === 'green') {
      doc.setFillColor(240, 253, 244); // Light green bg
      doc.rect(x, currentY, width, rowH, 'F');
    } else if (row.highlight === 'orange') {
      doc.setFillColor(255, 247, 237); // Light orange bg
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
    const isGreen = row.highlight === 'green';
    const isOrange = row.highlight === 'orange';
    let textR = 17, textG = 24, textB = 39;
    if (isTotal) { textR = 255; textG = 255; textB = 255; }
    else if (isGreen) { textR = 22; textG = 163; textB = 74; } // green-600
    else if (isOrange) { textR = 234; textG = 88; textB = 12; } // orange-600

    // Label
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 8.5 : 8);
    doc.setTextColor(textR, textG, textB);
    doc.text(row.label, x + 3, currentY + rowH - 2);

    // Value (right-aligned)
    doc.text(formatCurrency(row.value), x + col1W + col2W - 3, currentY + rowH - 2, { align: 'right' });

    currentY += rowH;

    // Track bottom of Total (blue) row
    if (row.highlight === 'blue') {
      totalRowBottomY = currentY;
    }
  });

  // Amount in Words below
  currentY += 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const totalWords = numberToWords(Math.round(grandTotal));
  const amountWordsText = `Total (In Words): ${totalWords} Rupees Only`;
  const wrappedAmountWords = doc.splitTextToSize(amountWordsText, width);
  wrappedAmountWords.forEach((line: string) => {
    doc.text(line, x, currentY);
    currentY += 3.5;
  });

  return { endY: currentY, totalRowBottomY };
}
