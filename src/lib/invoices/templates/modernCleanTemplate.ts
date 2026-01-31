// Modern Clean Template - Minimal, Professional Design
// For agencies, premium brands, digital campaigns
// Updated: Ship To + Dimension + Illumination columns

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
  // Standardized margins: 20mm top, 12mm left/right, 15mm bottom
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  let yPos = 20;

  // ========== MODERN HEADER - Clean single line ==========
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos - 5, 28, 20);
    } catch (e) {
      console.log('Logo error:', e);
    }
  }

  // Document title right - large, accent color
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue accent
  doc.text(docTitle, pageWidth - rightMargin, yPos + 4, { align: 'right' });

  // Invoice number below title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`#${data.invoice.invoice_no || data.invoice.id}`, pageWidth - rightMargin, yPos + 11, { align: 'right' });

  yPos += 24;

  // Light separator
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 8;

  // ========== FROM / BILL TO / SHIP TO SECTION ==========
  const colWidth = contentWidth / 3 - 4;
  
  // FROM column
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('FROM', leftMargin, yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(companyName, leftMargin, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let fromY = yPos + 9;
  doc.text(COMPANY_ADDRESS.line1, leftMargin, fromY);
  fromY += 3;
  doc.text(COMPANY_ADDRESS.cityLine, leftMargin, fromY);
  fromY += 3;
  doc.text(`GSTIN: ${companyGSTIN}`, leftMargin, fromY);

  // Build Bill To and Ship To addresses
  const billTo = {
    name: data.client.name || 'Client',
    address1: data.client.billing_address_line1 || data.client.address || '',
    city: data.client.billing_city || data.client.city || '',
    state: data.client.billing_state || data.client.state || '',
    pincode: data.client.billing_pincode || data.client.pincode || '',
    gstin: data.client.gst_number || '',
  };

  const hasShippingAddress = !!(data.client.shipping_address_line1 || data.client.shipping_city);
  const shipTo = {
    name: data.client.name || 'Client',
    address1: data.client.shipping_address_line1 || billTo.address1,
    city: data.client.shipping_city || billTo.city,
    state: data.client.shipping_state || billTo.state,
    pincode: data.client.shipping_pincode || billTo.pincode,
    gstin: billTo.gstin,
    sameAsBillTo: !hasShippingAddress,
  };

  // BILL TO column
  const billToX = leftMargin + colWidth + 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('BILL TO', billToX, yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(billTo.name, billToX, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let toY = yPos + 9;
  
  if (billTo.address1) {
    const lines = doc.splitTextToSize(billTo.address1, colWidth - 2);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, billToX, toY);
      toY += 3;
    });
  }
  
  const cityState = [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ');
  if (cityState) {
    doc.text(cityState, billToX, toY);
    toY += 3;
  }
  
  if (billTo.gstin) {
    doc.text(`GSTIN: ${billTo.gstin}`, billToX, toY);
  }

  // SHIP TO column
  const shipToX = billToX + colWidth + 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('SHIP TO', shipToX, yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  let shipNameText = shipTo.name;
  doc.text(shipNameText, shipToX, yPos + 5);
  
  if (shipTo.sameAsBillTo) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('(Same as Bill To)', shipToX, yPos + 9);
  }
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let shipY = yPos + (shipTo.sameAsBillTo ? 12 : 9);
  
  if (shipTo.address1) {
    const lines = doc.splitTextToSize(shipTo.address1, colWidth - 2);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, shipToX, shipY);
      shipY += 3;
    });
  }
  
  const shipCityState = [shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(', ');
  if (shipCityState) {
    doc.text(shipCityState, shipToX, shipY);
    shipY += 3;
  }
  
  if (shipTo.gstin && !shipTo.sameAsBillTo) {
    doc.text(`GSTIN: ${shipTo.gstin}`, shipToX, shipY);
  }

  yPos += 26;

  // ========== INVOICE DETAILS - Horizontal pills ==========
  const details = [
    { label: 'Date', value: formatDate(data.invoice.invoice_date) },
    { label: 'Due', value: formatDate(data.invoice.due_date) },
    { label: 'Terms', value: data.invoice.terms_mode === 'NET_30' ? 'Net 30' : 'Due on Receipt' },
    { label: 'HSN/SAC', value: HSN_SAC_CODE },
  ];

  doc.setFontSize(6.5);
  let pillX = leftMargin;
  details.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, pillX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, pillX, yPos + 3.5);
    pillX += 36;
  });

  yPos += 12;

  // ========== CAMPAIGN BANNER ==========
  if (data.campaign?.campaign_name) {
    doc.setFillColor(245, 247, 250);
    doc.rect(leftMargin, yPos, contentWidth, 7, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 3, yPos + 5);
    
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${formatDate(data.campaign.start_date)} – ${formatDate(data.campaign.end_date)}`, pageWidth - rightMargin - 3, yPos + 5, { align: 'right' });
    }
    
    yPos += 10;
  }

  // ========== ITEMS TABLE (With Dimension + Illumination) ==========
  const tableData = data.items.map((item: any, index: number) => {
    const assetId = item.asset_id || '';
    const location = item.location || item.description || 'Media Display';
    const desc = `${assetId ? `[${assetId}] ` : ''}${location}`;
    
    // Dimension + Sqft
    const dimensions = item.dimensions || item.dimension_text || '-';
    const sqft = item.total_sqft || item.sqft || '';
    const sizeDisplay = sqft ? `${dimensions} (${sqft} sft)` : dimensions;
    
    // Illumination
    const illumination = item.illumination || item.illumination_type || '-';
    
    // Period
    const period = item.start_date && item.end_date 
      ? `${formatDate(item.start_date)} to ${formatDate(item.end_date)}`
      : '-';
    
    const rate = item.rate || item.unit_price || item.negotiated_rate || 0;
    const amount = item.amount || item.final_price || rate;

    return [
      (index + 1).toString(),
      desc,
      sizeDisplay,
      illumination,
      period,
      formatCurrency(rate),
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Size', 'Illum', 'Period', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [40, 40, 40],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 36 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    didDrawCell: function(cellData) {
      if (cellData.section === 'body') {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.3);
        doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
      }
    }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 12;

  // ========== TOTALS CARD ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || 0;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  const cardWidth = 72;
  const cardX = pageWidth - rightMargin - cardWidth;
  
  // Card background
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(cardX, yPos, cardWidth, 38, 2, 2, 'FD');

  const labelX = cardX + 5;
  const valueX = cardX + cardWidth - 5;
  let rowY = yPos + 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', labelX, rowY);
  doc.text(formatCurrency(subtotal), valueX, rowY, { align: 'right' });

  rowY += 6;
  doc.text('GST (18%)', labelX, rowY);
  doc.text(formatCurrency(gstAmount), valueX, rowY, { align: 'right' });

  rowY += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(cardX + 3, rowY - 3, cardX + cardWidth - 3, rowY - 3);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Total', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 7;
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  // Amount in words (left side)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Amount in Words:', leftMargin, yPos + 5);
  doc.setTextColor(40, 40, 40);
  const words = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${words} Only`, leftMargin, yPos + 10);

  yPos += 48;

  // Check page space
  if (yPos > pageHeight - 65) {
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
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('PAYMENT DETAILS', leftMargin, yPos);
  
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.text('HDFC Bank | A/C: 50200010727301 | IFSC: HDFC0001555', leftMargin, yPos);
  doc.text('Karkhana Road, Secunderabad', leftMargin, yPos + 3.5);

  // Adjust for QR height
  yPos = Math.max(yPos + 10, qrY + qrHeight);

  // ========== TERMS - Single line compact ==========
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Terms: Sites subject to availability. Payment in advance. Disputes settled at Telangana jurisdiction.', leftMargin, yPos);

  // ========== SIGNATURE - Bottom right ==========
  const signY = pageHeight - 23;
  const signX = pageWidth - rightMargin - 45;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('For ' + companyName, signX, signY);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(signX, signY + 8, signX + 42, signY + 8);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, signY + 12);

  return doc.output('blob');
}
