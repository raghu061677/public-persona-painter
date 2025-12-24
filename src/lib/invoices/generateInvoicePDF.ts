import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/utils/finance';

interface InvoiceData {
  invoice: any;
  client: any;
  items: any[];
  orgSettings?: any;
}

// Default company address
const COMPANY_ADDRESS = {
  line1: 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
  line2: 'Near Begumpet Metro Station, Opp Country Club, Begumpet,',
  cityLine: 'Hyderabad Telangana 500016 India',
  phone: '+91-9666444888',
  email: 'raghu@matrix-networksolutions.com',
  website: 'www.matrixnetworksolutions.com',
};

export async function generateInvoicePDF(invoiceId: string): Promise<Blob> {
  // Fetch invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) throw new Error('Invoice not found');

  // Fetch client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', invoice.client_id)
    .single();

  if (clientError || !client) throw new Error('Client not found');

  // Fetch company details
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', invoice.company_id)
    .single();

  // Fetch organization settings as fallback
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('*')
    .single();

  const data: InvoiceData = {
    invoice,
    client,
    items: Array.isArray(invoice.items) ? invoice.items : [],
    orgSettings: companyData || orgSettings,
  };

  return createInvoicePDF(data);
}

function createInvoicePDF(data: InvoiceData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const rightMargin = 14;

  // Company info
  const companyName = data.orgSettings?.name || 'Matrix Network Solutions';
  const companyGSTIN = data.orgSettings?.gstin || '36AATFM4107H2Z3';

  let yPos = 15;

  // ========== HEADER SECTION (From PDF 2) ==========
  // Company Name - Bold, Blue
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(companyName, leftMargin, yPos);

  // Company Address
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(COMPANY_ADDRESS.line1, leftMargin, yPos);
  yPos += 3.5;
  doc.text(COMPANY_ADDRESS.line2, leftMargin, yPos);
  yPos += 3.5;
  doc.text(COMPANY_ADDRESS.cityLine, leftMargin, yPos);

  // Contact info
  yPos += 4;
  doc.text(`Phone : ${COMPANY_ADDRESS.phone}`, leftMargin, yPos);
  yPos += 3.5;
  doc.text(`Email: ${COMPANY_ADDRESS.email}`, leftMargin, yPos);
  yPos += 3.5;
  doc.text(`Website: ${COMPANY_ADDRESS.website}`, leftMargin, yPos);

  // TAX INVOICE title - Right side
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TAX INVOICE', pageWidth - rightMargin, 20, { align: 'right' });

  // GSTIN below title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`GSTIN : ${companyGSTIN}`, pageWidth - rightMargin, 27, { align: 'right' });

  yPos += 8;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 8;

  // ========== INVOICE DETAILS GRID (From PDF 2) ==========
  const colMidX = pageWidth / 2;
  const boxHeight = 30;

  // Invoice Details Box (Right side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Details', colMidX + 5, yPos);

  yPos += 5;
  const detailsStartY = yPos;

  // Draw box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(colMidX + 2, detailsStartY, (pageWidth - rightMargin - colMidX - 2), boxHeight);

  // Invoice details content
  let detailY = detailsStartY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const invoiceDetails = [
    ['Invoice No:', data.invoice.id],
    ['Place Of Supply:', 'Telangana (36)'],
    ['Invoice Date:', new Date(data.invoice.invoice_date).toLocaleDateString('en-IN')],
    ['Sales person:', data.orgSettings?.owner_name || 'Raghunath Gajula'],
    ['Terms:', 'Due on Receipt'],
    ['Due Date:', new Date(data.invoice.due_date).toLocaleDateString('en-IN')],
  ];

  invoiceDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, colMidX + 5, detailY);
    doc.setFont('helvetica', 'bold');
    doc.text(value, colMidX + 38, detailY);
    detailY += 4.5;
  });

  yPos = detailsStartY + boxHeight + 8;

  // ========== BILL TO / SHIP TO GRID (From PDF 2) ==========
  const billToWidth = (colMidX - leftMargin - 5);
  const shipToWidth = (pageWidth - rightMargin - colMidX - 5);

  // Bill To Header
  doc.setFillColor(245, 245, 245);
  doc.rect(leftMargin, yPos, billToWidth, 6, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(leftMargin, yPos, billToWidth, 6, 'S');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To', leftMargin + 3, yPos + 4);

  // Ship To Header
  doc.setFillColor(245, 245, 245);
  doc.rect(colMidX + 2, yPos, shipToWidth, 6, 'F');
  doc.rect(colMidX + 2, yPos, shipToWidth, 6, 'S');
  doc.text('Ship To', colMidX + 5, yPos + 4);

  yPos += 6;
  const contentBoxHeight = 28;

  // Bill To Content Box
  doc.rect(leftMargin, yPos, billToWidth, contentBoxHeight, 'S');
  // Ship To Content Box
  doc.rect(colMidX + 2, yPos, shipToWidth, contentBoxHeight, 'S');

  // Bill To Content
  let billY = yPos + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.name || data.client.company || '', leftMargin + 3, billY);
  billY += 4;

  doc.setFont('helvetica', 'normal');
  const clientAddress = data.client.billing_address_line1 || data.client.address || '';
  if (clientAddress) {
    const addressLines = doc.splitTextToSize(clientAddress, billToWidth - 8);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 3, billY);
      billY += 3.5;
    });
  }

  const cityState = [
    data.client.billing_city || data.client.city || '',
    data.client.billing_pincode || data.client.pincode || '',
    data.client.billing_state || data.client.state || '',
    'India'
  ].filter(Boolean).join(' ');
  doc.text(cityState, leftMargin + 3, billY);

  // Ship To Content (same as Bill To)
  let shipY = yPos + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.name || data.client.company || '', colMidX + 5, shipY);
  shipY += 4;

  doc.setFont('helvetica', 'normal');
  if (clientAddress) {
    const addressLines = doc.splitTextToSize(clientAddress, shipToWidth - 8);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, colMidX + 5, shipY);
      shipY += 3.5;
    });
  }
  doc.text(cityState, colMidX + 5, shipY);

  yPos += contentBoxHeight + 8;

  // ========== INVOICE ITEMS HEADER (From PDF 2) ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Items', leftMargin, yPos);

  yPos += 5;

  // ========== ITEMS TABLE (Body from PDF 1 style) ==========
  const tableData = data.items.map((item: any, index: number) => {
    const description = item.description || 'Media Display Service';
    const size = item.size || item.dimensions || '-';
    const booking = item.booking_period || 
      (item.start_date && item.end_date 
        ? `From:${new Date(item.start_date).toLocaleDateString('en-IN')} To:${new Date(item.end_date).toLocaleDateString('en-IN')}` 
        : '-');
    const unitPrice = item.rate || item.unit_price || 0;
    const subtotal = item.amount || (unitPrice * (item.quantity || 1));

    return [
      (index + 1).toString(),
      description,
      size,
      booking,
      formatINR(unitPrice),
      formatINR(subtotal),
    ];
  });

  // Add HSN/SAC code row if available
  const hsnCode = data.invoice.hsn_code || '998361';

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item & Description', 'Size', 'Booking', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 0,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // ========== TOTALS SECTION (From PDF 2) ==========
  const totalsX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', leftMargin, yPos);

  yPos += 6;

  // Amount in words
  const subtotal = data.invoice.sub_total || 0;
  const cgst = data.invoice.gst_amount ? data.invoice.gst_amount / 2 : subtotal * 0.09;
  const sgst = data.invoice.gst_amount ? data.invoice.gst_amount / 2 : subtotal * 0.09;
  const grandTotal = data.invoice.total_amount || (subtotal + cgst + sgst);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total In Words: ${numberToWords(grandTotal)}`, leftMargin, yPos);

  yPos += 8;

  // Totals box
  doc.setDrawColor(200, 200, 200);
  doc.rect(totalsX - 5, yPos - 3, 75, 32, 'S');

  let totalY = yPos;
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', totalsX, totalY);
  doc.text(formatINR(subtotal), pageWidth - rightMargin - 5, totalY, { align: 'right' });

  totalY += 6;
  doc.text(`CGST9 (9%):`, totalsX, totalY);
  doc.text(formatINR(cgst), pageWidth - rightMargin - 5, totalY, { align: 'right' });

  totalY += 6;
  doc.text(`SGST9 (9%):`, totalsX, totalY);
  doc.text(formatINR(sgst), pageWidth - rightMargin - 5, totalY, { align: 'right' });

  totalY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX, totalY);
  doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - rightMargin - 5, totalY, { align: 'right' });

  totalY += 6;
  doc.text('Balance Due:', totalsX, totalY);
  doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - rightMargin - 5, totalY, { align: 'right' });

  yPos = totalY + 12;

  // ========== BANK DETAILS (From PDF 2) ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bankers Information', leftMargin, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const bankDetails = [
    'HDFC Bank Limited,',
    'Account Branch: KARKHANA ROAD, SECUNDERABAD 500009',
    'Account No: 50200010727301',
    'RTGS/NEFT IFSC: HDFC0001555',
    'MICR: 500240026',
  ];

  bankDetails.forEach((line) => {
    doc.text(line, leftMargin, yPos);
    yPos += 3.5;
  });

  yPos += 5;

  // ========== TERMS & CONDITIONS (From PDF 2) ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', leftMargin, yPos);

  yPos += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const terms = [
    'i) Blocking of media stands for 24 hrs, post which it becomes subject to availability. Blocking is considered \'confirmed\' only after a confirmation email.',
    'ii) Sites are subject to availability at the time written confirmation.',
    'iii) "Matrix" will not be responsible for flex Theft, Torn, Damage.',
    'iv) Govt. Taxes as applicable will be charge Extra',
    'v) PO has to be given within 7 days of the campaigns start date & PO Should be in favour of "Matrix Network Solutions"',
    'vi) Extension of ongoing campaign has to be informed to us by 10 days before campaign end date.',
    'vii) Payment should be made in advance.',
    'viii) Any dispute arising out of or in connection with this contract shall be settled at Telangana Jurisdiction.',
  ];

  terms.forEach((term) => {
    const lines = doc.splitTextToSize(term, pageWidth - leftMargin - rightMargin);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 3;
    });
  });

  yPos += 8;

  // ========== AUTHORIZED SIGNATORY (From PDF 2 - Right side) ==========
  const signX = pageWidth - rightMargin - 50;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signature', signX, yPos);

  yPos += 15;
  doc.setFont('helvetica', 'normal');
  doc.text(data.orgSettings?.owner_name || 'Raghu Gajula', signX, yPos);

  // Signature line
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(signX, yPos - 10, signX + 45, yPos - 10);

  // ========== HSN/SAC SUMMARY TABLE (From PDF 2) ==========
  yPos += 10;

  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + 30 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HSN/SAC Summary:', leftMargin, yPos);

  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['HSN/SAC', 'Taxable Amount', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Tax Amount']],
    body: [
      [hsnCode, formatINR(subtotal), '9%', formatINR(cgst), '9%', formatINR(sgst), formatINR(cgst + sgst)],
      ['Total', formatINR(subtotal), '', formatINR(cgst), '', formatINR(sgst), formatINR(cgst + sgst)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: 0,
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  return doc.output('blob');
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero Only';

  const crores = Math.floor(amount / 10000000);
  const lakhs = Math.floor((amount % 10000000) / 100000);
  const thousands = Math.floor((amount % 100000) / 1000);
  const hundreds = Math.floor((amount % 1000) / 100);
  const remainder = Math.floor(amount % 100);

  let words = '';

  if (crores > 0) {
    words += `${ones[crores]} Crore `;
  }
  if (lakhs > 0) {
    if (lakhs < 20 && lakhs > 9) {
      words += `${teens[lakhs - 10]} Lakh `;
    } else {
      words += `${tens[Math.floor(lakhs / 10)]} ${ones[lakhs % 10]} Lakh `;
    }
  }
  if (thousands > 0) {
    if (thousands < 20 && thousands > 9) {
      words += `${teens[thousands - 10]} Thousand `;
    } else {
      words += `${tens[Math.floor(thousands / 10)]} ${ones[thousands % 10]} Thousand `;
    }
  }
  if (hundreds > 0) {
    words += `${ones[hundreds]} Hundred `;
  }
  if (remainder > 0) {
    if (remainder < 10) {
      words += ones[remainder];
    } else if (remainder < 20) {
      words += teens[remainder - 10];
    } else {
      words += `${tens[Math.floor(remainder / 10)]} ${ones[remainder % 10]}`;
    }
  }

  return `Indian Rupee ${words.trim()} Only`;
}
