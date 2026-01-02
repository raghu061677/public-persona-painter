import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceData {
  invoice: any;
  client: any;
  campaign: any;
  items: any[];
  company: any;
  orgSettings?: any;
  logoBase64?: string;
}

// PDF-safe currency formatter (avoids Unicode issues with jsPDF)
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'Rs. 0';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
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

  // Enrich invoice items with asset dimensions from media_assets
  let enrichedItems = Array.isArray(invoice.items) ? [...invoice.items] : [];
  if (enrichedItems.length > 0) {
    const assetIds = enrichedItems.map((item: any) => item.asset_id).filter(Boolean);
    if (assetIds.length > 0) {
      const { data: assetsData } = await supabase
        .from('media_assets')
        .select('id, dimensions, total_sqft')
        .in('id', assetIds);
      
      if (assetsData) {
        const assetMap = new Map(assetsData.map(a => [a.id, a]));
        enrichedItems = enrichedItems.map((item: any) => {
          const asset = assetMap.get(item.asset_id);
          if (asset) {
            return {
              ...item,
              dimensions: item.dimensions || asset.dimensions,
              total_sqft: item.total_sqft || asset.total_sqft,
            };
          }
          return item;
        });
      }
    }
  }

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
    items: enrichedItems,
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
  
  let yPos = 15;

  // ========== HEADER SECTION ==========
  const logoWidth = 45;
  const logoHeight = 35;
  let logoEndX = leftMargin;

  // Try to add logo - larger size to match company address height
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, 'PNG', leftMargin, yPos, logoWidth, logoHeight);
      logoEndX = leftMargin + logoWidth + 8;
    } catch (e) {
      console.log('Logo rendering error:', e);
    }
  }

  // Company Name - Bold, Black (matching reference)
  let textY = yPos + 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyName, logoEndX, textY);

  // Company Name repeated in normal (as shown in reference)
  textY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(companyName, logoEndX, textY);

  // Company Address lines
  textY += 4.5;
  doc.text(COMPANY_ADDRESS.line1, logoEndX, textY);
  textY += 4;
  doc.text(COMPANY_ADDRESS.line2, logoEndX, textY);
  textY += 4;
  doc.text(`${COMPANY_ADDRESS.cityLine} ${COMPANY_ADDRESS.country}`, logoEndX, textY);

  // Contact info
  textY += 4.5;
  doc.text(`Phone : ${COMPANY_ADDRESS.phone}`, logoEndX, textY);
  textY += 4;
  doc.text(COMPANY_ADDRESS.email, logoEndX, textY);
  textY += 4;
  doc.text(COMPANY_ADDRESS.website, logoEndX, textY);

  // GSTIN
  textY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`GSTIN : ${companyGSTIN}`, logoEndX, textY);

  yPos = yPos + logoHeight + 3;

  // Document title - Right side, bottom of header, above the line
  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const docTitle = invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(docTitle, pageWidth - rightMargin, yPos, { align: 'right' });

  yPos += 5;

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

  // Calculate terms label based on terms_mode
  const termsMode = data.invoice.terms_mode || 'DUE_ON_RECEIPT';
  const termsDays = data.invoice.terms_days || 0;
  const termsLabel = termsMode === 'DUE_ON_RECEIPT' ? 'Due on Receipt' :
    termsMode === 'NET_30' ? '30 Net Days' :
    termsMode === 'NET_45' ? '45 Net Days' :
    termsMode === 'CUSTOM' ? `${termsDays} Net Days` : 'Due on Receipt';

  const invoiceType = data.invoice.invoice_type || 'TAX_INVOICE';
  const invoiceNoLabel = invoiceType === 'PROFORMA' ? 'Proforma #:' : 'Invoice No:';

  const invoiceDetails = [
    { label: invoiceNoLabel, value: data.invoice.invoice_no || data.invoice.id, bold: true },
    { label: 'Invoice Date:', value: formatDate(data.invoice.invoice_date) },
    { label: 'Due Date:', value: formatDate(data.invoice.due_date) },
    { label: 'Place of Supply:', value: data.invoice.place_of_supply || 'Telangana (36)' },
    { label: 'Payment Terms:', value: termsLabel },
    { label: 'Sales Person:', value: data.invoice.sales_person || data.company?.owner_name || data.orgSettings?.primary_contact || 'Raghunath Gajula' },
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
    
    // Build campaign header with dotted line: "Campaign: Name .......... Campaign Duration: (dates)"
    const campaignLabel = `Campaign: ${data.campaign.campaign_name}`;
    let campaignDuration = '';
    
    if (data.campaign.start_date && data.campaign.end_date) {
      campaignDuration = `Campaign Duration: (${formatDate(data.campaign.start_date)} to ${formatDate(data.campaign.end_date)})`;
    }
    
    // Calculate widths for dotted fill
    const labelWidth = doc.getTextWidth(campaignLabel);
    const durationWidth = doc.getTextWidth(campaignDuration);
    const availableWidth = contentWidth - labelWidth - durationWidth - 10;
    const dotsCount = Math.max(3, Math.floor(availableWidth / 2));
    const dots = '.'.repeat(dotsCount);
    
    // Draw campaign name
    doc.text(campaignLabel, leftMargin, yPos);
    
    // Draw dots
    doc.setFont('helvetica', 'normal');
    doc.text(dots, leftMargin + labelWidth + 3, yPos);
    
    // Draw duration at right
    doc.setFont('helvetica', 'bold');
    doc.text(campaignDuration, pageWidth - rightMargin, yPos, { align: 'right' });
    
    yPos += 8;
  }

  // ========== ITEMS TABLE ==========
  // Prepare table data with detailed format matching reference
  const tableData = data.items.map((item: any, index: number) => {
    // Build detailed location description with Zone, Media, Route, Lit
    const assetId = item.asset_id || item.id || '';
    const locationName = item.location || item.description || 'Media Display';
    const zone = item.area || item.zone || '';
    const mediaType = item.media_type || 'Bus Shelter';
    const direction = item.direction || item.route || '';
    const illumination = item.illumination_type || item.lit || 'NonLit';
    
    // Format multi-line description
    const descriptionLines = [
      `[${assetId}] ${locationName}`,
      zone ? `Zone:${zone}` : '',
      `Media:${mediaType}`,
      direction ? `Route:${direction}` : '',
      `Lit:${illumination}`
    ].filter(Boolean).join('\n');
    
    // Size with dimensions and area
    const dimensions = item.dimensions || item.size || 'N/A';
    const totalSqft = item.total_sqft || item.area_sqft || item.sqft || '';
    const sizeDisplay = dimensions && dimensions !== 'N/A'
      ? `${dimensions}${totalSqft ? `\nArea(Sft):${totalSqft}` : ''}`
      : 'N/A';
    
    // Booking dates with month calculation
    const startDate = item.start_date || data.campaign?.start_date;
    const endDate = item.end_date || data.campaign?.end_date;
    let bookingDisplay = '-';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      bookingDisplay = `From:${formatDate(startDate)}\nTo:${formatDate(endDate)}\nMonth:${months}`;
    }
    
    // Pricing
    const unitPrice = item.rate || item.unit_price || item.display_rate || item.negotiated_rate || item.card_rate || 0;
    const printingCost = item.printing_cost || item.printing_charge || 0;
    const mountingCost = item.mounting_cost || item.mounting_charge || item.installation_cost || 0;
    
    // Calculate subtotal (unit price + printing + mounting)
    const subtotal = unitPrice + printingCost + mountingCost;
    const amount = item.amount || item.final_price || subtotal;

    return [
      (index + 1).toString(),
      descriptionLines,
      sizeDisplay,
      bookingDisplay,
      formatCurrency(unitPrice),
      formatCurrency(amount),
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
      fontSize: 8,
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      valign: 'top',
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'top' },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 30, halign: 'center', fontSize: 7 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: leftMargin, right: rightMargin },
    tableWidth: 'auto',
    didParseCell: function(data) {
      // Add line height for multi-line cells
      if (data.section === 'body') {
        const text = data.cell.text.join('\n');
        const lines = text.split('\n').length;
        if (lines > 1) {
          data.cell.styles.cellPadding = { top: 3, right: 3, bottom: 3, left: 3 };
        }
      }
    },
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

  // ========== TOTALS SECTION - Right aligned plain text ==========
  const totalsX = pageWidth - rightMargin - 80;
  const amountsX = pageWidth - rightMargin;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  // Sub Total row
  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total', totalsX, yPos, { align: 'left' });
  doc.text(formatCurrency(subtotal), amountsX, yPos, { align: 'right' });

  // CGST9 (9%) row
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CGST9 (9%)', totalsX, yPos, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(cgst), amountsX, yPos, { align: 'right' });

  // SGST9 (9%) row
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('SGST9 (9%)', totalsX, yPos, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(sgst), amountsX, yPos, { align: 'right' });

  // Total row
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', totalsX, yPos, { align: 'left' });
  doc.text('Rs.' + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), amountsX, yPos, { align: 'right' });

  // Balance Due row
  yPos += 6;
  const balanceDue = parseFloat(data.invoice.balance_due) || grandTotal;
  doc.text('Balance Due', totalsX, yPos, { align: 'left' });
  doc.text('Rs.' + balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), amountsX, yPos, { align: 'right' });

  yPos += 15;

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
      [hsnCode, formatCurrency(subtotal), '9%', formatCurrency(cgst), '9%', formatCurrency(sgst), formatCurrency(cgst + sgst)],
    ],
    foot: [['Total', formatCurrency(subtotal), '', formatCurrency(cgst), '', formatCurrency(sgst), formatCurrency(cgst + sgst)]],
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
