import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProformaInvoiceItem {
  asset_id: string;
  display_name: string;
  area: string;
  location: string;
  direction: string;
  dimension_width: number;
  dimension_height: number;
  total_sqft: number;
  illumination_type: string;
  negotiated_rate: number;
  discount: number;
  printing_charge: number;
  mounting_charge: number;
  line_total: number;
}

interface ProformaInvoiceData {
  proforma_number: string;
  proforma_date: string;
  reference_plan_id?: string;
  reference_sales_order_id?: string;
  client_name: string;
  client_gstin?: string;
  client_address?: string;
  client_state?: string;
  client_email?: string;
  client_phone?: string;
  plan_name?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  subtotal: number;
  printing_total: number;
  mounting_total: number;
  discount_total: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  grand_total: number;
  additional_notes?: string;
  terms_conditions?: string;
  items: ProformaInvoiceItem[];
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const convertToIndianWords = (n: number): string => {
    if (n === 0) return 'Zero';

    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remainder = n % 1000;

    let words = '';
    if (crore > 0) words += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) words += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) words += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder > 0) words += convertLessThanThousand(remainder);

    return words.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = 'Indian Rupee ' + convertToIndianWords(rupees);
  if (paise > 0) result += ' and ' + convertToIndianWords(paise) + ' Paise';
  result += ' Only';

  return result;
};

export const generateProformaPDF = (data: ProformaInvoiceData): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 20;

  // Colors - Zoho Books style
  const primaryBlue = '#1E3A8A';
  const lightGrey = '#F5F5F5';
  const darkGrey = '#4B5563';
  const borderGrey = '#E5E7EB';

  // Company Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.text('Matrix Network Solutions', 14, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text('H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,', 14, yPos);
  yPos += 4;
  doc.text('Near Begumpet Metro Station, Opp Country Club,', 14, yPos);
  yPos += 4;
  doc.text('Begumpet, Hyderabad – 500016', 14, yPos);
  yPos += 5;
  doc.text('GSTIN: 36AATFM4107H2Z3 | PAN: AATFM4107H', 14, yPos);
  yPos += 4;
  doc.text('Phone: +91-4042625757', 14, yPos);
  yPos += 4;
  doc.text('Email: raghu@matrix-networksolutions.com', 14, yPos);
  yPos += 4;
  doc.text('Website: www.matrixnetworksolutions.com', 14, yPos);

  // PROFORMA INVOICE Title - Right Side
  const titleX = pageWidth - 14;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.text('PROFORMA INVOICE', titleX, 20, { align: 'right' });

  // Invoice Details - Right Side
  yPos = 28;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`Proforma No: ${data.proforma_number}`, titleX, yPos, { align: 'right' });
  yPos += 4;
  doc.text(`Date: ${new Date(data.proforma_date).toLocaleDateString('en-IN')}`, titleX, yPos, { align: 'right' });
  yPos += 4;
  doc.text(`Place of Supply: ${data.client_state || 'Telangana'}`, titleX, yPos, { align: 'right' });
  yPos += 4;
  if (data.reference_plan_id) {
    doc.text(`Reference: ${data.reference_plan_id}`, titleX, yPos, { align: 'right' });
  }

  // Client Details Block
  yPos = 60;
  
  // Background box for client details
  doc.setFillColor(lightGrey);
  doc.rect(14, yPos, pageWidth - 28, 35, 'F');
  doc.setDrawColor(borderGrey);
  doc.rect(14, yPos, pageWidth - 28, 35, 'S');

  yPos += 5;
  const leftColX = 18;
  const rightColX = pageWidth / 2 + 5;

  // BILL TO
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryBlue);
  doc.text('BILL TO:', leftColX, yPos);
  doc.text('SHIP TO:', rightColX, yPos);

  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(data.client_name, leftColX, yPos);
  doc.text(data.client_name, rightColX, yPos);

  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  
  if (data.client_address) {
    const addressLines = doc.splitTextToSize(data.client_address, 80);
    doc.text(addressLines, leftColX, yPos);
    doc.text(addressLines, rightColX, yPos);
    yPos += addressLines.length * 4;
  }

  if (data.client_gstin) {
    doc.text(`GSTIN: ${data.client_gstin}`, leftColX, yPos);
    doc.text(`GSTIN: ${data.client_gstin}`, rightColX, yPos);
    yPos += 4;
  }

  if (data.client_state) {
    doc.text(`State: ${data.client_state}`, leftColX, yPos);
    doc.text(`State: ${data.client_state}`, rightColX, yPos);
    yPos += 4;
  }

  if (data.client_phone) {
    doc.text(`Phone: ${data.client_phone}`, leftColX, yPos);
    yPos += 4;
  }

  if (data.client_email) {
    doc.text(`Email: ${data.client_email}`, leftColX, yPos);
  }

  // Subject
  yPos = 100;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(`Subject: Proforma Invoice for Outdoor Media Display – ${data.plan_name || 'Campaign'}`, 14, yPos);

  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  if (data.campaign_start_date && data.campaign_end_date) {
    doc.text(
      `Campaign Period: ${new Date(data.campaign_start_date).toLocaleDateString('en-IN')} to ${new Date(data.campaign_end_date).toLocaleDateString('en-IN')}`,
      14,
      yPos
    );
  }

  // Items Table
  yPos += 8;

  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.asset_id,
    item.display_name,
    item.area || '-',
    item.location || '-',
    item.direction || '-',
    `${item.dimension_width} × ${item.dimension_height}`,
    item.total_sqft?.toFixed(2) || '-',
    item.illumination_type || '-',
    `₹${item.negotiated_rate.toLocaleString('en-IN')}`,
    item.discount > 0 ? `₹${item.discount.toLocaleString('en-IN')}` : '-',
    item.printing_charge > 0 ? `₹${item.printing_charge.toLocaleString('en-IN')}` : '-',
    item.mounting_charge > 0 ? `₹${item.mounting_charge.toLocaleString('en-IN')}` : '-',
    `₹${item.line_total.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Asset ID', 'Display Name', 'Area', 'Location', 'Dir.', 'Dim.(ft)', 'Sqft', 'Type', 'Rate', 'Disc.', 'Print', 'Mount', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryBlue,
      textColor: '#FFFFFF',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { halign: 'center', cellWidth: 10 },
      6: { halign: 'center', cellWidth: 15 },
      7: { halign: 'right', cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { halign: 'right', cellWidth: 18 },
      10: { halign: 'right', cellWidth: 15 },
      11: { halign: 'right', cellWidth: 15 },
      12: { halign: 'right', cellWidth: 15 },
      13: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: '#F9FAFB'
    },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Totals Summary Box (Right Side)
  const summaryX = pageWidth - 14 - 70;
  const summaryY = yPos;
  const summaryWidth = 70;

  const summaryData = [
    ['Subtotal', `₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Printing Charges', `₹${data.printing_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Mounting Charges', `₹${data.mounting_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Discount', `(-₹${data.discount_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`],
    ['Taxable Amount', `₹${data.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['CGST @ 9%', `₹${data.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['SGST @ 9%', `₹${data.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: summaryY,
    body: summaryData,
    theme: 'plain',
    tableWidth: summaryWidth,
    margin: { left: summaryX },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'right' }
    }
  });

  // Grand Total
  yPos = (doc as any).lastAutoTable.finalY;
  doc.setFillColor(primaryBlue);
  doc.rect(summaryX, yPos, summaryWidth, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.text('Grand Total', summaryX + 2, yPos + 5.5);
  doc.text(`₹${data.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 2, yPos + 5.5, { align: 'right' });

  // Amount in Words
  yPos += 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('Amount in Words:', 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(darkGrey);
  const amountWords = doc.splitTextToSize(numberToWords(data.grand_total), pageWidth - 28);
  doc.text(amountWords, 14, yPos);

  yPos += amountWords.length * 4 + 8;

  // Notes Section
  if (data.additional_notes || yPos < pageHeight - 80) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue);
    doc.text('Notes:', 14, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);
    
    const defaultNotes = [
      '• This is a Proforma Invoice, not a tax invoice.',
      '• Amount shown is payable in advance before display execution.',
      '• Subject to realization of payment.'
    ];
    
    const notes = data.additional_notes 
      ? doc.splitTextToSize(data.additional_notes, pageWidth - 28)
      : defaultNotes;
    
    doc.text(notes, 14, yPos);
    yPos += Array.isArray(notes) ? notes.length * 4 + 5 : 9;
  }

  // Terms & Conditions
  if (yPos < pageHeight - 60) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue);
    doc.text('Terms & Conditions:', 14, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);

    const defaultTerms = [
      '1. Advance payment required before campaign execution.',
      '2. Printing & mounting are additional unless specified.',
      '3. Site availability subject to prior bookings & renewals.',
      '4. Artwork to be submitted before execution.',
      '5. GST applicable as per prevailing laws.',
      '6. This Proforma Invoice does not indicate service completion.'
    ];

    const terms = data.terms_conditions
      ? doc.splitTextToSize(data.terms_conditions, pageWidth - 28)
      : defaultTerms;

    doc.text(terms, 14, yPos);
    yPos += Array.isArray(terms) ? terms.length * 4 + 8 : 12;
  }

  // Bank Details (if space available)
  if (yPos < pageHeight - 35) {
    doc.setFillColor(lightGrey);
    doc.rect(14, yPos, pageWidth - 28, 25, 'F');
    doc.setDrawColor(borderGrey);
    doc.rect(14, yPos, pageWidth - 28, 25, 'S');

    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue);
    doc.text('Bank Details:', 18, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);
    doc.setFontSize(8);
    doc.text('Bank: HDFC Bank  |  Branch: Karkhana Road', 18, yPos);
    yPos += 4;
    doc.text('A/C No: 50200010727301  |  IFSC: HDFC0001555', 18, yPos);
    yPos += 4;
    doc.text('Account Name: Matrix Network Solutions', 18, yPos);
  }

  // Signature Block
  const sigY = pageHeight - 25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('For Matrix Network Solutions', pageWidth - 14, sigY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', pageWidth - 14, sigY + 8, { align: 'right' });

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(darkGrey);
  const footerText = 'This is a computer-generated Proforma Invoice. No signature required.\nPowered by Go-Ads 360° OOH Management System.';
  doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc;
};