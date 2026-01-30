// Classic Tax Invoice Template - Conservative, Audit-Friendly
// For audits, government, corporate clients

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, formatCurrency, formatDate, numberToWords, COMPANY_ADDRESS, HSN_SAC_CODE } from './types';

export function renderClassicTaxTemplate(data: InvoiceData): Blob {
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

  // ========== OUTER BORDER ==========
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(leftMargin - 2, 10, contentWidth + 4, pageHeight - 20);

  // ========== HEADER BOX ==========
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, yPos, contentWidth, 28, 'FD');

  // Logo
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin + 3, yPos + 3, 22, 22);
    } catch (e) {
      console.log('Logo error:', e);
    }
  }

  // Company name centered
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, pageWidth / 2, yPos + 8, { align: 'center' });

  // Address centered
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_ADDRESS.line1, pageWidth / 2, yPos + 13, { align: 'center' });
  doc.text(`${COMPANY_ADDRESS.cityLine} | Phone: ${COMPANY_ADDRESS.phone}`, pageWidth / 2, yPos + 17, { align: 'center' });
  doc.text(`Email: ${COMPANY_ADDRESS.email} | GSTIN: ${companyGSTIN}`, pageWidth / 2, yPos + 21, { align: 'center' });

  yPos += 30;

  // ========== DOCUMENT TITLE BOX ==========
  doc.setFillColor(0, 0, 0);
  doc.rect(leftMargin, yPos, contentWidth, 8, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle, pageWidth / 2, yPos + 5.5, { align: 'center' });

  yPos += 10;

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
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: (contentWidth - 56) / 2 },
      2: { fontStyle: 'bold', cellWidth: 28 },
      3: { cellWidth: (contentWidth - 56) / 2 },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 2;

  // ========== BILL TO / SHIP TO BOXES ==========
  const halfWidth = contentWidth / 2 - 1;

  // Bill To Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, yPos, halfWidth, 30);
  
  doc.setFillColor(220, 220, 220);
  doc.rect(leftMargin, yPos, halfWidth, 6, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('BILL TO', leftMargin + 2, yPos + 4.5);

  let billY = yPos + 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.name || 'Client', leftMargin + 2, billY);
  billY += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const billAddr = data.client.billing_address_line1 || '';
  if (billAddr) {
    const lines = doc.splitTextToSize(billAddr, halfWidth - 6);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 2, billY);
      billY += 3.5;
    });
  }
  
  const cityState = [data.client.billing_city, data.client.billing_state, data.client.billing_pincode].filter(Boolean).join(', ');
  if (cityState) {
    doc.text(cityState, leftMargin + 2, billY);
    billY += 3.5;
  }
  
  if (data.client.gst_number) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${data.client.gst_number}`, leftMargin + 2, billY);
  }

  // Ship To Box
  const shipX = leftMargin + halfWidth + 2;
  doc.rect(shipX, yPos, halfWidth, 30);
  
  doc.setFillColor(220, 220, 220);
  doc.rect(shipX, yPos, halfWidth, 6, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIP TO', shipX + 2, yPos + 4.5);

  let shipY = yPos + 10;
  doc.text(data.client.name || 'Client', shipX + 2, shipY);
  shipY += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const shipAddr = data.client.shipping_address_line1 || data.client.billing_address_line1 || '';
  if (shipAddr) {
    const lines = doc.splitTextToSize(shipAddr, halfWidth - 6);
    lines.slice(0, 2).forEach((line: string) => {
      doc.text(line, shipX + 2, shipY);
      shipY += 3.5;
    });
  }

  yPos += 33;

  // ========== CAMPAIGN INFO ==========
  if (data.campaign?.campaign_name) {
    doc.setDrawColor(0, 0, 0);
    doc.rect(leftMargin, yPos, contentWidth, 7);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin + 2, yPos + 5);
    
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)}`, pageWidth - rightMargin - 2, yPos + 5, { align: 'right' });
    }
    
    yPos += 9;
  }

  // ========== ITEMS TABLE - Heavy borders ==========
  const tableData = data.items.map((item: any, index: number) => {
    const desc = `[${item.asset_id || ''}] ${item.location || item.description || 'Media Display'}\nZone: ${item.area || '-'} | Media: ${item.media_type || '-'}`;
    const size = `${item.dimensions || '-'}\n${item.total_sqft ? item.total_sqft + ' sft' : ''}`;
    const period = item.start_date && item.end_date 
      ? `${formatDate(item.start_date)}\nto\n${formatDate(item.end_date)}`
      : '-';
    const rate = item.rate || item.unit_price || item.negotiated_rate || 0;
    const amount = item.amount || item.final_price || rate;

    return [
      (index + 1).toString(),
      desc,
      size,
      HSN_SAC_CODE,
      period,
      formatCurrency(rate),
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['S.No', 'Description', 'Size', 'HSN/SAC', 'Period', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      valign: 'top',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'center', fontSize: 6.5 },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
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

  doc.setFontSize(9);
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
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
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
  doc.rect(totalsX, totalsY, 55, 32);

  const labelX = totalsX + 3;
  const valueX = totalsX + 52;
  let rowY = totalsY + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', labelX, rowY);
  doc.text(formatCurrency(subtotal), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.text('CGST (9%):', labelX, rowY);
  doc.text(formatCurrency(cgst), valueX, rowY, { align: 'right' });

  rowY += 5;
  doc.text('SGST (9%):', labelX, rowY);
  doc.text(formatCurrency(sgst), valueX, rowY, { align: 'right' });

  rowY += 6;
  doc.setLineWidth(0.3);
  doc.line(totalsX + 2, rowY - 2, totalsX + 53, rowY - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL:', labelX, rowY);
  doc.text(formatCurrency(grandTotal), valueX, rowY, { align: 'right' });

  rowY += 6;
  doc.setTextColor(200, 0, 0);
  doc.text('Balance Due:', labelX, rowY);
  doc.text(formatCurrency(balanceDue), valueX, rowY, { align: 'right' });

  yPos = Math.max(hsnEndY, totalsY + 35) + 5;

  // Amount in words
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Amount in Words:', leftMargin, yPos);
  doc.setFont('helvetica', 'normal');
  const words = numberToWords(Math.round(grandTotal));
  doc.text(`Indian Rupees ${words} Only`, leftMargin + 28, yPos);

  yPos += 8;

  // Check page space
  if (yPos > pageHeight - 55) {
    doc.addPage();
    yPos = 20;
  }

  // ========== BANK DETAILS BOX ==========
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftMargin, yPos, contentWidth * 0.55, 22);
  
  doc.setFillColor(230, 230, 230);
  doc.rect(leftMargin, yPos, contentWidth * 0.55, 5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK DETAILS', leftMargin + 2, yPos + 3.5);

  let bankY = yPos + 8;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank: HDFC Bank Limited', leftMargin + 2, bankY);
  bankY += 3.5;
  doc.text('A/C No: 50200010727301', leftMargin + 2, bankY);
  bankY += 3.5;
  doc.text('IFSC: HDFC0001555', leftMargin + 2, bankY);
  bankY += 3.5;
  doc.text('Branch: Karkhana Road, Secunderabad', leftMargin + 2, bankY);

  // ========== SIGNATURE BOX ==========
  const signBoxX = leftMargin + contentWidth * 0.58;
  const signBoxWidth = contentWidth * 0.42;
  
  doc.rect(signBoxX, yPos, signBoxWidth, 22);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + companyName, signBoxX + signBoxWidth / 2, yPos + 5, { align: 'center' });

  doc.setDrawColor(0, 0, 0);
  doc.line(signBoxX + 8, yPos + 16, signBoxX + signBoxWidth - 8, yPos + 16);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signBoxX + signBoxWidth / 2, yPos + 20, { align: 'center' });

  yPos += 25;

  // ========== TERMS BOX ==========
  doc.rect(leftMargin, yPos, contentWidth, 18);
  
  doc.setFillColor(230, 230, 230);
  doc.rect(leftMargin, yPos, contentWidth, 5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', leftMargin + 2, yPos + 3.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  let termY = yPos + 8;
  const terms = [
    '1. Sites are subject to availability at the time of written confirmation.',
    '2. Matrix will not be responsible for flex Theft, Torn, Damage. Govt taxes applicable.',
    '3. Payment should be made in advance. Any dispute shall be settled at Telangana Jurisdiction.',
  ];
  terms.forEach(term => {
    doc.text(term, leftMargin + 2, termY);
    termY += 3;
  });

  return doc.output('blob');
}
