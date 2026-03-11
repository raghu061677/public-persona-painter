import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { ensurePdfUnicodeFont } from '@/lib/pdf/fontLoader';
import { formatCurrencyForPDF, getPrimaryContactName, getClientDisplayName, getClientAddress, getClientCity, getClientState, getClientPincode } from '@/lib/pdf/pdfHelpers';
import { getDurationDisplay } from '@/lib/utils/campaignDuration';
import { renderApprovalFooter } from '@/lib/pdf/sections/approvalFooter';

// ============= CONSTANTS =============

const MATRIX_COMPANY = {
  name: 'Matrix Network Solutions',
  address: [
    'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
    'Near Begumpet Metro Station, Opp Country Club,',
    'Begumpet, Hyderabad - 500016',
  ],
  state: 'Telangana',
  gstin: '36AATFM4107H2Z3',
  pan: 'AATFM4107H',
  phone: '+91 9666 444 888',
  email: 'info@matrix-networksolutions.com',
};

const BANK_DETAILS = {
  bankName: 'HDFC Bank Limited',
  branch: 'Karkhana Road, Secunderabad - 500009',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
  micr: '500240026',
};

const MARGINS = { top: 15, left: 14, right: 14, bottom: 15 };

const RO_TERMS = [
  'The client confirms booking of the above mentioned outdoor media locations.',
  'Artwork must be supplied minimum 3-5 days before campaign start date in high resolution PDF/CDR format.',
  'In case of site unavailability due to government action, an equivalent replacement will be provided.',
  'Media owner reserves the right to relocate site if required by municipal/government authority.',
  'Printing will be arranged by the service provider unless client provides flex/vinyl material.',
  'Damage due to weather or external reasons will be replaced within reasonable time at additional cost.',
  'Payment must be cleared before campaign start date. 100% advance is mandatory.',
  'Proof of display photographs will be shared with client within 5 working days of installation.',
  'Renewal of site will only be entertained before 10 days of site expiry.',
  'Taxes applicable as per GST rules. GST @ 18% is charged on all services.',
];

// ============= HELPERS =============

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return '-'; }
}


function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  let words = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = Math.floor(num / 100); num %= 100;
  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  if (num > 0) {
    if (words) words += 'And ';
    if (num < 20) words += ones[num];
    else { words += tens[Math.floor(num / 10)]; if (num % 10) words += '-' + ones[num % 10]; }
  }
  return words.trim();
}

// ============= MAIN GENERATOR =============

export async function generateWorkOrderPDF(planId: string): Promise<Blob> {
  // Fetch plan
  const { data: plan, error: planError } = await supabase
    .from('plans').select('*').eq('id', planId).single();
  if (planError || !plan) throw new Error('Plan not found');

  // Fetch company (seller/supplier)
  const { data: companyData } = await supabase
    .from('companies').select('*').eq('id', plan.company_id).single();

  // Fetch client (issuer)
  const { data: client, error: clientError } = await supabase
    .from('clients').select('*').eq('id', plan.client_id).single();
  if (clientError || !client) throw new Error('Client not found');

  // Fetch client contacts
  const { data: clientContacts } = await supabase
    .from('client_contacts').select('*').eq('client_id', plan.client_id)
    .order('is_primary', { ascending: false });

  const clientWithContacts = {
    ...client,
    contacts: clientContacts?.map(c => ({
      name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : null,
      first_name: c.first_name, last_name: c.last_name
    })) || []
  };

  // Fetch plan items
  const { data: planItems, error: itemsError } = await supabase
    .from('plan_items').select('*, media_assets(*)').eq('plan_id', planId);
  if (itemsError) throw new Error('Failed to fetch plan items');

  const contactName = getPrimaryContactName(clientWithContacts);
  const clientName = getClientDisplayName(client);
  const clientAddress = getClientAddress(client);
  const clientCity = getClientCity(client);
  const clientState = getClientState(client);
  const clientPincode = getClientPincode(client);

  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const supplierName = companyData?.name || MATRIX_COMPANY.name;
  const supplierGSTIN = companyData?.gstin || MATRIX_COMPANY.gstin;

  // ========== BUILD PDF ==========
  const doc = new jsPDF('p', 'mm', 'a4');
  await ensurePdfUnicodeFont(doc);
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const lm = MARGINS.left;
  const rm = MARGINS.right;
  const cw = pw - lm - rm;

  let y = MARGINS.top;

  // ===== TITLE =====
  doc.setFontSize(16);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('MEDIA RELEASE ORDER (RO)', pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Campaign Authorization Document', pw / 2, y, { align: 'center' });
  y += 2;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(lm, y, pw - rm, y);
  y += 6;

  // ===== RO DETAILS ROW =====
  const roNo = `RO-${planId}`;
  const roDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'bold');
  doc.text('Release Order No:', lm, y);
  doc.setFont('NotoSans', 'normal');
  doc.text(roNo, lm + 33, y);
  doc.setFont('NotoSans', 'bold');
  doc.text('Date:', pw / 2, y);
  doc.setFont('NotoSans', 'normal');
  doc.text(roDate, pw / 2 + 13, y);
  y += 7;

  // ===== TWO-COLUMN: ISSUED BY (Client) | MEDIA OWNER / VENDOR =====
  const colW = cw / 2 - 3;
  const boxH = 42;
  const col1X = lm;
  const col2X = lm + colW + 6;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(col1X, y, colW, boxH);
  doc.rect(col2X, y, colW, boxH);

  // --- LEFT: ISSUED BY (Client / Agency) ---
  doc.setFillColor(30, 58, 138);
  doc.rect(col1X, y, colW, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ISSUED BY (Client / Agency)', col1X + 3, y + 5);

  let ly = y + 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text(clientName, col1X + 3, ly); ly += 5;

  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  if (clientAddress) {
    const addrLines = doc.splitTextToSize(clientAddress, colW - 8);
    addrLines.slice(0, 2).forEach((line: string) => { doc.text(line, col1X + 3, ly); ly += 3.5; });
  }
  const cityLine = [clientCity, clientState, clientPincode].filter(Boolean).join(', ');
  if (cityLine) { doc.text(cityLine, col1X + 3, ly); ly += 4; }
  if (client.gst_number) {
    doc.setFont('NotoSans', 'bold');
    doc.text(`GSTIN: ${client.gst_number}`, col1X + 3, ly); ly += 4;
  }
  doc.setFont('NotoSans', 'normal');
  if (contactName && contactName !== 'N/A') { doc.text(`Contact: ${contactName}`, col1X + 3, ly); ly += 3.5; }
  if (client.phone) { doc.text(`Mobile: ${client.phone}`, col1X + 3, ly); ly += 3.5; }
  if (client.email) { doc.text(`Email: ${client.email}`, col1X + 3, ly); }

  // --- RIGHT: MEDIA OWNER / VENDOR ---
  doc.setFillColor(30, 58, 138);
  doc.rect(col2X, y, colW, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MEDIA OWNER / VENDOR', col2X + 3, y + 5);

  let ry = y + 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text(supplierName, col2X + 3, ry); ry += 5;

  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  MATRIX_COMPANY.address.forEach(line => { doc.text(line, col2X + 3, ry); ry += 3.5; });
  ry += 0.5;
  doc.setFont('NotoSans', 'bold');
  doc.text(`GSTIN: ${supplierGSTIN}`, col2X + 3, ry); ry += 4;
  doc.setFont('NotoSans', 'normal');
  doc.text(`Phone: ${MATRIX_COMPANY.phone}`, col2X + 3, ry); ry += 3.5;
  doc.text(`Email: ${MATRIX_COMPANY.email}`, col2X + 3, ry);

  y += boxH + 6;

  // ===== CAMPAIGN INFORMATION =====
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CAMPAIGN INFORMATION', lm, y);
  y += 4;

  const campaignInfoRows = [
    ['Campaign Name', plan.plan_name || planId],
    ['Brand / Client', clientName],
    ['City', clientCity || 'Hyderabad'],
    ['Campaign Duration', `${formatDate(plan.start_date)} to ${formatDate(plan.end_date)} (${getDurationDisplay(days)})`],
    ['Total Sites', `${planItems?.length || 0}`],
  ];

  autoTable(doc, {
    startY: y,
    body: campaignInfoRows,
    theme: 'grid',
    styles: {
      font: 'NotoSans', fontSize: 8.5, cellPadding: 2.5,
      lineWidth: 0.2, lineColor: [200, 200, 200], textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: cw - 35 },
    },
    margin: { left: lm, right: rm },
    tableWidth: cw,
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 6;

  // ===== MEDIA RELEASE DETAILS TABLE =====
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('MEDIA RELEASE DETAILS', lm, y);
  y += 4;

  const tableBody = planItems?.map((item: any, idx: number) => {
    const asset = item.media_assets;
    const rate = item.sales_price || item.card_rate || asset?.card_rate || 0;
    const amount = rate - (item.discount_amount || 0);
    const mounting = item.mounting_charges || item.installation_cost || 0;

    return [
      (idx + 1).toString(),
      asset?.id || item.asset_id || '-',
      `${asset?.area || '-'}\n${asset?.location || ''}`.trim(),
      asset?.media_type || '-',
      asset?.dimensions || asset?.dimension || '-',
      formatDate(plan.start_date),
      formatDate(plan.end_date),
      getDurationDisplay(days),
      formatCurrencyForPDF(rate),
      formatCurrencyForPDF(amount + mounting),
    ];
  }) || [];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Site Code', 'Location', 'Media Type', 'Size', 'Start Date', 'End Date', 'Duration', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans', fontSize: 7.5, textColor: [0, 0, 0],
      cellPadding: 2, overflow: 'linebreak', lineWidth: 0.2, lineColor: [200, 200, 200], valign: 'top',
    },
    headStyles: {
      fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 32 },
      3: { cellWidth: 18 },
      4: { cellWidth: 16 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
    },
    margin: { left: lm, right: rm, top: 20, bottom: MARGINS.bottom },
    tableWidth: cw,
    rowPageBreak: 'avoid',
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 8;

  // ===== CAMPAIGN COST SUMMARY =====
  const displayCost = planItems?.reduce((s, item) => {
    return s + ((item.sales_price || item.card_rate || item.media_assets?.card_rate || 0) - (item.discount_amount || 0));
  }, 0) || 0;
  const totalPrinting = planItems?.reduce((s, item) => s + (item.printing_charges || item.printing_cost || 0), 0) || 0;
  const totalMounting = planItems?.reduce((s, item) => s + (item.mounting_charges || item.installation_cost || 0), 0) || 0;
  const subTotal = displayCost + totalPrinting + totalMounting;
  const cgst = subTotal * 0.09;
  const sgst = subTotal * 0.09;
  const grandTotal = subTotal + cgst + sgst;

  // Check page break for summary + terms + signatures
  if (y + 120 > ph - MARGINS.bottom) { doc.addPage(); y = MARGINS.top; }

  // Two columns: Bank left, Summary right
  const leftColW = cw * 0.50;
  const rightStartX = lm + leftColW + 8;

  // --- LEFT: Bank Details ---
  let bkY = y;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Bank Details (Media Owner)', lm, bkY);
  bkY += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'bold');
  doc.text(BANK_DETAILS.bankName, lm, bkY); bkY += 4;
  doc.setFont('NotoSans', 'normal');
  doc.text(`Branch: ${BANK_DETAILS.branch}`, lm, bkY); bkY += 4;
  doc.text(`Account No: ${BANK_DETAILS.accountNo}`, lm, bkY); bkY += 4;
  doc.text(`IFSC: ${BANK_DETAILS.ifsc}`, lm, bkY); bkY += 4;
  doc.text(`MICR: ${BANK_DETAILS.micr}`, lm, bkY);

  // --- RIGHT: Campaign Cost Summary ---
  const summaryRows: string[][] = [
    ['Media Cost (Rent)', formatCurrencyForPDF(displayCost)],
  ];
  if (totalPrinting > 0) summaryRows.push(['Printing Cost', formatCurrencyForPDF(totalPrinting)]);
  if (totalMounting > 0) summaryRows.push(['Mounting Cost', formatCurrencyForPDF(totalMounting)]);
  summaryRows.push(
    ['Taxable Amount', formatCurrencyForPDF(subTotal)],
    ['CGST @ 9%', formatCurrencyForPDF(cgst)],
    ['SGST @ 9%', formatCurrencyForPDF(sgst)],
  );

  autoTable(doc, {
    startY: y - 2,
    head: [['CAMPAIGN COST SUMMARY', '']],
    body: summaryRows,
    theme: 'grid',
    styles: { font: 'NotoSans', fontSize: 8.5, cellPadding: 2.5, lineWidth: 0.2, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40, halign: 'left' },
      1: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: rightStartX },
    tableWidth: 70,
  });
  // @ts-ignore
  let sumEndY = doc.lastAutoTable.finalY;

  // Grand Total
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(rightStartX, sumEndY + 1, rightStartX + 70, sumEndY + 1);
  sumEndY += 6;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text('Grand Total', rightStartX + 2, sumEndY);
  doc.text(formatCurrencyForPDF(grandTotal), rightStartX + 68, sumEndY, { align: 'right' });
  sumEndY += 5;
  doc.setFontSize(7.5);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);
  const words = `(${numberToWords(Math.round(grandTotal))} Rupees Only)`;
  const wrappedWords = doc.splitTextToSize(words, 68);
  wrappedWords.forEach((line: string) => { doc.text(line, rightStartX + 2, sumEndY); sumEndY += 3.5; });

  y = Math.max(bkY, sumEndY) + 10;

  // ===== ARTWORK SPECIFICATIONS =====
  if (y + 30 > ph - MARGINS.bottom) { doc.addPage(); y = MARGINS.top; }

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('ARTWORK SPECIFICATIONS', lm, y);
  y += 5;

  const artworkRows = [
    ['Material', 'Star Flex / Vinyl'],
    ['Artwork Format', 'High Resolution PDF / CDR / AI'],
    ['Submission Deadline', '3-5 days before display start date'],
    ['Resolution', 'Minimum 150 DPI at actual print size'],
    ['Colour Mode', 'CMYK'],
  ];

  autoTable(doc, {
    startY: y,
    body: artworkRows,
    theme: 'grid',
    styles: {
      font: 'NotoSans', fontSize: 8, cellPadding: 2,
      lineWidth: 0.2, lineColor: [200, 200, 200], textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: cw - 40 },
    },
    margin: { left: lm, right: rm },
    tableWidth: cw,
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 8;

  // ===== TERMS & CONDITIONS =====
  if (y + 50 > ph - MARGINS.bottom) { doc.addPage(); y = MARGINS.top; }

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Terms & Conditions', lm, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);

  RO_TERMS.forEach((term, idx) => {
    if (y + 8 > ph - MARGINS.bottom - 30) { doc.addPage(); y = MARGINS.top; }
    const text = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(text, cw);
    lines.forEach((line: string) => { doc.text(line, lm, y); y += 3.8; });
    y += 1.5;
  });

  y += 8;

  // ===== AUTHORIZATION / SIGNATURES (Reusable Two-Box Layout) =====
  if (y + 60 > ph - MARGINS.bottom) { doc.addPage(); y = MARGINS.top; }

  y = await renderApprovalFooter(doc, y, {
    companyName: supplierName,
    leftTitle: 'Client Authorization',
    pageWidth: pw,
    leftMargin: lm,
    rightMargin: rm,
  });

  return doc.output('blob');
}
