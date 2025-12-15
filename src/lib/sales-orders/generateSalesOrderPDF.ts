import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyForPDF, getPrimaryContactName } from '@/lib/pdf/pdfHelpers';

interface SalesOrderData {
  salesOrder: any;
  client: any;
  company: any;
  items: any[];
  contacts: any[];
  orgSettings?: any;
}

export async function generateSalesOrderPDF(salesOrderId: string): Promise<Blob> {
  // For now, fetch from plans table as sales orders reference plans
  // This can be updated when dedicated sales_orders table is created
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', salesOrderId)
    .single();

  if (planError || !plan) throw new Error('Sales Order not found');

  // Fetch company details (SELLER - for footer and header)
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', plan.company_id)
    .single();

  // Fetch client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', plan.client_id)
    .single();

  if (clientError || !client) throw new Error('Client not found');

  // Fetch client contacts for point of contact
  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', plan.client_id)
    .order('is_primary', { ascending: false });

  // Fetch plan items with asset details
  const { data: planItems, error: itemsError } = await supabase
    .from('plan_items')
    .select('*, media_assets(*)')
    .eq('plan_id', salesOrderId);

  if (itemsError) throw new Error('Failed to fetch sales order items');

  // Fetch organization settings
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('*')
    .single();

  const data: SalesOrderData = {
    salesOrder: plan,
    client,
    company: companyData,
    items: planItems || [],
    contacts: clientContacts || [],
    orgSettings,
  };

  return createSalesOrderPDF(data);
}

// Currency formatter for PDF (uses Rs. instead of ₹ symbol to avoid font issues)
const formatINR = (amount: number): string => formatCurrencyForPDF(amount);

function createSalesOrderPDF(data: SalesOrderData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // ========== HEADER SECTION ==========
  // Company Logo
  if (data.orgSettings?.logo_url) {
    try {
      doc.addImage(data.orgSettings.logo_url, 'PNG', 15, yPos, 40, 20);
    } catch (e) {
      console.log('Logo loading skipped');
    }
  }

  // Company/Seller Details (Left Side) - from companies table
  const companyName = data.company?.name || data.orgSettings?.company_name || 'Matrix Network Solutions';
  const companyGSTIN = data.company?.gstin || data.orgSettings?.gstin || '36AATFM4107H2Z3';
  const companyPAN = data.company?.pan || data.orgSettings?.pan || 'AATFM4107H';
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 15, yPos + 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const companyDetails = [
    data.company?.address || 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
    'Near Begumpet Metro Station, Opp Country Club,',
    `${data.company?.city || 'Begumpet, Hyderabad'} – ${data.company?.pincode || '500016'}`,
    `GSTIN: ${companyGSTIN}  |  PAN: ${companyPAN}`,
    `Phone: ${data.company?.phone || '+91-4042625757'}`,
    `Email: ${data.company?.email || 'raghu@matrix-networksolutions.com'}`,
    `Website: ${data.company?.website || 'www.matrixnetworksolutions.com'}`,
  ];

  yPos += 35;
  companyDetails.forEach((line) => {
    doc.text(line, 15, yPos);
    yPos += 5;
  });

  // SALES ORDER Title and Details (Right Side)
  const rightX = pageWidth - 15;
  yPos = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text('SALES ORDER', rightX, yPos, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  const salesOrderDetails = [
    `Sales Order No: SO-${data.salesOrder.id}`,
    `Sales Order Date: ${new Date().toLocaleDateString('en-IN')}`,
    `Place of Supply: Telangana (36)`,
    `Reference: ${data.salesOrder.plan_name || data.salesOrder.id}`,
  ];

  salesOrderDetails.forEach((line) => {
    doc.text(line, rightX, yPos, { align: 'right' });
    yPos += 6;
  });

  yPos = Math.max(yPos, 75);

  // ========== BILL TO / SHIP TO SECTION ==========
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPos, (pageWidth - 30) / 2 - 2, 45, 'F');
  doc.rect((pageWidth - 30) / 2 + 17, yPos, (pageWidth - 30) / 2 - 2, 45, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(15, yPos, (pageWidth - 30) / 2 - 2, 45, 'S');
  doc.rect((pageWidth - 30) / 2 + 17, yPos, (pageWidth - 30) / 2 - 2, 45, 'S');

  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, yPos);
  doc.text('SHIP TO:', (pageWidth - 30) / 2 + 22, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 6;

  const billToLines = [
    data.client.name || data.client.company,
    data.client.billing_address_line1 || data.client.address,
    data.client.billing_address_line2,
    `${data.client.billing_city || data.client.city}, ${data.client.billing_state || data.client.state}`,
    `GSTIN: ${data.client.gst_number || 'N/A'}`,
    `Phone: ${data.client.phone || 'N/A'}`,
    `Email: ${data.client.email || 'N/A'}`,
  ].filter(Boolean);

  const shipToLines = [
    data.client.name || data.client.company,
    data.client.shipping_address_line1 || data.client.billing_address_line1 || data.client.address,
    data.client.shipping_address_line2 || data.client.billing_address_line2,
    `${data.client.shipping_city || data.client.billing_city || data.client.city}, ${data.client.shipping_state || data.client.billing_state || data.client.state}`,
  ].filter(Boolean);

  let tempYPos = yPos;
  billToLines.forEach((line) => {
    if (line) {
      doc.text(line, 20, tempYPos);
      tempYPos += 5;
    }
  });

  tempYPos = yPos;
  shipToLines.forEach((line) => {
    if (line) {
      doc.text(line, (pageWidth - 30) / 2 + 22, tempYPos);
      tempYPos += 5;
    }
  });

  yPos += 50;

  // ========== SUBJECT LINE ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Subject: Sales Order for Outdoor Media Display – ${data.salesOrder.plan_name || data.salesOrder.id}`,
    15,
    yPos
  );
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (data.salesOrder.start_date && data.salesOrder.end_date) {
    doc.text(
      `Duration: ${new Date(data.salesOrder.start_date).toLocaleDateString('en-IN')} to ${new Date(data.salesOrder.end_date).toLocaleDateString('en-IN')}`,
      15,
      yPos
    );
  }
  yPos += 10;

  // ========== ITEMS TABLE ==========
  const tableData = data.items.map((item: any, index: number) => {
    const asset = item.media_assets;
    const lineTotal =
      (item.negotiated_rate || item.rate || asset?.card_rate || 0) -
      (item.discount_amount || 0) +
      (item.printing_charge || 0) +
      (item.mounting_charge || 0);

    return [
      (index + 1).toString(),
      asset?.id || item.asset_id,
      `${asset?.media_type || ''} - ${asset?.area || ''}`,
      asset?.area || '',
      asset?.location || '',
      asset?.direction || '',
      `${asset?.dimensions || 'N/A'}`,
      asset?.total_sqft?.toString() || 'N/A',
      asset?.illumination_type || 'Non-Lit',
      formatINR(asset?.card_rate || 0),
      formatINR(item.negotiated_rate || item.rate || 0),
      formatINR(item.discount_amount || 0),
      formatINR(item.printing_charge || 0),
      formatINR(item.mounting_charge || 0),
      formatINR(lineTotal),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        'S.No',
        'Asset ID',
        'Display Name',
        'Area',
        'Location',
        'Direction',
        'Dimensions',
        'Sqft',
        'Illumination',
        'Rate',
        'Negotiated',
        'Discount',
        'Printing',
        'Mounting',
        'Line Total',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: 0,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { cellWidth: 15 },
      6: { cellWidth: 18 },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 15 },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 18, halign: 'right' },
      12: { cellWidth: 18, halign: 'right' },
      13: { cellWidth: 18, halign: 'right' },
      14: { cellWidth: 20, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== TOTALS SUMMARY BOX ==========
  const summaryX = pageWidth - 90;

  // Draw box around summary
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.rect(summaryX - 5, yPos - 5, 80, 65);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const subtotal = data.salesOrder.total_amount || 0;
  const totalPrinting = data.salesOrder.total_printing || 0;
  const totalMounting = data.salesOrder.total_mounting || 0;
  const totalDiscount = data.salesOrder.total_discount || 0;
  const taxableAmount = data.salesOrder.total_before_gst || subtotal;
  const cgst = data.salesOrder.cgst || (taxableAmount * 0.09);
  const sgst = data.salesOrder.sgst || (taxableAmount * 0.09);
  const grandTotal = data.salesOrder.grand_total || (taxableAmount + cgst + sgst);

  doc.text('Subtotal:', summaryX, yPos);
  doc.text(formatINR(subtotal), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.text('Printing Charges:', summaryX, yPos);
  doc.text(formatINR(totalPrinting), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.text('Mounting Charges:', summaryX, yPos);
  doc.text(formatINR(totalMounting), pageWidth - 20, yPos, { align: 'right' });

  yPos += 6;
  doc.text('Discount:', summaryX, yPos);
  doc.text(`-${formatINR(totalDiscount)}`, pageWidth - 20, yPos, { align: 'right' });

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
    '1. Work Order must be approved before campaign execution.',
    '2. Sites are subject to availability and existing client renewals.',
    '3. Artwork must be submitted in advance for printing.',
    '4. Any damage to flex/vinyl must be replaced by client at their cost.',
    '5. GST extra as applicable.',
    '6. Payment terms as per agreed schedule.',
  ];

  terms.forEach((term) => {
    doc.text(term, 15, yPos);
    yPos += 5;
  });

  yPos += 15;

  // ========== SIGNATURE BLOCK (SELLER ONLY) ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`For ${companyName}`, 15, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.text(`GSTIN: ${companyGSTIN}`, 15, yPos);
  yPos += 12;
  doc.text('_______________________', 15, yPos);
  yPos += 6;
  doc.text('Authorized Signatory', 15, yPos);

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(
    'This is a computer-generated Sales Order. No signature required.',
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
