// Classic Tax Invoice Template - Conservative, Audit-Friendly
// For audits, government, corporate clients
// Updated: Ship To with full address + Dimension + Illumination columns

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';

export async function renderClassicTaxTemplate(data: InvoiceData): Promise<Blob> {
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
  
  let yPos = 12;

  // ========== OUTER BORDER ==========
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(leftMargin - 2, 10, contentWidth + 4, pageHeight - 20);

  // ========== HEADER BOX ==========
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, yPos, contentWidth, 26, 'FD');

  // Logo
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin + 3, yPos + 2, 20, 20);
    } catch (e) {
      console.log('Logo error:', e);
    }
  }

  // Company name centered
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, pageWidth / 2, yPos + 7, { align: 'center' });

  // Address centered
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_ADDRESS.line1, pageWidth / 2, yPos + 12, { align: 'center' });
  doc.text(`${COMPANY_ADDRESS.cityLine} | Phone: ${COMPANY_ADDRESS.phone}`, pageWidth / 2, yPos + 16, { align: 'center' });
  doc.text(`Email: ${COMPANY_ADDRESS.email} | GSTIN: ${companyGSTIN}`, pageWidth / 2, yPos + 20, { align: 'center' });

  yPos += 28;

  // ========== DOCUMENT TITLE BOX ==========
  doc.setFillColor(0, 0, 0);
  doc.rect(leftMargin, yPos, contentWidth, 7, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle, pageWidth / 2, yPos + 5, { align: 'center' });

  yPos += 9;

  // ========== INVOICE DETAILS TABLE ==========
  const detailsData = [
    ['Invoice No:', data.invoice.invoice_no || data.invoice.id, 'Invoice Date:', formatDate(data.invoice.invoice_date)],
    ['Due Date:', formatDate(data.invoice.due_date), 'Place of Supply:', data.invoice.place_of_supply || 'Telangana (36)'],
    ['HSN/SAC:', HSN_SAC_CODE, 'Terms:', data.invoice.terms_mode === 'NET_30' ? 'Net 30 Days' : 'Due on Receipt'],
  ];

  autoTable(doc, {
    startY: yPos,
    body: detailsData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { cellWidth: (contentWidth - 52) / 2 },
      2: { fontStyle: 'bold', cellWidth: 26 },
      3: { cellWidth: (contentWidth - 52) / 2 },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 2;

  // ========== BILL TO / SHIP TO BOXES (Full address) ==========
  const halfWidth = contentWidth / 2 - 1;
  const boxHeight = 34;

  // Build Bill To address
  const billTo = {
    name: data.client.name || 'Client',
    address1: data.client.billing_address_line1 || data.client.address || '',
    address2: data.client.billing_address_line2 || '',
    city: data.client.billing_city || data.client.city || '',
    state: data.client.billing_state || data.client.state || '',
    pincode: data.client.billing_pincode || data.client.pincode || '',
    gstin: data.client.gst_number || '',
  };

  // Build Ship To address (fallback to Bill To if empty)
  const hasShippingAddress = !!(data.client.shipping_address_line1 || data.client.shipping_city);
  const shipTo = {
    name: data.client.name || 'Client',
    address1: data.client.shipping_address_line1 || billTo.address1,
    address2: data.client.shipping_address_line2 || billTo.address2,
    city: data.client.shipping_city || billTo.city,
    state: data.client.shipping_state || billTo.state,
    pincode: data.client.shipping_pincode || billTo.pincode,
    gstin: billTo.gstin,
    sameAsBillTo: !hasShippingAddress,
  };

  // Bill To Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, yPos, halfWidth, boxHeight);
  
  doc.setFillColor(220, 220, 220);
  doc.rect(leftMargin, yPos, halfWidth, 5.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('BILL TO', leftMargin + 2, yPos + 4);

  let billY = yPos + 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(billTo.name, leftMargin + 2, billY);
  billY += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  if (billTo.address1) {
    const lines = doc.splitTextToSize(billTo.address1, halfWidth - 6);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 2, billY);
      billY += 3;
    });
  }
  
  if (billTo.address2) {
    doc.text(billTo.address2.substring(0, 45), leftMargin + 2, billY);
    billY += 3;
  }
  
  const billCityState = [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ');
  if (billCityState) {
    doc.text(billCityState, leftMargin + 2, billY);
    billY += 3.5;
  }
  
  if (billTo.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${billTo.gstin}`, leftMargin + 2, billY);
  }

  // Ship To Box
  const shipX = leftMargin + halfWidth + 2;
  doc.rect(shipX, yPos, halfWidth, boxHeight);
  
  doc.setFillColor(220, 220, 220);
  doc.rect(shipX, yPos, halfWidth, 5.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIP TO', shipX + 2, yPos + 4);
  
  if (shipTo.sameAsBillTo) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('(Same as Bill To)', shipX + 22, yPos + 4);
    doc.setTextColor(0, 0, 0);
  }

  let shipY = yPos + 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(shipTo.name, shipX + 2, shipY);
  shipY += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  if (shipTo.address1) {
    const lines = doc.splitTextToSize(shipTo.address1, halfWidth - 6);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, shipX + 2, shipY);
      shipY += 3;
    });
  }
  
  if (shipTo.address2) {
    doc.text(shipTo.address2.substring(0, 45), shipX + 2, shipY);
    shipY += 3;
  }
  
  const shipCityState = [shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(', ');
  if (shipCityState) {
    doc.text(shipCityState, shipX + 2, shipY);
    shipY += 3.5;
  }
  
  if (shipTo.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${shipTo.gstin}`, shipX + 2, shipY);
  }

  yPos += boxHeight + 3;

  // ========== CAMPAIGN INFO ==========
  if (data.campaign?.campaign_name) {
    doc.setDrawColor(0, 0, 0);
    doc.rect(leftMargin, yPos, contentWidth, 6.5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 2, yPos + 4.5);
    
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)}`, pageWidth - rightMargin - 2, yPos + 4.5, { align: 'right' });
    }
    
    yPos += 8;
  }

  // ========== ITEMS TABLE (With Dimension + Illumination) ==========
  const tableData = data.items.map((item: any, index: number) => {
    const assetId = item.asset_id || '';
    const location = item.location || item.description || 'Media Display';
    const zone = item.area || item.zone || '';
    const mediaType = item.media_type || '';
    
    const desc = [
      `[${assetId}] ${location}`,
      zone ? `Zone: ${zone}` : '',
      mediaType ? `Media: ${mediaType}` : '',
    ].filter(Boolean).join('\n');
    
    // Dimension + Sqft
    const dimensions = item.dimensions || item.dimension_text || '-';
    const sqft = item.total_sqft || item.sqft || '';
    const sizeDisplay = sqft ? `${dimensions}\n(${sqft} sft)` : dimensions;
    
    // Illumination
    const illumination = item.illumination || item.illumination_type || '-';
    
    // Period
    const period = item.start_date && item.end_date 
      ? `${formatDate(item.start_date)}\nto\n${formatDate(item.end_date)}`
      : '-';
    
    const rate = item.rate || item.unit_price || item.negotiated_rate || 0;
    const amount = item.amount || item.final_price || rate;

    return [
      (index + 1).toString(),
      desc,
      sizeDisplay,
      illumination,
      HSN_SAC_CODE,
      period,
      formatCurrency(rate),
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['S.No', 'Description', 'Size', 'Illum', 'HSN/SAC', 'Period', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [0, 0, 0],
      valign: 'top',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 26, halign: 'center', fontSize: 6 },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 2;

  // ========== HSN/SAC SUMMARY TABLE ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = parseFloat(data.invoice.total_amount) || 0;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('HSN/SAC Summary', leftMargin, yPos + 4);

  autoTable(doc, {
    startY: yPos + 6,
    head: [['HSN/SAC', 'Taxable Amt', 'CGST @9%', 'SGST @9%', 'Total Tax']],
    body: [
      [HSN_SAC_CODE, formatCurrency(subtotal), formatCurrency(cgst), formatCurrency(sgst), formatCurrency(gstAmount)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: 255,
      fontSize: 6.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
    },
    margin: { left: leftMargin, right: rightMargin + 50 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
  });

  // @ts-ignore
  const hsnEndY = doc.lastAutoTable.finalY;

  // ========== TOTALS BOX (Right side) ==========
  const totalsX = pageWidth - rightMargin - 55;
  const totalsY = yPos;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(totalsX, totalsY, 55, 30);

  const labelX = totalsX + 3;
  const valueX = totalsX + 52;
  let rowY = totalsY + 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', labelX, rowY);
  doc.text(formatCurrency(subtotal), valueX, rowY, { align: 'right' });

  rowY += 4.5;
  doc.text('CGST (9%):', labelX, rowY);
  doc.text(formatCurrency(cgst), valueX, rowY, { align: 'right' });

  rowY += 4.5;
  doc.text('SGST (9%):', labelX, rowY);
  doc.text(formatCurrency(sgst), valueX, rowY, { align: 'right' });

  rowY += 5.5;
  doc.setLineWidth(0.3);
  doc.line(totalsX + 2, rowY - 2, totalsX + 53, rowY - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL:', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.setTextColor(200, 0, 0);
  doc.text('Balance Due:', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  yPos = Math.max(hsnEndY, totalsY + 33) + 4;

  // Amount in words
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Amount in Words:', leftMargin, yPos);
  doc.setFont('helvetica', 'normal');
  const words = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${words} Only`, leftMargin + 28, yPos);

  yPos += 6;

  // Check page space
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // ========== PAYMENT QR CODE (Far right) ==========
  const upiId = data.orgSettings?.upi_id || data.company?.upi_id;
  const upiName = data.orgSettings?.upi_name || data.company?.upi_name;
  const invoiceStatus = data.invoice.status || 'Draft';
  const qrX = pageWidth - rightMargin - 32;
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

  // ========== BANK DETAILS BOX (Left side) ==========
  const bankBoxWidth = contentWidth * 0.45;
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftMargin, yPos, bankBoxWidth, 20);
  
  doc.setFillColor(230, 230, 230);
  doc.rect(leftMargin, yPos, bankBoxWidth, 5, 'F');
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK DETAILS', leftMargin + 2, yPos + 3.5);

  let bankY = yPos + 7.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank: HDFC Bank Limited', leftMargin + 2, bankY);
  bankY += 3;
  doc.text('A/C No: 50200010727301', leftMargin + 2, bankY);
  bankY += 3;
  doc.text('IFSC: HDFC0001555', leftMargin + 2, bankY);
  bankY += 3;
  doc.text('Branch: Karkhana Road, Secunderabad', leftMargin + 2, bankY);

  // ========== SIGNATURE BOX (Middle) ==========
  const signBoxX = leftMargin + bankBoxWidth + 3;
  const signBoxWidth = qrX - signBoxX - 3;
  
  if (signBoxWidth > 28) {
    doc.rect(signBoxX, yPos, signBoxWidth, 20);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + companyName, signBoxX + signBoxWidth / 2, yPos + 4, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.line(signBoxX + 6, yPos + 14, signBoxX + signBoxWidth - 6, yPos + 14);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', signBoxX + signBoxWidth / 2, yPos + 18, { align: 'center' });
  }

  // Adjust Y for QR height
  yPos = Math.max(yPos + 22, qrY + qrHeight);

  // ========== TERMS BOX ==========
  doc.rect(leftMargin, yPos, contentWidth, 16);
  
  doc.setFillColor(230, 230, 230);
  doc.rect(leftMargin, yPos, contentWidth, 4.5, 'F');
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', leftMargin + 2, yPos + 3.5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  let termY = yPos + 7.5;
  const terms = [
    '1. Sites are subject to availability at the time of written confirmation.',
    '2. Matrix will not be responsible for flex Theft, Torn, Damage. Govt taxes applicable.',
    '3. Payment should be made in advance. Any dispute shall be settled at Telangana Jurisdiction.',
  ];
  terms.forEach(term => {
    doc.text(term, leftMargin + 2, termY);
    termY += 2.8;
  });

  return doc.output('blob');
}
