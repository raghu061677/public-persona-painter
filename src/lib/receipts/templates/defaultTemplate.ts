// Receipt Default Template - Professional Layout
import jsPDF from 'jspdf';
import { ReceiptData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS } from './types';

export async function renderReceiptDefaultTemplate(data: ReceiptData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Company info
  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  let yPos = 15;

  // ========== HEADER SECTION ==========
  const logoWidth = 40;
  const logoHeight = 30;
  let logoEndX = leftMargin;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, logoWidth, logoHeight);
      logoEndX = leftMargin + logoWidth + 8;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name - Bold
  let textY = yPos + 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, logoEndX, textY);

  // Company Address lines
  textY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(COMPANY_ADDRESS.line1, logoEndX, textY);
  textY += 3.5;
  doc.text(COMPANY_ADDRESS.line2, logoEndX, textY);
  textY += 3.5;
  doc.text(`${COMPANY_ADDRESS.cityLine} ${COMPANY_ADDRESS.country}`, logoEndX, textY);

  // Contact info
  textY += 4;
  doc.text(`Phone: ${COMPANY_ADDRESS.phone}`, logoEndX, textY);
  textY += 3.5;
  doc.text(COMPANY_ADDRESS.email, logoEndX, textY);

  // GSTIN
  textY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, textY);

  // Document title - Right aligned
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald color for receipts
  doc.text('PAYMENT RECEIPT', pageWidth - rightMargin, textY, { align: 'right' });

  yPos = yPos + logoHeight + 8;

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 6;

  // ========== RECEIPT DETAILS (2-column grid) ==========
  const leftColX = leftMargin;
  const rightColX = pageWidth / 2 + 10;
  const labelWidth = 26;

  doc.setFontSize(9);
  let detailRowY = yPos;

  // Row 1: Receipt No / Receipt Date
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Receipt No', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.receipt.receipt_no}`, leftColX + labelWidth, detailRowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Receipt Date', rightColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${formatDate(data.receipt.receipt_date)}`, rightColX + 28, detailRowY);
  
  detailRowY += 5;

  // Row 2: Invoice No / Invoice Date
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Invoice No', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.invoice.invoice_no || data.invoice.id}`, leftColX + labelWidth, detailRowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Invoice Date', rightColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${formatDate(data.invoice.invoice_date)}`, rightColX + 28, detailRowY);
  
  detailRowY += 5;

  // Row 3: Payment Method / Reference
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Payment Mode', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.receipt.payment_method || 'N/A'}`, leftColX + labelWidth, detailRowY);
  
  if (data.receipt.reference_no) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Reference/UTR', rightColX, detailRowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`: ${data.receipt.reference_no}`, rightColX + 28, detailRowY);
  }

  yPos = detailRowY + 10;

  // ========== RECEIVED FROM SECTION ==========
  doc.setFillColor(30, 64, 130);
  doc.rect(leftMargin, yPos, contentWidth, 6, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Received From', leftMargin + 3, yPos + 4.5);

  yPos += 6;

  // Client box
  const clientBoxHeight = 25;
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftMargin, yPos, contentWidth, clientBoxHeight, 'S');

  let clientY = yPos + 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.name || 'Client', leftMargin + 4, clientY);
  
  clientY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  
  const clientAddress = data.client.billing_address_line1 || '';
  if (clientAddress) {
    doc.text(clientAddress, leftMargin + 4, clientY);
    clientY += 4;
  }

  const cityStatePin = [
    data.client.billing_city,
    data.client.billing_state,
    data.client.billing_pincode
  ].filter(Boolean).join(', ');
  
  if (cityStatePin) {
    doc.text(cityStatePin, leftMargin + 4, clientY);
    clientY += 4;
  }

  if (data.client.gst_number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${data.client.gst_number}`, leftMargin + 4, clientY);
  }

  yPos = yPos + clientBoxHeight + 10;

  // ========== PAYMENT DETAILS BOX ==========
  doc.setFillColor(240, 253, 244); // Light green background
  doc.setDrawColor(16, 185, 129); // Emerald border
  doc.setLineWidth(0.5);
  doc.rect(leftMargin, yPos, contentWidth, 50, 'FD');

  let paymentY = yPos + 8;
  
  // Amount Received (large)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Amount Received', leftMargin + 4, paymentY);
  
  paymentY += 8;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.receipt.amount_received), leftMargin + 4, paymentY);

  paymentY += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Amount in Words:', leftMargin + 4, paymentY);
  
  paymentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const amountInWords = numberToWords(Math.round(data.receipt.amount_received));
  doc.text(`Indian Rupees ${amountInWords} Only`, leftMargin + 4, paymentY);

  // Invoice Summary (right side)
  const summaryX = pageWidth / 2 + 20;
  let summaryY = yPos + 8;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  doc.text('Invoice Total:', summaryX, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.invoice.total_amount), summaryX + 35, summaryY);
  
  summaryY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('This Payment:', summaryX, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.receipt.amount_received), summaryX + 35, summaryY);
  
  summaryY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Balance After:', summaryX, summaryY);
  
  const balanceAfter = data.invoice.balance_due;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balanceAfter > 0 ? 220 : 16, balanceAfter > 0 ? 38 : 185, balanceAfter > 0 ? 38 : 129);
  doc.text(formatCurrency(balanceAfter), summaryX + 35, summaryY);

  yPos = yPos + 55;

  // ========== NOTES (if any) ==========
  if (data.receipt.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes:', leftMargin, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(data.receipt.notes, contentWidth);
    noteLines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 4;
    });
    
    yPos += 5;
  }

  // ========== THANK YOU MESSAGE ==========
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Thank you for your payment!', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;

  // ========== AUTHORIZED SIGNATORY (Bottom-right anchored) ==========
  const signY = Math.max(yPos, 230);
  const signX = pageWidth - rightMargin - 50;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('For Matrix Network Solutions', signX, signY);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(signX, signY + 15, signX + 50, signY + 15);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX + 10, signY + 19);

  // Footer
  const footerY = 285;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer generated receipt.', pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
}
