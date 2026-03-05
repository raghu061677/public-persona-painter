// Default Existing Template - Improved Layout with Ship To + Dimension/Illumination
// This is the DEFAULT template with full shipping address and OOH-specific columns
// Updated: Fixed location line, added HSN/SAC Summary at end, fixed totals alignment

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';
import { renderInvoiceSummaryTable } from './summaryTableHelper';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';

// Cache signature image
let cachedSignatureBase64: string | null = null;
async function loadSignatureImage(): Promise<string | undefined> {
  if (cachedSignatureBase64) return cachedSignatureBase64;
  try {
    const res = await fetch(signatureImageUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    cachedSignatureBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedSignatureBase64 || undefined;
  } catch {
    return undefined;
  }
}

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
  doc.text(`: ${data.invoice.id || data.invoice.invoice_no}`, leftColX + labelWidth, detailRowY);
  
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

  // ========== ITEMS TABLE - FIXED LOCATION LINE ==========
  // Collect HSN/SAC data for summary
  const hsnSummary: Record<string, { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number }> = {};
  const gstPercent = parseFloat(data.invoice.gst_percent) || 0;
  const isInterState = data.invoice.tax_type === 'igst';

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
    let bookingDisplay = 'N/A';
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const months = Math.ceil(days / 30);
      bookingDisplay = `Start: ${formatDate(startDate)} - End: ${formatDate(endDate)}\n${days > 45 ? `Month: ${months}` : `Days: ${days}`}`;
    }
    
    // Build rich description - No internal asset codes, matching RO/Quotation style
    const descLines: string[] = [];
    const cityVal = item.city || '';
    const displayLocation = cityVal && locationVal ? `${cityVal} – ${locationVal}` : locationVal || cityVal || '-';
    descLines.push(displayLocation);
    if (directionVal && directionVal !== '-') descLines.push(`Direction: ${directionVal}`);
    descLines.push(`Area: ${areaVal || '-'}`);
    descLines.push(`Media Type: ${mediaTypeVal}`);
    if (illuminationVal && illuminationVal !== '-') descLines.push(`Illumination: ${illuminationVal}`);
    descLines.push(`HSN/SAC: ${hsnSac}`);
    const richDescription = descLines.join('\n');

    // Size column - line-wise display
    const sizeLines: string[] = [];
    if (dimensions) sizeLines.push(`Dimensions: ${dimensions}`);
    if (sqft !== '' && sqft != null) sizeLines.push(`Sqft: ${sqft}`);
    const sizeDisplay = sizeLines.length ? sizeLines.join('\n') : 'Dimensions: —';
    
    // Unit price and subtotal - include printing/mounting if present
    const baseRate = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || item.rent_amount || 0;
    const printingCost = item.printing_charges || item.printing_cost || 0;
    const mountingCost = item.mounting_charges || item.mounting_cost || 0;
    const itemTotal = item.amount || item.final_price || item.total || (baseRate + printingCost + mountingCost);
    
    // FIXED: Format unit price with full labels
    let unitPriceLines: string[] = [`Display: ${formatCurrency(baseRate)}`];
    if (printingCost > 0) unitPriceLines.push(`Printing: ${formatCurrency(printingCost)}`);
    if (mountingCost > 0) unitPriceLines.push(`Installation: ${formatCurrency(mountingCost)}`);
    const unitPriceDisplay = unitPriceLines.join('\n');

    // Aggregate HSN/SAC summary data
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
      1: { cellWidth: 78, halign: 'left' },
      2: { cellWidth: 20, halign: 'left' },
      3: { cellWidth: 28, halign: 'left', fontSize: 6 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 6;

  // ========== TOTALS SECTION - BOXED TABLE ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || (subtotal + gstAmount);
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;

  const totalsBoxWidth = 80;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;

  const summaryEndY = renderInvoiceSummaryTable({
    doc,
    x: totalsBoxX,
    y: yPos,
    width: totalsBoxWidth,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    balanceDue,
    isInterState,
  });

  yPos = summaryEndY + 6;

  // Check page space for bank details + QR
  if (yPos > pageHeight - 90) {
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
    invoiceNo: data.invoice.id || data.invoice.invoice_no,
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
  // Check if terms section fits on current page (need ~20mm)
  if (yPos + 20 > pageHeight - 15) {
    doc.addPage();
    yPos = 20;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', leftMargin, yPos);

  yPos += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const terms = [
    '1. Sites are subject to availability at the time of written confirmation.',
    '2. Matrix will not be responsible for flex Theft, Torn, Damage. Govt taxes applicable.',
    '3. Payment should be made in advance. Any dispute shall be settled at Telangana Jurisdiction.',
  ];

  terms.forEach((term) => {
    doc.text(term, leftMargin, yPos);
    yPos += 3.5;
  });

  yPos += 4;

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
      fillColor: [30, 64, 130],
      textColor: 255,
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

  // ========== AUTHORIZED SIGNATORY (Bottom-right, stamp only) ==========
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  const signBlockWidth = 55;
  const signX = pageWidth - rightMargin - signBlockWidth;
  const signCenterX = signX + signBlockWidth / 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('For,', signCenterX, yPos, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(companyName, signCenterX, yPos + 5, { align: 'center' });

  // Stamp image only (no signature line/box)
  const signatureBase64 = await loadSignatureImage();
  if (signatureBase64) {
    try {
      const stampSize = 28;
      doc.addImage(signatureBase64, 'PNG', signCenterX - stampSize / 2, yPos + 8, stampSize, stampSize);
    } catch {}
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', signCenterX, yPos + 40, { align: 'center' });

  return doc.output('blob');
}
