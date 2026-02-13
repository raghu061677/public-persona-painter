// Modern Clean Template - Matching Reference Invoice Layout
// For agencies, premium brands, digital campaigns
// Updated: Header matches reference, HSN/SAC Summary at end, Location line fix, Totals alignment

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
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  
  let yPos = 12;

  // ========== HEADER - MATCHING REFERENCE LAYOUT ==========
  // Left side: Logo + Company details
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, 22, 16);
    } catch (e) {
      console.log('Logo error:', e);
    }
  }
  
  // Company name and details next to logo
  const companyInfoX = leftMargin + 26;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(companyName, companyInfoX, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  let compY = yPos + 9;
  doc.text(COMPANY_ADDRESS.line1, companyInfoX, compY);
  compY += 3;
  doc.text(COMPANY_ADDRESS.line2, companyInfoX, compY);
  compY += 3;
  doc.text(COMPANY_ADDRESS.cityLine + ' ' + COMPANY_ADDRESS.country, companyInfoX, compY);
  compY += 3.5;
  doc.text(`Phone: ${COMPANY_ADDRESS.phone}`, companyInfoX, compY);
  compY += 3;
  doc.text(`Email: ${COMPANY_ADDRESS.email}`, companyInfoX, compY);
  compY += 3;
  doc.text(`Website: ${COMPANY_ADDRESS.website}`, companyInfoX, compY);

  // Right side: TAX INVOICE title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text(docTitle, pageWidth - rightMargin, yPos + 6, { align: 'right' });
  
  // GSTIN below title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(`GSTIN: ${companyGSTIN}`, pageWidth - rightMargin, yPos + 12, { align: 'right' });

  yPos += 32;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 4;

  // ========== INVOICE DETAILS TABLE (Reference style) ==========
  const invoiceNo = data.invoice.id || data.invoice.invoice_no || '-';
  const invoiceDate = formatDate(data.invoice.invoice_date);
  const dueDate = formatDate(data.invoice.due_date);
  const termsMode = data.invoice.terms_mode === 'NET_30' ? 'Net 30' : 'Due on Receipt';
  const placeOfSupply = data.client?.billing_state ? `${data.client.billing_state} (36)` : 'Telangana (36)';
  const salesPerson = data.orgSettings?.sales_person || 'Raghunath Gajula';

  // Create invoice details as a bordered table
  autoTable(doc, {
    startY: yPos,
    body: [
      ['Invoice No:', invoiceNo, 'Place Of Supply:', placeOfSupply],
      ['Invoice Date:', invoiceDate, 'Sales Person:', salesPerson],
      ['Terms:', termsMode, 'HSN/SAC:', HSN_SAC_CODE],
      ['Due Date:', dueDate, '', ''],
    ],
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 24, textColor: [80, 80, 80] },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 28, textColor: [80, 80, 80] },
      3: { cellWidth: 50 },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.3,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 4;

  // ========== BILL TO / SHIP TO - Two column bordered grid ==========
  const billTo = {
    name: data.client.name || 'Client',
    address1: data.client.billing_address_line1 || data.client.address || '',
    address2: data.client.billing_address_line2 || '',
    city: data.client.billing_city || data.client.city || '',
    state: data.client.billing_state || data.client.state || '',
    pincode: data.client.billing_pincode || data.client.pincode || '',
    gstin: data.client.gst_number || '',
  };

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

  // Build full address strings
  const billToAddressLines: string[] = [billTo.name];
  if (billTo.address1) billToAddressLines.push(billTo.address1);
  if (billTo.address2) billToAddressLines.push(billTo.address2);
  const billToCityLine = [billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(', ');
  if (billToCityLine) billToAddressLines.push(billToCityLine);
  if (billTo.gstin) billToAddressLines.push(`GSTIN: ${billTo.gstin}`);

  const shipToAddressLines: string[] = [shipTo.name];
  if (shipTo.sameAsBillTo) {
    shipToAddressLines.push('(Same as Bill To)');
  }
  if (shipTo.address1) shipToAddressLines.push(shipTo.address1);
  if (shipTo.address2) shipToAddressLines.push(shipTo.address2);
  const shipToCityLine = [shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(', ');
  if (shipToCityLine) shipToAddressLines.push(shipToCityLine);
  if (shipTo.gstin && !shipTo.sameAsBillTo) shipToAddressLines.push(`GSTIN: ${shipTo.gstin}`);

  // Draw Bill To / Ship To as bordered boxes side by side
  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 24;
  
  // Bill To Box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, yPos, boxWidth, boxHeight);
  
  doc.setFillColor(245, 247, 250);
  doc.rect(leftMargin, yPos, boxWidth, 5, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Bill To', leftMargin + 2, yPos + 3.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(7);
  let billY = yPos + 8;
  billToAddressLines.forEach((line, idx) => {
    if (idx === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }
    doc.text(line.substring(0, 50), leftMargin + 2, billY);
    billY += 3;
  });

  // Ship To Box
  const shipBoxX = leftMargin + boxWidth + 4;
  doc.rect(shipBoxX, yPos, boxWidth, boxHeight);
  
  doc.setFillColor(245, 247, 250);
  doc.rect(shipBoxX, yPos, boxWidth, 5, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Ship To', shipBoxX + 2, yPos + 3.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  let shipY = yPos + 8;
  shipToAddressLines.forEach((line, idx) => {
    if (idx === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }
    doc.text(line.substring(0, 50), shipBoxX + 2, shipY);
    shipY += 3;
  });

  yPos += boxHeight + 4;

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

  // ========== ITEMS TABLE - FIXED LOCATION LINE ==========
  // Collect HSN/SAC data for summary
  const hsnSummary: Record<string, { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number }> = {};
  
  const tableData = data.items.map((item: any, index: number) => {
    const assetCode = item.asset_code || item.asset_id || item.id || '-';
    const locationVal = item.location || item.description || '-';
    const areaVal = item.area || item.zone || '-';
    const directionVal = item.direction || '-';
    const mediaTypeVal = item.media_type || '-';
    const illuminationVal = item.illumination || item.illumination_type || '-';
    const dimensions = item.dimensions || item.dimension_text || item.size || item.dimension || '';
    const sqft = item.total_sqft || item.sqft || item.meta?.total_sqft || '';
    const hsnSac = item.hsn_sac || HSN_SAC_CODE;
    
    // Calculate period info
    const startDate = item.start_date || item.booking_start_date || data.campaign?.start_date;
    const endDate = item.end_date || item.booking_end_date || data.campaign?.end_date;
    let bookingDisplay = '-';
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const months = Math.ceil(days / 30);
      bookingDisplay = `Start: ${formatDate(startDate)} - End: ${formatDate(endDate)}\n${days > 45 ? `Month: ${months}` : `Days: ${days}`}`;
    }
    
    // FIXED: Build rich description - Asset ID only on first line, Location on second line
    const descLines: string[] = [];
    descLines.push(`[${assetCode}]`);  // Asset ID only on first line
    descLines.push(`Location: ${locationVal}`);  // Location on second line
    descLines.push(`Direction: ${directionVal}`);
    descLines.push(`Area: ${areaVal}`);
    descLines.push(`Media Type: ${mediaTypeVal}`);
    descLines.push(`Illumination: ${illuminationVal}`);
    descLines.push(`HSN/SAC Code: ${hsnSac}`);
    const richDescription = descLines.join('\n');

    // Size column
    const sizeLines: string[] = [];
     if (dimensions) sizeLines.push(`Dimensions: ${dimensions}`);
     if (sqft !== '' && sqft != null) sizeLines.push(`Sqft: ${sqft}`);
     const sizeDisplay = sizeLines.length ? sizeLines.join('\n') : 'Dimensions: —';
    
    // Pricing breakdown - FIXED: Full labels
    const baseRate = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || 0;
    const printingCost = item.printing_charges || item.printing_cost || 0;
    const mountingCost = item.mounting_charges || item.mounting_cost || 0;
    const itemTotal = item.amount || item.final_price || item.total || (baseRate + printingCost + mountingCost);
    
    // Build unit price display with full labels
    let unitPriceLines: string[] = [`Display: ${formatCurrency(baseRate)}`];
    if (printingCost > 0) unitPriceLines.push(`Printing: ${formatCurrency(printingCost)}`);
    if (mountingCost > 0) unitPriceLines.push(`Installation: ${formatCurrency(mountingCost)}`);
    const unitPriceDisplay = unitPriceLines.join('\n');

    // Aggregate HSN/SAC summary data
    const gstPercent = parseFloat(data.invoice.gst_percent) || 0;
    const isInterState = data.invoice.tax_type === 'igst';
    const taxableForItem = itemTotal;
    
    if (!hsnSummary[hsnSac]) {
      hsnSummary[hsnSac] = { taxable: 0, cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0 };
    }
    hsnSummary[hsnSac].taxable += taxableForItem;
    
    if (isInterState) {
      hsnSummary[hsnSac].igstRate = gstPercent;
      hsnSummary[hsnSac].igstAmount += taxableForItem * (gstPercent / 100);
    } else {
      hsnSummary[hsnSac].cgstRate = gstPercent / 2;
      hsnSummary[hsnSac].sgstRate = gstPercent / 2;
      hsnSummary[hsnSac].cgstAmount += taxableForItem * (gstPercent / 2 / 100);
      hsnSummary[hsnSac].sgstAmount += taxableForItem * (gstPercent / 2 / 100);
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
    theme: 'plain',
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [60, 60, 60],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [40, 40, 40],
      cellPadding: 2.5,
      valign: 'top',
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 78, halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'left', fontSize: 6 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    didDrawCell: function(cellData) {
      if (cellData.section === 'body') {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
      }
    }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // ========== TOTALS SECTION - FIXED ALIGNMENT ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstPercent = parseFloat(data.invoice.gst_percent) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || 0;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;
  const isInterState = data.invoice.tax_type === 'igst';
  const cgstAmount = isInterState ? 0 : gstAmount / 2;
  const sgstAmount = isInterState ? 0 : gstAmount / 2;
  const igstAmount = isInterState ? gstAmount : 0;

  // Amount in words (left side)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Total In Words:', leftMargin, yPos + 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  const words = numberToWords(Math.round(grandTotal));
  const amountWordsText = `Indian Rupees ${words} Only`;
  const wrappedWords = doc.splitTextToSize(amountWordsText, 85);
  let wordsY = yPos + 6;
  wrappedWords.forEach((line: string) => {
    doc.text(line, leftMargin, wordsY);
    wordsY += 3.5;
  });

  // Totals box (right side) - FIXED ALIGNMENT
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;
  
  // Draw bordered box for totals
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const totalsBoxHeight = isInterState ? 36 : 40;
  doc.rect(totalsBoxX, yPos - 2, totalsBoxWidth, totalsBoxHeight);
  
  // Totals rows - properly aligned
  const labelCol = totalsBoxX + 4;
  const valueCol = totalsBoxX + totalsBoxWidth - 4;
  let totalsY = yPos + 4;
  
  // Sub Total
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Sub Total', labelCol, totalsY);
  doc.text(formatCurrency(subtotal), valueCol, totalsY, { align: 'right' });
  
  totalsY += 6;
  
  // GST rows
  if (isInterState) {
    doc.text(`IGST (${gstPercent}%)`, labelCol, totalsY);
    doc.text(formatCurrency(igstAmount), valueCol, totalsY, { align: 'right' });
    totalsY += 6;
  } else {
    doc.text(`CGST (${gstPercent / 2}%)`, labelCol, totalsY);
    doc.text(formatCurrency(cgstAmount), valueCol, totalsY, { align: 'right' });
    totalsY += 5;
    doc.text(`SGST (${gstPercent / 2}%)`, labelCol, totalsY);
    doc.text(formatCurrency(sgstAmount), valueCol, totalsY, { align: 'right' });
    totalsY += 6;
  }
  
  // Separator line before total
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsBoxX + 2, totalsY - 2, totalsBoxX + totalsBoxWidth - 2, totalsY - 2);
  
  // Total row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text('Total', labelCol, totalsY + 2);
  doc.text(formatCurrency(grandTotal), valueCol, totalsY + 2, { align: 'right' });
  
  totalsY += 8;
  
  // Balance Due
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due', labelCol, totalsY);
  doc.text(formatCurrency(balanceDue), valueCol, totalsY, { align: 'right' });

  yPos = Math.max(wordsY, totalsY) + 8;

  // Check page space for remaining content
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = 20;
  }

  // ========== BANK DETAILS ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Bank Details:', leftMargin, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  yPos += 4;
  doc.text('HDFC Bank Limited', leftMargin, yPos);
  yPos += 3;
  doc.text('Account Branch: KARKHANA ROAD, SECUNDERABAD 500009', leftMargin, yPos);
  yPos += 3;
  doc.text('Account No: 50200010727301 | RTGS/NEFT IFSC: HDFC0001555 | MICR: 500240026', leftMargin, yPos);

  yPos += 8;

  // ========== TERMS & CONDITIONS ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Terms & Conditions:', leftMargin, yPos);
  
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  
  const terms = [
    'i) Blocking of media stands for 24 hrs, post which it becomes subject to availability. Blocking is considered \'confirmed\' only after a confirmation email.',
    'ii) Sites are subject to availability at the time written confirmation.',
    'iii) "Matrix" will not be responsible for flex Theft, Torn, Damage.',
    'iv) Govt. Taxes as applicable will be charge Extra',
    'v) PO has to be given within 7 days of the campaigns start date & PO should be in favour of "Matrix Network Solutions"',
    'vi) Extension of ongoing campaign has to be informed to us by 10 days before campaign end date.',
    'vii) Payment should be made in advance.',
    'viii) Any dispute arising out of or in connection with this contract shall be settled at Telangana Jurisdiction.',
  ];
  
  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, contentWidth);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, leftMargin, yPos);
      yPos += 3;
    });
  });

  yPos += 6;

  // ========== HSN/SAC SUMMARY TABLE - AT END ==========
  // Check if need new page
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('HSN/SAC Summary:', leftMargin, yPos);
  yPos += 3;

  // Build HSN summary table data
  const hsnTableBody: any[] = [];
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  Object.entries(hsnSummary).forEach(([hsn, values]) => {
    totalTaxable += values.taxable;
    totalCgst += values.cgstAmount;
    totalSgst += values.sgstAmount;
    totalIgst += values.igstAmount;
    const lineTax = values.cgstAmount + values.sgstAmount + values.igstAmount;
    totalTax += lineTax;
    
    if (isInterState) {
      hsnTableBody.push([
        hsn,
        formatCurrency(values.taxable),
        `${values.igstRate}%`,
        formatCurrency(values.igstAmount),
        formatCurrency(lineTax),
      ]);
    } else {
      hsnTableBody.push([
        hsn,
        formatCurrency(values.taxable),
        `${values.cgstRate}%`,
        formatCurrency(values.cgstAmount),
        `${values.sgstRate}%`,
        formatCurrency(values.sgstAmount),
        formatCurrency(lineTax),
      ]);
    }
  });

  // Total row
  if (isInterState) {
    hsnTableBody.push([
      { content: 'Total', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(totalTaxable), styles: { fontStyle: 'bold' } },
      '',
      { content: formatCurrency(totalIgst), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(totalTax), styles: { fontStyle: 'bold' } },
    ]);
  } else {
    hsnTableBody.push([
      { content: 'Total', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(totalTaxable), styles: { fontStyle: 'bold' } },
      '',
      { content: formatCurrency(totalCgst), styles: { fontStyle: 'bold' } },
      '',
      { content: formatCurrency(totalSgst), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(totalTax), styles: { fontStyle: 'bold' } },
    ]);
  }

  // HSN table columns based on tax type
  const hsnHead = isInterState
    ? [['HSN/SAC', 'Taxable Amount', 'IGST Rate', 'IGST Amount', 'Total Tax']]
    : [['HSN/SAC', 'Taxable Amount', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Tax']];

  autoTable(doc, {
    startY: yPos,
    head: hsnHead,
    body: hsnTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [40, 40, 40],
      halign: 'center',
    },
    columnStyles: isInterState ? {
      0: { halign: 'left', cellWidth: 28 },
      1: { halign: 'right', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 32 },
    } : {
      0: { halign: 'left', cellWidth: 22 },
      1: { halign: 'right', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== SIGNATURE SECTION ==========
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  const signX = pageWidth - rightMargin - 50;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`For ${companyName}`, signX, yPos);
  
  yPos += 12;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(signX, yPos, signX + 48, yPos);
  
  yPos += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, yPos);

  return doc.output('blob');
}
