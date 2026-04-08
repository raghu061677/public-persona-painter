// Default Existing Template - Zoho-style Layout with Compact Alignment
// Professional GST-compliant invoice with tighter spacing & cleaner visual hierarchy

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';
import { renderPaymentQRSection } from './paymentQR';
import { getBankDetailsFromCompany } from '@/lib/bankDetails';
import { renderInvoiceSummaryTable } from './summaryTableHelper';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';

// Cache stamp image
let cachedStampBase64: string | null = null;
async function loadStampImage(): Promise<string | undefined> {
  if (cachedStampBase64) return cachedStampBase64;
  try {
    const res = await fetch(stampImageUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    cachedStampBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedStampBase64 || undefined;
  } catch {
    return undefined;
  }
}

export async function renderDefaultTemplate(data: InvoiceData): Promise<Blob> {
  const bankDetails = getBankDetailsFromCompany(data.company);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 10;
  const rightMargin = 10;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const isDraft = data.invoice.is_draft === true;
  const docTitle = isDraft ? 'PROFORMA INVOICE' : (invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE');
  
  let yPos = 14;

  // ========== HEADER SECTION (Compact) ==========
  const logoWidth = 36;
  const logoHeight = 26;
  let logoEndX = leftMargin;

  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, logoWidth, logoHeight);
      logoEndX = leftMargin + logoWidth + 5;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name
  let textY = yPos + 3;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, logoEndX, textY);

  // Company Address - tighter
  textY += 4.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(COMPANY_ADDRESS.line1, logoEndX, textY);
  textY += 2.8;
  doc.text(COMPANY_ADDRESS.line2, logoEndX, textY);
  textY += 2.8;
  doc.text(`${COMPANY_ADDRESS.cityLine} ${COMPANY_ADDRESS.country}`, logoEndX, textY);
  textY += 3;
  doc.text(`Phone: ${COMPANY_ADDRESS.phone}  |  ${COMPANY_ADDRESS.email}`, logoEndX, textY);

  // GSTIN below contact
  textY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, textY);

  // Document title - right-aligned, vertically centered with header
  const titleY = yPos + 10;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 130);
  doc.text(docTitle, pageWidth - rightMargin, titleY, { align: 'right' });

  yPos = yPos + logoHeight + 2;

  // Thin divider line
  doc.setDrawColor(30, 64, 130);
  doc.setLineWidth(0.6);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
  yPos += 0.6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 3;

  // ========== INVOICE DETAILS (Zoho-style: light background band) ==========
  const detailBandHeight = 20;
  doc.setFillColor(248, 249, 250);
  doc.rect(leftMargin, yPos - 1, contentWidth, detailBandHeight, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.rect(leftMargin, yPos - 1, contentWidth, detailBandHeight, 'S');

  const leftColX = leftMargin + 3;
  const rightColX = pageWidth / 2 + 8;
  const labelW = 24;
  const rLabelW = 26;
  
  const termsMode = data.invoice.terms_mode || 'DUE_ON_RECEIPT';
  const termsDays = data.invoice.terms_days || 0;
  const termsLabel = termsMode === 'DUE_ON_RECEIPT' ? 'Due on Receipt' :
    termsMode === 'NET_30' ? '30 Net Days' :
    termsMode === 'NET_45' ? '45 Net Days' :
    termsMode === 'CUSTOM' ? `${termsDays} Net Days` : 'Due on Receipt';

  const invoiceNoLabel = invoiceType === 'PROFORMA' || isDraft ? 'Proforma No' : 'Invoice No';

  doc.setFontSize(7.5);
  let detailRowY = yPos + 3;

  // Helper for detail rows
  const drawDetailRow = (lx: number, ly: number, label: string, value: string, lw: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, lx, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`: ${value}`, lx + lw, ly);
  };

  // Row 1
  drawDetailRow(leftColX, detailRowY, invoiceNoLabel, data.invoice.id || data.invoice.invoice_no, labelW);
  drawDetailRow(rightColX, detailRowY, 'Place Of Supply', data.invoice.place_of_supply || 'Telangana (36)', rLabelW);
  
  detailRowY += 4;

  // Row 2
  drawDetailRow(leftColX, detailRowY, 'Invoice Date', formatDate(data.invoice.invoice_date), labelW);
  drawDetailRow(rightColX, detailRowY, 'Sales Person', data.invoice.sales_person || data.company?.owner_name || 'Raghunath Gajula', rLabelW);
  
  detailRowY += 4;

  // Row 3
  drawDetailRow(leftColX, detailRowY, 'Terms', termsLabel, labelW);
  drawDetailRow(rightColX, detailRowY, 'Due Date', formatDate(data.invoice.due_date), rLabelW);

  detailRowY += 4;

  // Row 4 - HSN/SAC + Client PO
  drawDetailRow(leftColX, detailRowY, 'HSN/SAC', HSN_SAC_CODE, labelW);

  const clientPoNumber = data.invoice.client_po_number || data.campaign?.client_po_number;
  const clientPoDate = data.invoice.client_po_date || data.campaign?.client_po_date;
  if (clientPoNumber) {
    const poText = clientPoDate ? `${clientPoNumber} (${formatDate(clientPoDate)})` : clientPoNumber;
    drawDetailRow(rightColX, detailRowY, 'Client PO/WO', poText, rLabelW);
  }

  yPos = yPos - 1 + detailBandHeight + 3;

  // ========== BILL TO / SHIP TO (Auto-height, compact) ==========
  const colMidX = pageWidth / 2;
  const leftColWidth = colMidX - leftMargin - 2;
  const rightColWidth = pageWidth - rightMargin - colMidX - 2;

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
    gstin: data.client.gst_number || '',
    sameAsBillTo: !hasShippingAddress,
  };

  // Measure address content height
  const measureAddressHeight = (addr: typeof billTo, maxW: number): number => {
    let h = 4; // name
    if (addr.address1) {
      const lines = doc.splitTextToSize(addr.address1, maxW - 6);
      h += Math.min(lines.length, 2) * 2.8;
    }
    if (addr.address2) h += 2.8;
    const csp = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    if (csp) h += 2.8;
    if (addr.gstin) h += 4;
    return h + 3; // padding
  };

  const billH = measureAddressHeight(billTo, leftColWidth);
  const shipH = measureAddressHeight(shipTo, rightColWidth);
  const boxHeight = Math.max(billH, shipH, 20);

  // Headers - rounded-feel with smaller height
  const headerH = 5;
  doc.setFillColor(30, 64, 130);
  doc.rect(leftMargin, yPos, leftColWidth, headerH, 'F');
  doc.rect(colMidX + 2, yPos, rightColWidth, headerH, 'F');
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Bill To', leftMargin + 3, yPos + 3.5);
  doc.text('Ship To', colMidX + 5, yPos + 3.5);

  yPos += headerH;

  // Content boxes
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(leftMargin, yPos, leftColWidth, boxHeight, 'S');
  doc.rect(colMidX + 2, yPos, rightColWidth, boxHeight, 'S');

  // Render address content
  const renderAddress = (addr: typeof billTo, startX: number, maxW: number, isSameAsBillTo: boolean = false) => {
    let ay = yPos + 3.5;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(addr.name, startX + 3, ay);
    
    if (isSameAsBillTo) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140, 140, 140);
      doc.text('(Same as Bill To)', startX + 3 + doc.getTextWidth(addr.name) + 1.5, ay);
    }
    
    ay += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(70, 70, 70);
    
    if (addr.address1) {
      const lines = doc.splitTextToSize(addr.address1, maxW - 6);
      lines.slice(0, 2).forEach((line: string) => {
        doc.text(line, startX + 3, ay);
        ay += 2.8;
      });
    }
    if (addr.address2) {
      doc.text(addr.address2.substring(0, 50), startX + 3, ay);
      ay += 2.8;
    }
    const csp = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    if (csp) {
      doc.text(csp, startX + 3, ay);
      ay += 2.8;
    }
    if (addr.gstin) {
      ay += 0.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`GSTIN: ${addr.gstin}`, startX + 3, ay);
    }
  };

  renderAddress(billTo, leftMargin, leftColWidth);
  renderAddress(shipTo, colMidX + 2, rightColWidth, shipTo.sameAsBillTo);

  yPos = yPos + boxHeight + 3;

  // ========== CAMPAIGN INFO (Compact strip) ==========
  if (data.campaign?.campaign_name) {
    doc.setFillColor(243, 244, 246);
    doc.rect(leftMargin, yPos, contentWidth, 5.5, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(leftMargin, yPos, contentWidth, 5.5, 'S');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 3, yPos + 3.8);
    
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const campaignDuration = `(${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)})`;
      doc.text(campaignDuration, pageWidth - rightMargin - 3, yPos + 3.8, { align: 'right' });
    }
    
    yPos += 8;
  }

  // ========== ITEMS TABLE ==========
  const hsnSummary: Record<string, { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number }> = {};
  const gstPercent = parseFloat(data.invoice.gst_percent) || 0;
  const isInterState = data.invoice.tax_type === 'igst' || data.invoice.gst_mode === 'IGST';

  const tableData = data.items.map((item: any, index: number) => {
    const assetCode = item.asset_code || item.asset_id || '';
    const locationVal = item.location || item.description || '-';
    const areaVal = item.area || item.zone || '-';
    const directionVal = item.direction || '-';
    const mediaTypeVal = item.media_type || '-';
    const illuminationVal = item.illumination || item.illumination_type || '-';
    const dimensions = item.dimensions || item.dimension_text || item.size || item.dimension || '';
    const sqft = item.total_sqft || item.sqft || item.meta?.total_sqft || '';
    const hsnSac = item.hsn_sac || HSN_SAC_CODE;
    
    const startDate = item.start_date || item.booking_start_date || data.campaign?.start_date;
    const endDate = item.end_date || item.booking_end_date || data.campaign?.end_date;
    let bookingDisplay = 'N/A';
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      bookingDisplay = `${formatDate(startDate)}\nto ${formatDate(endDate)}\n${days} Days`;
    }
    
    const descLines: string[] = [];
    if (assetCode && !/^[0-9a-f]{8}-/.test(assetCode)) descLines.push(`[${assetCode}]`);
    descLines.push(`Location: ${locationVal || '-'}`);
    if (directionVal && directionVal !== '-') descLines.push(`Direction: ${directionVal} | Area: ${areaVal || '-'}`);
    else descLines.push(`Area: ${areaVal || '-'}`);
    descLines.push(`Media: ${mediaTypeVal} | Lit: ${illuminationVal}`);
    descLines.push(`HSN/SAC: ${hsnSac}`);
    const richDescription = descLines.join('\n');

    const sizeLines: string[] = [];
    if (dimensions) sizeLines.push(`Dimensions: ${dimensions}`);
    if (sqft !== '' && sqft != null) sizeLines.push(`Sqft: ${sqft}`);
    const sizeDisplay = sizeLines.length ? sizeLines.join('\n') : 'Dimensions: —';
    
    // INVARIANT: Finalized invoice items are immutable snapshots.
    // Pricing must come from stored JSONB values, never from live campaign/media asset data.
    // Priority: rent_amount → rate → amount (all stored in JSONB) → fallback to display_rate/negotiated_rate
    const baseRate = item.rent_amount || item.rate || item.amount || item.unit_price || item.display_rate || item.negotiated_rate || 0;
    const printingCost = item.printing_charges || item.printing_cost || 0;
    const mountingCost = item.mounting_charges || item.mounting_cost || 0;
    const itemTotal = baseRate + printingCost + mountingCost;
    
    let unitPriceLines: string[] = [`Display: ${formatCurrency(baseRate)}`];
    unitPriceLines.push(`Printing: ${formatCurrency(printingCost)}`);
    unitPriceLines.push(`Installation: ${formatCurrency(mountingCost)}`);
    const unitPriceDisplay = unitPriceLines.join('\n');

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
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 30, 30],
      valign: 'top',
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 80, halign: 'left' },
      2: { cellWidth: 24, halign: 'left' },
      3: { cellWidth: 28, halign: 'left', fontSize: 6 },
      4: { cellWidth: 29, halign: 'left' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 4;

  // ========== BANK DETAILS + FINANCIAL SUMMARY (Side by Side) ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const gstAmount = parseFloat(data.invoice.gst_amount) || 0;
  const grandTotal = parseFloat(data.invoice.total_amount) || (subtotal + gstAmount);
  const balanceDue = data.invoice.balance_due != null ? parseFloat(data.invoice.balance_due) : grandTotal;

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 15;
  }

  const bankStartY = yPos;
  const totalsBoxWidth = 79;
  const totalsBoxX = pageWidth - rightMargin - totalsBoxWidth;
  const bankBoxWidth = totalsBoxX - leftMargin - 3;

  // Bank Details
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Bank Details', leftMargin + 3, bankStartY + 5);

  let bankY = bankStartY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);

  const bankLines = [
    ['Bank', bankDetails.bankName],
    ['Branch', bankDetails.branch],
    ['A/C Name', bankDetails.accountName],
    ['A/C No', bankDetails.accountNo],
    ['IFSC', bankDetails.ifsc],
  ];

  bankLines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, leftMargin + 3, bankY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`: ${value}`, leftMargin + 20, bankY);
    bankY += 4;
  });

  // Financial Summary
  const summaryResult = renderInvoiceSummaryTable({
    doc,
    x: totalsBoxX,
    y: bankStartY,
    width: totalsBoxWidth,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    balanceDue,
    paidAmount: parseFloat(data.invoice.paid_amount) || 0,
    tdsAmount: data.invoice.total_tds_amount || 0,
    paidDate: data.invoice.last_payment_date || null,
    isInterState,
  });

  // Draw bank box using max of bank content and summary height
  const bankContentBottom = bankY + 3;
  const bankBoxHeight = Math.max(summaryResult.totalRowBottomY - bankStartY, bankContentBottom - bankStartY);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(leftMargin, bankStartY, bankBoxWidth, bankBoxHeight, 'S');

  yPos = Math.max(bankStartY + bankBoxHeight, summaryResult.endY) + 2;

  // ========== AUTHORIZED SIGNATORY (Compact, right-aligned) ==========
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = 15;
  }

  const signBlockX = totalsBoxX + 8;
  const signBlockCenterX = totalsBoxX + totalsBoxWidth / 2;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('For,', signBlockCenterX, yPos, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(companyName, signBlockCenterX, yPos + 4, { align: 'center' });

  const stampBase64 = await loadStampImage();
  if (stampBase64) {
    try {
      const stampSize = 22;
      doc.addImage(stampBase64, 'PNG', signBlockCenterX - stampSize / 2, yPos + 6, stampSize, stampSize);
    } catch {}
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.line(signBlockCenterX - 22, yPos + 28, signBlockCenterX + 22, yPos + 28);
  doc.text('Authorized Signatory', signBlockCenterX, yPos + 32, { align: 'center' });

  yPos = yPos + 35;

  // ========== PAYMENT QR CODE ==========
  if (yPos > pageHeight - 45) {
    doc.addPage();
    yPos = 15;
  }

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

  yPos = Math.max(yPos, qrY + qrHeight) + 3;

  // ========== TERMS & CONDITIONS ==========
  const { renderTermsBoxPDF } = await import('@/lib/terms/standardTerms');
  yPos = renderTermsBoxPDF(doc, yPos, {
    pageWidth,
    pageHeight,
    leftMargin,
    rightMargin,
    bottomMargin: 12,
    fontFamily: 'helvetica',
    onNewPage: () => { doc.addPage(); return 15; },
    company: data.company,
  });

  yPos += 3;

  // ========== HSN/SAC SUMMARY TABLE ==========
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('HSN/SAC Summary:', leftMargin, yPos);
  yPos += 2;

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
      hsnTableBody.push([hsn, formatCurrency(values.taxable), `${values.igstRate}%`, formatCurrency(values.igstAmount), formatCurrency(lineTax)]);
    } else {
      hsnTableBody.push([hsn, formatCurrency(values.taxable), `${values.cgstRate}%`, formatCurrency(values.cgstAmount), `${values.sgstRate}%`, formatCurrency(values.sgstAmount), formatCurrency(lineTax)]);
    }
  });

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
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [40, 40, 40],
      halign: 'center',
      cellPadding: 1.5,
    },
    columnStyles: isInterState ? {
      0: { halign: 'left', cellWidth: 26 },
      1: { halign: 'right', cellWidth: 34 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 30 },
    } : {
      0: { halign: 'left', cellWidth: 20 },
      1: { halign: 'right', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  return doc.output('blob');
}
