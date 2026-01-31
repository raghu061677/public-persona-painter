// Default Existing Template - Improved Layout with Ship To + Dimension/Illumination
// This is the DEFAULT template with full shipping address and OOH-specific columns

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';

export async function renderDefaultTemplate(data: InvoiceData): Promise<Blob> {
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

  // Company info
  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  let yPos = 20;

  // ========== HEADER SECTION ==========
  const logoWidth = 42;
  const logoHeight = 32;
  let logoEndX = leftMargin;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, logoWidth, logoHeight);
      logoEndX = leftMargin + logoWidth + 6;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name - Bold
  let textY = yPos + 4;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, logoEndX, textY);

  // Company Address lines - tighter spacing
  textY += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(COMPANY_ADDRESS.line1, logoEndX, textY);
  textY += 3;
  doc.text(COMPANY_ADDRESS.line2, logoEndX, textY);
  textY += 3;
  doc.text(`${COMPANY_ADDRESS.cityLine} ${COMPANY_ADDRESS.country}`, logoEndX, textY);

  // Contact info
  textY += 3.5;
  doc.text(`Phone: ${COMPANY_ADDRESS.phone}`, logoEndX, textY);
  textY += 3;
  doc.text(COMPANY_ADDRESS.email, logoEndX, textY);

  // GSTIN on same line as document title
  textY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, textY);

  // Document title - Right aligned at GSTIN level
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 130);
  doc.text(docTitle, pageWidth - rightMargin, textY, { align: 'right' });

  yPos = yPos + logoHeight + 4;

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 2;

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

  doc.setFontSize(7.5);
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
  
  detailRowY += 4;

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
  
  detailRowY += 4;

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

  detailRowY += 4;

  // Row 4 - HSN/SAC
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('HSN/SAC', leftColX, detailRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${HSN_SAC_CODE}`, leftColX + labelWidth, detailRowY);

  yPos = detailRowY + 5;

  // ========== BILL TO / SHIP TO (2-column grid) ==========
  const colMidX = pageWidth / 2;
  const leftColWidth = colMidX - leftMargin - 3;
  const rightColWidth = pageWidth - rightMargin - colMidX - 3;
  const boxHeight = 32;

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
    gstin: data.client.gst_number || '', // Same GSTIN for shipping
    sameAsBillTo: !hasShippingAddress,
  };

  // Headers
  doc.setFillColor(30, 64, 130);
  doc.rect(leftMargin, yPos, leftColWidth, 5.5, 'F');
  doc.rect(colMidX + 3, yPos, rightColWidth, 5.5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Bill To', leftMargin + 3, yPos + 4);
  doc.text('Ship To', colMidX + 6, yPos + 4);

  yPos += 5.5;

  // Content boxes
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftMargin, yPos, leftColWidth, boxHeight, 'S');
  doc.rect(colMidX + 3, yPos, rightColWidth, boxHeight, 'S');

  // Bill To Content
  let billY = yPos + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(billTo.name, leftMargin + 3, billY);
  billY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  
  if (billTo.address1) {
    const lines = doc.splitTextToSize(billTo.address1, leftColWidth - 8);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 3, billY);
      billY += 3;
    });
  }

  if (billTo.address2) {
    doc.text(billTo.address2.substring(0, 50), leftMargin + 3, billY);
    billY += 3;
  }

  const billCityStatePin = [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ');
  if (billCityStatePin) {
    doc.text(billCityStatePin, leftMargin + 3, billY);
    billY += 3;
  }

  if (billTo.gstin) {
    billY += 1;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${billTo.gstin}`, leftMargin + 3, billY);
  }

  // Ship To Content
  let shipY = yPos + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(shipTo.name, colMidX + 6, shipY);
  
  // Show "Same as Bill To" indicator if applicable
  if (shipTo.sameAsBillTo) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('(Same as Bill To)', colMidX + 6 + doc.getTextWidth(shipTo.name) + 2, shipY);
  }
  
  shipY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  
  if (shipTo.address1) {
    const lines = doc.splitTextToSize(shipTo.address1, rightColWidth - 8);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, colMidX + 6, shipY);
      shipY += 3;
    });
  }

  if (shipTo.address2) {
    doc.text(shipTo.address2.substring(0, 50), colMidX + 6, shipY);
    shipY += 3;
  }

  const shipCityStatePin = [shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(', ');
  if (shipCityStatePin) {
    doc.text(shipCityStatePin, colMidX + 6, shipY);
    shipY += 3;
  }

  if (shipTo.gstin) {
    shipY += 1;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${shipTo.gstin}`, colMidX + 6, shipY);
  }

  yPos = yPos + boxHeight + 5;

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
    
    yPos += 5;
  }

  // ========== ITEMS TABLE (Original OOH Format) ==========
  const tableData = data.items.map((item: any, index: number) => {
    const assetId = item.asset_id || item.id || '';
    const location = item.location || item.description || 'Media Display';
    const zone = item.area || item.zone || '';
    const mediaType = item.media_type || 'Bus Shelter';
    const direction = item.direction || '';
    const illumination = item.illumination || item.illumination_type || 'NonLit';
    const dimensions = item.dimensions || item.dimension_text || '';
    const sqft = item.total_sqft || item.sqft || '';
    
    // Calculate period info
    const startDate = item.start_date || item.booking_start_date || data.campaign?.start_date;
    const endDate = item.end_date || item.booking_end_date || data.campaign?.end_date;
    let periodDesc = '';
    let bookingDisplay = 'N/A';
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const months = Math.ceil(days / 30);
      periodDesc = `(${formatDate(startDate)} to ${formatDate(endDate)})`;
      bookingDisplay = `From: ${formatDate(startDate)}\nTo: ${formatDate(endDate)}\n${days > 45 ? `Month: ${months}` : `Days: ${days}`}`;
    }
    
    // Build rich description in original format
    // Format: [Asset Code] Location Zone:ZoneName Media:Type Route:Direction Lit:IllumType and Size W x H Area(Sft):sqft
    const descParts = [];
    if (assetId) descParts.push(`[${assetId}]`);
    descParts.push(location);
    if (zone) descParts.push(`Zone:${zone}`);
    descParts.push(`Media:${mediaType}`);
    if (direction) descParts.push(`Route:${direction}`);
    descParts.push(`Lit:${illumination}`);
    if (dimensions && sqft) {
      descParts.push(`and Size ${dimensions} Area(Sft):${sqft}`);
    } else if (dimensions) {
      descParts.push(`Size:${dimensions}`);
    }
    
    const richDescription = descParts.join(' ');
    
    // Size column - simple display
    const sizeDisplay = sqft ? `${sqft}` : (dimensions || 'N/A');
    
    // Unit price and subtotal - include printing/mounting if present
    const baseRate = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || item.rent_amount || 0;
    const printingCost = item.printing_charges || item.printing_cost || 0;
    const mountingCost = item.mounting_charges || item.mounting_cost || 0;
    const itemTotal = item.amount || item.final_price || item.total || (baseRate + printingCost + mountingCost);
    
    // Format unit price with breakdown if printing/mounting exist
    let unitPriceDisplay = formatCurrency(baseRate);
    if (printingCost > 0 || mountingCost > 0) {
      const extras = [];
      if (printingCost > 0) extras.push(`P: ${formatCurrency(printingCost)}`);
      if (mountingCost > 0) extras.push(`M: ${formatCurrency(mountingCost)}`);
      unitPriceDisplay = `${formatCurrency(baseRate)}\n${extras.join('\n')}`;
    }

    return [
      (index + 1).toString(),
      richDescription,
      sizeDisplay,
      bookingDisplay,
      unitPriceDisplay,
      formatCurrency(itemTotal),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'LOCATION & DESCRIPTION', 'SIZE', 'BOOKING', 'UNIT PRICE', 'SUBTOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 130],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 30, 30],
      valign: 'top',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 74, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32, halign: 'left', fontSize: 6 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 6;

  // ========== TOTALS SECTION ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = parseFloat(data.invoice.total_amount) || (subtotal + gstAmount);
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  // Amount in words on left
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Amount in Words:', leftMargin, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const amountInWords = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${amountInWords} Only`, leftMargin, yPos + 4);

  // Totals box on right
  const totalsBoxWidth = 68;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;
  const totalsBoxY = yPos - 3;
  
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 33, 'FD');

  const labelX = totalsBoxX + 3;
  const valueX = pageWidth - rightMargin - 3;
  let rowY = totalsBoxY + 5;

  doc.setFontSize(7.5);
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

  rowY += 5;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsBoxX + 2, rowY - 1, pageWidth - rightMargin - 2, rowY - 1);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  yPos += 38;

  // Check page space for bank details + QR
  if (yPos > pageHeight - 75) {
    doc.addPage();
    yPos = 20;
  }

  // ========== PAYMENT QR CODE (Right side) ==========
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

  // ========== BANK DETAILS (Left side) ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details', leftMargin, yPos);

  yPos += 4;
  doc.setFontSize(7);
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
    doc.text(value, leftMargin + 16, yPos);
    yPos += 3.5;
  });

  // Adjust Y position if QR is taller than bank details
  yPos = Math.max(yPos, qrY + qrHeight) + 4;

  // ========== TERMS & CONDITIONS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', leftMargin, yPos);

  yPos += 4;
  doc.setFontSize(6);
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

  // ========== AUTHORIZED SIGNATORY (Bottom-right) ==========
  const signY = Math.max(yPos + 8, pageHeight - 28);
  const signX = pageWidth - rightMargin - 50;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('For Matrix Network Solutions', signX, signY);

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(signX, signY + 10, signX + 48, signY + 10);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, signY + 14);

  return doc.output('blob');
}
