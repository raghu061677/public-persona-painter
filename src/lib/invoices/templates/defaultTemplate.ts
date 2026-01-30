// Default Existing Template - Improved Layout
// This is the DEFAULT template with layout refinements (no content changes)

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';

export function renderDefaultTemplate(data: InvoiceData): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Company info
  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  let yPos = 15;

  // ========== HEADER SECTION (Improved - removed duplicate company name) ==========
  const logoWidth = 45;
  const logoHeight = 35;
  let logoEndX = leftMargin;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, logoWidth, logoHeight);
      logoEndX = leftMargin + logoWidth + 8;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name - Bold (SINGLE occurrence - fixed duplicate)
  let textY = yPos + 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, logoEndX, textY);

  // Company Address lines - tighter spacing
  textY += 6;
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

  // GSTIN on same line as document title
  textY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, textY);

  // Document title - Right aligned at GSTIN level
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 130);
  doc.text(docTitle, pageWidth - rightMargin, textY, { align: 'right' });

  yPos = yPos + logoHeight + 5;

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 3;

  // ========== INVOICE DETAILS (Compact 2-column grid) ==========
  const leftColX = leftMargin;
  const rightColX = pageWidth / 2 + 10;
  const labelWidth = 26;
  
  const termsMode = data.invoice.terms_mode || 'DUE_ON_RECEIPT';
  const termsDays = data.invoice.terms_days || 0;
  const termsLabel = termsMode === 'DUE_ON_RECEIPT' ? 'Due on Receipt' :
    termsMode === 'NET_30' ? '30 Net Days' :
    termsMode === 'NET_45' ? '45 Net Days' :
    termsMode === 'CUSTOM' ? `${termsDays} Net Days` : 'Due on Receipt';

  const invoiceNoLabel = invoiceType === 'PROFORMA' ? 'Proforma No' : 'Invoice No';

  doc.setFontSize(8);
  let detailRowY = yPos + 4;

  // Row 1
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(invoiceNoLabel, leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.invoice.invoice_no || data.invoice.id}`, leftColX + labelWidth, detailRowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Place Of Supply', rightColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.invoice.place_of_supply || 'Telangana (36)'}`, rightColX + 28, detailRowY);
  
  detailRowY += 4.5;

  // Row 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Invoice Date', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${formatDate(data.invoice.invoice_date)}`, leftColX + labelWidth, detailRowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Sales Person', rightColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.invoice.sales_person || data.company?.owner_name || 'Raghunath Gajula'}`, rightColX + 28, detailRowY);
  
  detailRowY += 4.5;

  // Row 3
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Terms', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${termsLabel}`, leftColX + labelWidth, detailRowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Due Date', rightColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${formatDate(data.invoice.due_date)}`, rightColX + 28, detailRowY);

  detailRowY += 4.5;

  // Row 4 - HSN/SAC
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('HSN/SAC', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${HSN_SAC_CODE}`, leftColX + labelWidth, detailRowY);

  yPos = detailRowY + 6;

  // ========== BILL TO / SHIP TO (2-column grid - improved alignment) ==========
  const colMidX = pageWidth / 2;
  const leftColWidth = colMidX - leftMargin - 4;
  const rightColWidth = pageWidth - rightMargin - colMidX - 4;

  // Headers
  doc.setFillColor(30, 64, 130);
  doc.rect(leftMargin, yPos, leftColWidth, 5.5, 'F');
  doc.rect(colMidX + 4, yPos, rightColWidth, 5.5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Bill To', leftMargin + 3, yPos + 4);
  doc.text('Ship To', colMidX + 7, yPos + 4);

  yPos += 5.5;
  const boxHeight = 28;

  // Content boxes
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftMargin, yPos, leftColWidth, boxHeight, 'S');
  doc.rect(colMidX + 4, yPos, rightColWidth, boxHeight, 'S');

  // Bill To Content
  let billY = yPos + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.name || 'Client', leftMargin + 3, billY);
  billY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  
  const clientAddress = data.client.billing_address_line1 || data.client.address || '';
  if (clientAddress) {
    const lines = doc.splitTextToSize(clientAddress, leftColWidth - 8);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 3, billY);
      billY += 3;
    });
  }

  const cityStatePin = [
    data.client.billing_city || data.client.city,
    data.client.billing_state || data.client.state,
    data.client.billing_pincode || data.client.pincode
  ].filter(Boolean).join(', ');
  
  if (cityStatePin) {
    doc.text(cityStatePin, leftMargin + 3, billY);
    billY += 3;
  }

  if (data.client.gst_number) {
    billY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${data.client.gst_number}`, leftMargin + 3, billY);
  }

  // Ship To Content (mirror of Bill To)
  let shipY = yPos + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.name || 'Client', colMidX + 7, shipY);
  shipY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  
  const shipAddress = data.client.shipping_address_line1 || data.client.billing_address_line1 || '';
  if (shipAddress) {
    const lines = doc.splitTextToSize(shipAddress, rightColWidth - 8);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, colMidX + 7, shipY);
      shipY += 3;
    });
  }

  const shipCityStatePin = [
    data.client.shipping_city || data.client.billing_city,
    data.client.shipping_state || data.client.billing_state,
    data.client.shipping_pincode || data.client.billing_pincode
  ].filter(Boolean).join(', ');
  
  if (shipCityStatePin) {
    doc.text(shipCityStatePin, colMidX + 7, shipY);
  }

  yPos = yPos + boxHeight + 6;

  // ========== CAMPAIGN INFO ==========
  if (data.campaign?.campaign_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    
    const campaignLabel = `Campaign: ${data.campaign.campaign_name}`;
    let campaignDuration = '';
    
    if (data.campaign.start_date && data.campaign.end_date) {
      campaignDuration = `(${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)})`;
    }
    
    doc.text(campaignLabel, leftMargin, yPos);
    
    if (campaignDuration) {
      doc.setFont('helvetica', 'normal');
      doc.text(campaignDuration, pageWidth - rightMargin, yPos, { align: 'right' });
    }
    
    yPos += 6;
  }

  // ========== ITEMS TABLE (Structured columns) ==========
  const tableData = data.items.map((item: any, index: number) => {
    const assetId = item.asset_id || item.id || '';
    const location = item.location || item.description || 'Media Display';
    const zone = item.area || item.zone || '';
    const mediaType = item.media_type || 'Bus Shelter';
    
    const descLines = [
      `[${assetId}] ${location}`,
      zone ? `Zone: ${zone} | Media: ${mediaType}` : `Media: ${mediaType}`,
    ].join('\n');
    
    const dimensions = item.dimensions || 'N/A';
    const sqft = item.total_sqft || '';
    const sizeDisplay = sqft ? `${dimensions}\n(${sqft} sft)` : dimensions;
    
    const startDate = item.start_date || data.campaign?.start_date;
    const endDate = item.end_date || data.campaign?.end_date;
    let bookingDisplay = '-';
    if (startDate && endDate) {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      bookingDisplay = `${formatDate(startDate)}\nto ${formatDate(endDate)}\n(${days} days)`;
    }
    
    const unitPrice = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || 0;
    const amount = item.amount || item.final_price || unitPrice;

    return [
      (index + 1).toString(),
      descLines,
      sizeDisplay,
      bookingDisplay,
      formatCurrency(unitPrice),
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'DESCRIPTION', 'SIZE', 'PERIOD', 'RATE', 'AMOUNT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 130],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 30, 30],
      valign: 'top',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 68, halign: 'left' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 32, halign: 'center', fontSize: 6.5 },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // ========== TOTALS SECTION (Boxed - improved visibility) ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = parseFloat(data.invoice.total_amount) || (subtotal + gstAmount);
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  // Amount in words on left
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Amount in Words:', leftMargin, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const amountInWords = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${amountInWords} Only`, leftMargin, yPos + 4);

  // Totals box on right
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;
  const totalsBoxY = yPos - 3;
  
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 35, 'FD');

  const labelX = totalsBoxX + 3;
  const valueX = pageWidth - rightMargin - 3;
  let rowY = totalsBoxY + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Sub Total', labelX, rowY);
  doc.text(formatCurrency(subtotal), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.text('CGST (9%)', labelX, rowY);
  doc.text(formatCurrency(cgst), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.text('SGST (9%)', labelX, rowY);
  doc.text(formatCurrency(sgst), valueX, rowY, { align: 'right' });

  rowY += 6;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsBoxX + 2, rowY - 2, pageWidth - rightMargin - 2, rowY - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 6;
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  yPos += 40;

  // Check page space
  if (yPos > pageHeight - 75) {
    doc.addPage();
    yPos = 20;
  }

  // ========== BANK DETAILS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details', leftMargin, yPos);

  yPos += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const bankDetails = [
    { label: 'Bank:', value: 'HDFC Bank Limited' },
    { label: 'Branch:', value: 'Karkhana Road, Secunderabad 500009' },
    { label: 'A/C No:', value: '50200010727301' },
    { label: 'IFSC:', value: 'HDFC0001555' },
  ];

  bankDetails.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, leftMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, leftMargin + 18, yPos);
    yPos += 3.5;
  });

  yPos += 4;

  // ========== TERMS & CONDITIONS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', leftMargin, yPos);

  yPos += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const terms = [
    '1. Sites are subject to availability at the time of written confirmation.',
    '2. Matrix will not be responsible for flex Theft, Torn, Damage.',
    '3. Payment should be made in advance. Any dispute shall be settled at Telangana Jurisdiction.',
  ];

  terms.forEach((term) => {
    doc.text(term, leftMargin, yPos);
    yPos += 3;
  });

  // ========== AUTHORIZED SIGNATORY (Bottom-right anchored) ==========
  const signY = Math.max(yPos + 10, pageHeight - 30);
  const signX = pageWidth - rightMargin - 50;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('For Matrix Network Solutions', signX, signY);

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(signX, signY + 12, signX + 48, signY + 12);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, signY + 16);

  return doc.output('blob');
}
