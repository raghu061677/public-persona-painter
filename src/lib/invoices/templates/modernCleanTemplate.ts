// Modern Clean Template - Minimal, Professional Design
// For agencies, premium brands, digital campaigns

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';

export async function renderModernCleanTemplate(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 18;
  const rightMargin = 18;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  let yPos = 20;

  // ========== MODERN HEADER - Clean single line ==========
  // Logo left
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos - 5, 30, 22);
    } catch (e) {
      console.log('Logo error:', e);
    }
  }

  // Document title right - large, accent color
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue accent
  doc.text(docTitle, pageWidth - rightMargin, yPos + 5, { align: 'right' });

  // Invoice number below title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`#${data.invoice.invoice_no || data.invoice.id}`, pageWidth - rightMargin, yPos + 12, { align: 'right' });

  yPos += 28;

  // Light separator
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 10;

  // ========== FROM / TO SECTION - 2 column clean layout ==========
  const colWidth = contentWidth / 2 - 5;
  
  // FROM column
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('FROM', leftMargin, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(companyName, leftMargin, yPos + 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let fromY = yPos + 10;
  doc.text(COMPANY_ADDRESS.line1, leftMargin, fromY);
  fromY += 3.5;
  doc.text(COMPANY_ADDRESS.cityLine, leftMargin, fromY);
  fromY += 3.5;
  doc.text(`GSTIN: ${companyGSTIN}`, leftMargin, fromY);

  // TO column
  const toX = leftMargin + colWidth + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('BILL TO', toX, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(data.client.name || 'Client', toX, yPos + 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let toY = yPos + 10;
  
  const clientAddr = data.client.billing_address_line1 || '';
  if (clientAddr) {
    const lines = doc.splitTextToSize(clientAddr, colWidth - 5);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, toX, toY);
      toY += 3.5;
    });
  }
  
  const cityState = [data.client.billing_city, data.client.billing_state].filter(Boolean).join(', ');
  if (cityState) {
    doc.text(cityState, toX, toY);
    toY += 3.5;
  }
  
  if (data.client.gst_number) {
    doc.text(`GSTIN: ${data.client.gst_number}`, toX, toY);
  }

  yPos += 30;

  // ========== INVOICE DETAILS - Horizontal pills ==========
  const details = [
    { label: 'Date', value: formatDate(data.invoice.invoice_date) },
    { label: 'Due', value: formatDate(data.invoice.due_date) },
    { label: 'Terms', value: data.invoice.terms_mode === 'NET_30' ? 'Net 30' : 'Due on Receipt' },
    { label: 'HSN/SAC', value: HSN_SAC_CODE },
  ];

  doc.setFontSize(7);
  let pillX = leftMargin;
  details.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, pillX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, pillX, yPos + 4);
    pillX += 38;
  });

  yPos += 15;

  // ========== CAMPAIGN BANNER ==========
  if (data.campaign?.campaign_name) {
    doc.setFillColor(245, 247, 250);
    doc.rect(leftMargin, yPos, contentWidth, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 3, yPos + 5.5);
    
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${formatDate(data.campaign.start_date)} – ${formatDate(data.campaign.end_date)}`, pageWidth - rightMargin - 3, yPos + 5.5, { align: 'right' });
    }
    
    yPos += 12;
  }

  // ========== ITEMS TABLE - Zebra rows, minimal borders ==========
  const tableData = data.items.map((item: any, index: number) => {
    const desc = `${item.asset_id || ''} - ${item.location || item.description || 'Media Display'}`;
    const period = item.start_date && item.end_date 
      ? `${formatDate(item.start_date)} to ${formatDate(item.end_date)}`
      : '-';
    const rate = item.rate || item.unit_price || item.negotiated_rate || 0;
    const amount = item.amount || item.final_price || rate;

    return [
      (index + 1).toString(),
      desc,
      item.dimensions || '-',
      period,
      formatCurrency(rate),
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Size', 'Period', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 38 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    didDrawCell: function(data) {
      // Draw bottom border on each row
      if (data.section === 'body') {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // ========== TOTALS CARD - Right aligned summary ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || 0;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  const cardWidth = 75;
  const cardX = pageWidth - rightMargin - cardWidth;
  
  // Card background
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(cardX, yPos, cardWidth, 40, 2, 2, 'FD');

  const labelX = cardX + 5;
  const valueX = cardX + cardWidth - 5;
  let rowY = yPos + 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', labelX, rowY);
  doc.text(formatCurrency(subtotal), valueX, rowY, { align: 'right' });

  rowY += 7;
  doc.text('GST (18%)', labelX, rowY);
  doc.text(formatCurrency(gstAmount), valueX, rowY, { align: 'right' });

  rowY += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(cardX + 3, rowY - 4, cardX + cardWidth - 3, rowY - 4);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Total', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 8;
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  // Amount in words (left side)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Amount in Words:', leftMargin, yPos + 5);
  doc.setTextColor(40, 40, 40);
  const words = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${words} Only`, leftMargin, yPos + 10);

  yPos += 50;

  // Check page space
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = 20;
  }

  // ========== PAYMENT QR (Right side) ==========
  const upiId = data.orgSettings?.upi_id || data.company?.upi_id;
  const upiName = data.orgSettings?.upi_name || data.company?.upi_name;
  const invoiceStatus = data.invoice.status || 'Draft';
  const qrX = pageWidth - rightMargin - 30;
  const qrY = yPos;
  
  const qrHeight = await renderPaymentQRSection(doc, {
    upiId,
    upiName,
    balanceDue,
    invoiceNo: data.invoice.invoice_no || data.invoice.id,
    invoiceStatus,
    x: qrX,
    y: qrY,
  });

  // ========== BANK DETAILS - Compact inline (left side) ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('PAYMENT DETAILS', leftMargin, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('HDFC Bank | A/C: 50200010727301 | IFSC: HDFC0001555 | Karkhana Road, Secunderabad', leftMargin, yPos);

  // Adjust for QR height
  yPos = Math.max(yPos + 8, qrY + qrHeight);

  // ========== TERMS - Single line compact ==========
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Terms: Sites subject to availability. Payment in advance. Disputes settled at Telangana jurisdiction.', leftMargin, yPos);

  // ========== SIGNATURE - Bottom right ==========
  const signY = pageHeight - 25;
  const signX = pageWidth - rightMargin - 45;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('For ' + companyName, signX, signY);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(signX, signY + 10, signX + 42, signY + 10);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, signY + 14);

  return doc.output('blob');
}
