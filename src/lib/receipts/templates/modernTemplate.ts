// Receipt Modern Template - Clean Minimalist Layout
import jsPDF from 'jspdf';
import { ReceiptData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS } from './types';

export async function renderReceiptModernTemplate(data: ReceiptData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Company info
  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  let yPos = 20;

  // ========== MINIMAL HEADER ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 130);
  doc.text(companyName, leftMargin, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`GSTIN: ${companyGSTIN}`, leftMargin, yPos + 5);

  // Receipt label - right side
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('RECEIPT', pageWidth - rightMargin, yPos, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.receipt.receipt_no, pageWidth - rightMargin, yPos + 7, { align: 'right' });

  yPos += 20;

  // Thin divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 15;

  // ========== TWO COLUMN LAYOUT ==========
  const colWidth = contentWidth / 2 - 5;

  // Left Column - Receipt Details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('RECEIPT DATE', leftMargin, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(data.receipt.receipt_date), leftMargin, yPos + 5);

  // Right Column - Invoice Reference
  const rightColX = leftMargin + colWidth + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('AGAINST INVOICE', rightColX, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.invoice.invoice_no || data.invoice.id, rightColX, yPos + 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`dated ${formatDate(data.invoice.invoice_date)}`, rightColX, yPos + 10);

  yPos += 25;

  // ========== RECEIVED FROM ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('RECEIVED FROM', leftMargin, yPos);

  yPos += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.name || 'Client', leftMargin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  if (data.client.billing_address_line1) {
    doc.text(data.client.billing_address_line1, leftMargin, yPos);
    yPos += 4;
  }

  const cityStatePin = [
    data.client.billing_city,
    data.client.billing_state,
    data.client.billing_pincode
  ].filter(Boolean).join(', ');
  
  if (cityStatePin) {
    doc.text(cityStatePin, leftMargin, yPos);
    yPos += 4;
  }

  if (data.client.gst_number) {
    doc.text(`GSTIN: ${data.client.gst_number}`, leftMargin, yPos);
    yPos += 4;
  }

  yPos += 15;

  // ========== AMOUNT CARD ==========
  const cardHeight = 60;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1);
  doc.roundedRect(leftMargin, yPos, contentWidth, cardHeight, 4, 4, 'FD');

  let cardY = yPos + 12;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('AMOUNT RECEIVED', leftMargin + 10, cardY);

  cardY += 10;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.receipt.amount_received), leftMargin + 10, cardY);

  cardY += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const amountInWords = numberToWords(Math.round(data.receipt.amount_received));
  doc.text(`${amountInWords} Rupees Only`, leftMargin + 10, cardY);

  // Payment details on right of card
  const detailsX = pageWidth - rightMargin - 60;
  let detailsY = yPos + 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Payment Method', detailsX, detailsY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.receipt.payment_method || 'N/A', detailsX, detailsY + 5);

  if (data.receipt.reference_no) {
    detailsY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Reference/UTR', detailsX, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(data.receipt.reference_no, detailsX, detailsY + 5);
  }

  yPos = yPos + cardHeight + 15;

  // ========== BALANCE SUMMARY ==========
  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - rightMargin - summaryBoxWidth;
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(summaryBoxX, yPos, summaryBoxWidth, 30, 'FD');

  let sumY = yPos + 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Total', summaryBoxX + 4, sumY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.invoice.total_amount), summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Balance After Payment', summaryBoxX + 4, sumY);
  
  const balanceAfter = data.invoice.balance_due;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balanceAfter > 0 ? 239 : 16, balanceAfter > 0 ? 68 : 185, balanceAfter > 0 ? 68 : 129);
  doc.text(formatCurrency(balanceAfter), summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

  if (balanceAfter <= 0) {
    sumY += 8;
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(summaryBoxX + 15, sumY - 2, 50, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FULLY PAID', summaryBoxX + 40, sumY + 3, { align: 'center' });
  }

  yPos += 45;

  // ========== NOTES ==========
  if (data.receipt.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', leftMargin, yPos);
    
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(data.receipt.notes, contentWidth);
    noteLines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 4;
    });
  }

  // ========== FOOTER ==========
  const footerY = 260;
  
  // Thank you message
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('Thank you for your payment', pageWidth / 2, footerY, { align: 'center' });

  // Company contact
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(COMPANY_ADDRESS.email, pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(COMPANY_ADDRESS.phone, pageWidth / 2, footerY + 13, { align: 'center' });

  // Authorized signatory
  const signX = pageWidth - rightMargin - 45;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('For ' + companyName, signX, footerY + 5);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(signX, footerY + 18, signX + 45, footerY + 18);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Signatory', signX + 5, footerY + 22);

  return doc.output('blob');
}
