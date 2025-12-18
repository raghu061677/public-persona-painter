import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/utils/finance';
import { renderLogoHeader } from '@/lib/pdf/sections/logoHeader';
import { renderSellerFooterWithSignatory } from '@/lib/pdf/sections/authorizedSignatory';

interface InvoiceData {
  invoice: any;
  client: any;
  items: any[];
  orgSettings?: any;
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

  // Fetch company details (use invoice's company_id)
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

  // Company info for header
  const companyName = data.orgSettings?.name || 'Matrix Network Solutions';
  const companyGSTIN = data.orgSettings?.gstin || '36AATFM4107H2Z3';
  const companyPAN = data.orgSettings?.pan || 'AATFM4107H';

  // ========== LOGO HEADER SECTION ==========
  // Per spec: Logo LEFT, Company name + address + GSTIN RIGHT, Title CENTERED below
  let yPos = renderLogoHeader(
    doc,
    { name: companyName, gstin: companyGSTIN, pan: companyPAN },
    'TAX INVOICE'
  );

  yPos += 5;

  // ========== INVOICE DETAILS (RIGHT SIDE) ==========
  const rightX = pageWidth - 15;
  let rightY = yPos;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const invoiceDetails = [
    `Invoice No: ${data.invoice.id}`,
    `Invoice Date: ${new Date(data.invoice.invoice_date).toLocaleDateString('en-IN')}`,
    `Due Date: ${new Date(data.invoice.due_date).toLocaleDateString('en-IN')}`,
    `Place of Supply: Telangana (36)`,
    data.invoice.estimation_id ? `Reference: ${data.invoice.estimation_id}` : '',
  ].filter(Boolean);

  invoiceDetails.forEach((line) => {
    doc.text(line, rightX, rightY, { align: 'right' });
    rightY += 6;
  });

  yPos = rightY + 5;

  // ========== BILL TO SECTION ==========
  // Per spec: "To" section contains Client name, address, Client GSTIN only - NO seller GST
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPos, pageWidth - 30, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(15, yPos, pageWidth - 30, 35, 'S');

  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('To,', 20, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 6;

  // Client name
  doc.text(data.client.name || data.client.company || '', 20, yPos);
  yPos += 5;

  // Client address
  const clientAddress = data.client.billing_address_line1 || data.client.address || '';
  if (clientAddress) {
    doc.text(clientAddress, 20, yPos);
    yPos += 5;
  }
  
  // City, State
  const cityState = `${data.client.billing_city || data.client.city || ''}, ${data.client.billing_state || data.client.state || ''}`.trim();
  if (cityState && cityState !== ',') {
    doc.text(cityState, 20, yPos);
    yPos += 5;
  }

  // Client GSTIN only
  doc.text(`GSTIN: ${data.client.gst_number || 'N/A'}`, 20, yPos);
  yPos += 10;

  // ========== SUBJECT LINE ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Subject: Tax Invoice for Display Services – ${data.invoice.estimation_id || data.invoice.id}`,
    15,
    yPos
  );
  yPos += 10;

  // ========== ITEMS TABLE ==========
  const tableData = data.items.map((item: any, index: number) => {
    return [
      (index + 1).toString(),
      item.description || 'Media Display Service',
      (item.quantity || 1).toString(),
      formatINR(item.rate || 0),
      formatINR(item.amount || 0),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['S.No', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 0,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== TOTALS SUMMARY BOX ==========
  const summaryX = pageWidth - 90;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.rect(summaryX - 5, yPos - 5, 80, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const subtotal = data.invoice.sub_total || 0;
  const taxableAmount = subtotal;
  const cgst = data.invoice.gst_amount ? data.invoice.gst_amount / 2 : taxableAmount * 0.09;
  const sgst = data.invoice.gst_amount ? data.invoice.gst_amount / 2 : taxableAmount * 0.09;
  const grandTotal = data.invoice.total_amount || (taxableAmount + cgst + sgst);

  doc.text('Subtotal:', summaryX, yPos);
  doc.text(formatINR(subtotal), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Taxable Amount:', summaryX, yPos);
  doc.text(formatINR(taxableAmount), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('CGST @ 9%:', summaryX, yPos);
  doc.text(formatINR(cgst), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.text('SGST @ 9%:', summaryX, yPos);
  doc.text(formatINR(sgst), pageWidth - 20, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', summaryX, yPos);
  doc.text(formatINR(grandTotal), pageWidth - 20, yPos, { align: 'right' });

  yPos += 15;

  // ========== AMOUNT IN WORDS ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(grandTotal), 15, yPos);

  yPos += 15;

  // ========== BANK DETAILS ==========
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');

  const bankDetails = [
    'Bank Name: HDFC Bank',
    'Account Number: 50200010727301',
    'IFSC Code: HDFC0001555',
    'Branch: Karkhana Road',
  ];

  bankDetails.forEach((line) => {
    doc.text(line, 15, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ========== TERMS & CONDITIONS ==========
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const terms = [
    '1. Payment terms as per agreed schedule.',
    '2. Interest @ 18% per annum will be charged on delayed payments.',
    '3. All disputes subject to Hyderabad jurisdiction only.',
    '4. This is a computer-generated invoice.',
  ];

  terms.forEach((term) => {
    doc.text(term, 15, yPos);
    yPos += 5;
  });

  yPos += 15;

  // ========== FOOTER: AUTHORIZED SIGNATORY ONLY (RIGHT) ==========
  // Per spec: Footer = "For, Company Name, Authorized Signatory" - NO GSTIN/PAN
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + 40 > pageHeight - 20) {
    doc.addPage();
    yPos = 30;
  }

  renderSellerFooterWithSignatory(
    doc,
    { name: companyName },
    yPos
  );

  // ========== DOCUMENT FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(
    'This is a computer-generated document. No signature required.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    'Powered by Go-Ads 360° OOH Management System.',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return doc.output('blob');
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero Rupees Only';

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
