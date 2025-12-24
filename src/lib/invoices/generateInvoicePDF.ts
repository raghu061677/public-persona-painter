import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/utils/finance';

interface InvoiceData {
  invoice: any;
  client: any;
  campaign: any;
  items: any[];
  company: any;
  orgSettings?: any;
  logoBase64?: string;
}

// Default company address
const COMPANY_ADDRESS = {
  line1: 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
  line2: 'Near Begumpet Metro Station, Opp Country Club, Begumpet,',
  cityLine: 'Hyderabad, Telangana 500016',
  country: 'India',
  phone: '+91-9666444888',
  email: 'raghu@matrix-networksolutions.com',
  website: 'www.matrixnetworksolutions.com',
};

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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

  // Fetch campaign details if available
  let campaign = null;
  if (invoice.campaign_id) {
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', invoice.campaign_id)
      .single();
    campaign = campaignData;
  }

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

  // Load logo
  let logoBase64: string | null = null;
  const logoUrl = companyData?.logo_url || orgSettings?.logo_url;
  if (logoUrl && !logoUrl.startsWith('data:')) {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } else if (logoUrl?.startsWith('data:')) {
    logoBase64 = logoUrl;
  }

  const data: InvoiceData = {
    invoice,
    client,
    campaign,
    items: Array.isArray(invoice.items) ? invoice.items : [],
    company: companyData,
    orgSettings: orgSettings,
    logoBase64: logoBase64 || undefined,
  };

  return createInvoicePDF(data);
}

function createInvoicePDF(data: InvoiceData): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Company info
  const companyName = data.company?.name || data.orgSettings?.organization_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  
  let yPos = 18;

  // ========== HEADER SECTION ==========
  let logoEndX = leftMargin;

  // Try to add logo
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos - 6, 22, 16);
      logoEndX = leftMargin + 25;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name - Bold, Blue
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Deep blue
  doc.text(companyName, logoEndX, yPos);

  // Company Address lines
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // Gray
  doc.text(COMPANY_ADDRESS.line1, logoEndX, yPos);
  yPos += 3.5;
  doc.text(COMPANY_ADDRESS.line2, logoEndX, yPos);
  yPos += 3.5;
  doc.text(`${COMPANY_ADDRESS.cityLine}, ${COMPANY_ADDRESS.country}`, logoEndX, yPos);

  // Contact info
  yPos += 4;
  doc.setFontSize(7.5);
  doc.text(`Phone: ${COMPANY_ADDRESS.phone}  |  Email: ${COMPANY_ADDRESS.email}`, logoEndX, yPos);
  yPos += 3.5;
  doc.text(`Web: ${COMPANY_ADDRESS.website}`, logoEndX, yPos);

  // GSTIN below company info
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`GSTIN: ${companyGSTIN}`, logoEndX, yPos);

  // TAX INVOICE title - Right side, aligned with header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('TAX INVOICE', pageWidth - rightMargin, 22, { align: 'right' });

  yPos = Math.max(yPos + 6, 48);

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

  yPos += 8;

  // ========== TWO COLUMN LAYOUT: Bill To + Invoice Details ==========
  const colMidX = pageWidth / 2;
  const leftColWidth = colMidX - leftMargin - 5;
  const rightColWidth = pageWidth - rightMargin - colMidX - 3;

  // Bill To Section Header
  doc.setFillColor(245, 247, 250);
  doc.rect(leftMargin, yPos, leftColWidth, 7, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftMargin, yPos, leftColWidth, 7, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To', leftMargin + 4, yPos + 5);

  // Invoice Details Section Header
  doc.setFillColor(245, 247, 250);
  doc.rect(colMidX + 3, yPos, rightColWidth, 7, 'F');
  doc.rect(colMidX + 3, yPos, rightColWidth, 7, 'S');
  doc.text('Invoice Details', colMidX + 7, yPos + 5);

  yPos += 7;
  const contentBoxY = yPos;
  const boxHeight = 42;

  // Bill To Content Box
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftMargin, contentBoxY, leftColWidth, boxHeight, 'S');

  // Invoice Details Content Box
  doc.rect(colMidX + 3, contentBoxY, rightColWidth, boxHeight, 'S');

  // Bill To Content
  let billY = contentBoxY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.client.name || data.client.company || 'Client', leftMargin + 4, billY);
  billY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  
  // Address
  const clientAddress = data.client.billing_address_line1 || data.client.address || '';
  if (clientAddress) {
    const addressLines = doc.splitTextToSize(clientAddress, leftColWidth - 10);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, leftMargin + 4, billY);
      billY += 4;
    });
  }

  // City, State, Pincode
  const cityStatePin = [
    data.client.billing_city || data.client.city,
    data.client.billing_state || data.client.state,
    data.client.billing_pincode || data.client.pincode
  ].filter(Boolean).join(', ');
  
  if (cityStatePin) {
    doc.text(cityStatePin, leftMargin + 4, billY);
    billY += 4;
  }

  doc.text('India', leftMargin + 4, billY);
  billY += 5;

  // Client GSTIN - Important!
  if (data.client.gst_number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`GSTIN: ${data.client.gst_number}`, leftMargin + 4, billY);
  }

  // Invoice Details Content
  let detailY = contentBoxY + 6;
  doc.setFontSize(8);

  const invoiceDetails = [
    { label: 'Invoice No:', value: data.invoice.id, bold: true },
    { label: 'Invoice Date:', value: formatDate(data.invoice.invoice_date) },
    { label: 'Due Date:', value: formatDate(data.invoice.due_date) },
    { label: 'Place of Supply:', value: 'Telangana (36)' },
    { label: 'Terms:', value: 'Due on Receipt' },
    { label: 'Sales Person:', value: data.company?.owner_name || data.orgSettings?.primary_contact || 'Raghunath Gajula' },
  ];

  invoiceDetails.forEach(({ label, value, bold }) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(label, colMidX + 7, detailY);
    
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value || '-', colMidX + 35, detailY);
    detailY += 5.5;
  });

  yPos = contentBoxY + boxHeight + 8;

  // ========== CAMPAIGN DISPLAY NAME ==========
  if (data.campaign?.campaign_name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Campaign: ${data.campaign.campaign_name}`, leftMargin, yPos);
    
    // Campaign dates
    if (data.campaign.start_date && data.campaign.end_date) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const campaignPeriod = `(${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)})`;
      doc.text(campaignPeriod, pageWidth - rightMargin, yPos, { align: 'right' });
    }
    yPos += 8;
  }

  // ========== ITEMS TABLE ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Items', leftMargin, yPos);
  yPos += 4;

  // Prepare table data with all required columns
  const tableData = data.items.map((item: any, index: number) => {
    const description = item.description || item.location || 'Media Display Service';
    const dimensions = item.dimensions || item.size || '-';
    
    // Booking dates from item or campaign
    const startDate = item.start_date || data.campaign?.start_date;
    const endDate = item.end_date || data.campaign?.end_date;
    const bookingPeriod = startDate && endDate 
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : item.booking_period || '-';
    
    const unitPrice = item.rate || item.unit_price || item.display_rate || 0;
    const printingCost = item.printing_cost || item.printing_charge || 0;
    const mountingCost = item.mounting_cost || item.mounting_charge || item.installation_cost || 0;
    const amount = item.amount || item.final_price || unitPrice;

    return [
      (index + 1).toString(),
      description,
      dimensions,
      bookingPeriod,
      formatINR(unitPrice),
      formatINR(printingCost),
      formatINR(mountingCost),
      formatINR(amount),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item & Description', 'Size', 'Booking Period', 'Unit Price', 'Printing', 'Mounting', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      valign: 'middle',
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'center', fontSize: 6.5 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableWidth: 'auto',
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== TOTALS SECTION ==========
  const subtotal = parseFloat(data.invoice.sub_total) || 0;
  const cgst = data.invoice.gst_amount ? parseFloat(data.invoice.gst_amount) / 2 : subtotal * 0.09;
  const sgst = data.invoice.gst_amount ? parseFloat(data.invoice.gst_amount) / 2 : subtotal * 0.09;
  const grandTotal = parseFloat(data.invoice.total_amount) || (subtotal + cgst + sgst);

  // Amount in words on left
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total In Words:', leftMargin, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const amountInWords = numberToWords(Math.round(grandTotal));
  const wordsLines = doc.splitTextToSize(`Indian Rupees ${amountInWords} Only`, 90);
  wordsLines.forEach((line: string, i: number) => {
    doc.text(line, leftMargin, yPos + 5 + (i * 4));
  });

  // Totals box on right
  const totalsBoxX = pageWidth - rightMargin - 70;
  const totalsBoxWidth = 70;
  
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 251, 252);
  doc.rect(totalsBoxX, yPos - 3, totalsBoxWidth, 38, 'FD');

  let totalY = yPos + 3;
  doc.setFontSize(8);
  
  // Sub Total
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total:', totalsBoxX + 4, totalY);
  doc.text(formatINR(subtotal), totalsBoxX + totalsBoxWidth - 4, totalY, { align: 'right' });

  // CGST
  totalY += 7;
  doc.text('CGST @ 9%:', totalsBoxX + 4, totalY);
  doc.text(formatINR(cgst), totalsBoxX + totalsBoxWidth - 4, totalY, { align: 'right' });

  // SGST
  totalY += 7;
  doc.text('SGST @ 9%:', totalsBoxX + 4, totalY);
  doc.text(formatINR(sgst), totalsBoxX + totalsBoxWidth - 4, totalY, { align: 'right' });

  // Total line
  totalY += 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsBoxX + 3, totalY, totalsBoxX + totalsBoxWidth - 3, totalY);

  // Grand Total
  totalY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total:', totalsBoxX + 4, totalY);
  doc.text(formatINR(grandTotal), totalsBoxX + totalsBoxWidth - 4, totalY, { align: 'right' });

  // Balance Due
  totalY += 7;
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Due:', totalsBoxX + 4, totalY);
  doc.text(formatINR(grandTotal), totalsBoxX + totalsBoxWidth - 4, totalY, { align: 'right' });

  yPos = totalY + 15;

  // Check if we need a new page
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  // ========== BANK DETAILS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details', leftMargin, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const bankDetails = [
    { label: 'Bank Name:', value: 'HDFC Bank Limited' },
    { label: 'Branch:', value: 'Karkhana Road, Secunderabad 500009' },
    { label: 'Account No:', value: '50200010727301' },
    { label: 'IFSC Code:', value: 'HDFC0001555' },
    { label: 'MICR:', value: '500240026' },
  ];

  bankDetails.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, leftMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, leftMargin + 25, yPos);
    yPos += 4;
  });

  yPos += 6;

  // ========== TERMS & CONDITIONS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', leftMargin, yPos);

  yPos += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const terms = [
    'i) Blocking of media stands for 24 hrs, post which it becomes subject to availability.',
    'ii) Sites are subject to availability at the time of written confirmation.',
    'iii) "Matrix" will not be responsible for flex Theft, Torn, Damage.',
    'iv) Govt. Taxes as applicable will be charged Extra.',
    'v) PO has to be given within 7 days of the campaign start date.',
    'vi) Extension of ongoing campaign has to be informed 10 days before campaign end date.',
    'vii) Payment should be made in advance.',
    'viii) Any dispute shall be settled at Telangana Jurisdiction.',
  ];

  terms.forEach((term) => {
    const lines = doc.splitTextToSize(term, contentWidth);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 3.2;
    });
  });

  yPos += 10;

  // ========== AUTHORIZED SIGNATORY (Right aligned) ==========
  const signX = pageWidth - rightMargin - 50;

  // Check page break
  if (yPos > pageHeight - 35) {
    doc.addPage();
    yPos = 30;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('For Matrix Network Solutions', signX, yPos);

  yPos += 18;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(signX, yPos, signX + 48, yPos);

  yPos += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', signX, yPos);

  // ========== HSN/SAC SUMMARY ==========
  yPos += 12;

  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('HSN/SAC Summary', leftMargin, yPos);

  yPos += 4;

  const hsnCode = data.invoice.hsn_code || '998361';

  autoTable(doc, {
    startY: yPos,
    head: [['HSN/SAC', 'Taxable Amount', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Tax']],
    body: [
      [hsnCode, formatINR(subtotal), '9%', formatINR(cgst), '9%', formatINR(sgst), formatINR(cgst + sgst)],
    ],
    foot: [['Total', formatINR(subtotal), '', formatINR(cgst), '', formatINR(sgst), formatINR(cgst + sgst)]],
    theme: 'grid',
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [50, 50, 50],
      halign: 'center',
    },
    footStyles: {
      fillColor: [245, 247, 250],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  return doc.output('blob');
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero';
  if (amount < 0) return 'Negative ' + numberToWords(Math.abs(amount));
  if (amount >= 10000000) {
    const crores = Math.floor(amount / 10000000);
    const remainder = amount % 10000000;
    return numberToWords(crores) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 100000) {
    const lakhs = Math.floor(amount / 100000);
    const remainder = amount % 100000;
    return numberToWords(lakhs) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    return numberToWords(thousands) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 100) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    return ones[hundreds] + ' Hundred' + (remainder > 0 ? ' and ' + numberToWords(remainder) : '');
  }
  if (amount >= 20) {
    const ten = Math.floor(amount / 10);
    const one = amount % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  return ones[amount];
}
