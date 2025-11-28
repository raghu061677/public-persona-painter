import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFDocumentData {
  documentType: 'WORK ORDER' | 'ESTIMATE' | 'QUOTATION' | 'PROFORMA INVOICE';
  documentNumber: string;
  documentDate: string;
  displayName: string;
  pointOfContact: string;
  
  // Client details
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;
  
  // Company details
  companyName: string;
  companyGSTIN: string;
  companyPAN: string;
  
  // Line items
  items: PDFLineItem[];
  
  // Totals
  displayCost: number;
  installationCost: number;
  gst: number;
  totalInr: number;
}

interface PDFLineItem {
  description: string;
  startDate: string; // Format: 15Aug25
  endDate: string;   // Format: 15Aug25
  days: number;
  monthlyRate: number;
  cost: number;
}

// Format date to DDMonYY (e.g., "15Aug25")
export function formatDateToDDMonYY(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}

export function generateStandardizedPDF(data: PDFDocumentData): Blob {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // ========== HEADER SECTION (LEFT SIDE) ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(12);
  doc.text(data.documentType, 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.clientName, 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientAddress, 15, yPos);
  
  yPos += 5;
  if (data.clientGSTIN) {
    doc.text(`GSTIN: ${data.clientGSTIN}`, 15, yPos);
    yPos += 5;
  }
  doc.text(`${data.clientCity}, ${data.clientState}, ${data.clientPincode}`, 15, yPos);

  // ========== HEADER SECTION (RIGHT SIDE) ==========
  const rightX = pageWidth - 15;
  let rightY = 15;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Name : ${data.displayName}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  let docLabel = '';
  switch(data.documentType) {
    case 'WORK ORDER':
      docLabel = 'WO No';
      break;
    case 'ESTIMATE':
      docLabel = 'Estimate No';
      break;
    case 'QUOTATION':
      docLabel = 'Quotation No';
      break;
    case 'PROFORMA INVOICE':
      docLabel = 'PI No';
      break;
  }
  doc.text(`${docLabel} : ${data.documentNumber}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  let dateLabel = '';
  switch(data.documentType) {
    case 'WORK ORDER':
      dateLabel = 'WO Date';
      break;
    case 'ESTIMATE':
      dateLabel = 'Estimate Date';
      break;
    case 'QUOTATION':
      dateLabel = 'Quotation Date';
      break;
    case 'PROFORMA INVOICE':
      dateLabel = 'PI Date';
      break;
  }
  doc.text(`${dateLabel} : ${data.documentDate}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  doc.text(`Point of Contact : ${data.pointOfContact}`, rightX, rightY, { align: 'right' });

  // Company GSTIN and PAN (below client section on left)
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${data.companyGSTIN}`, 15, yPos);
  yPos += 5;
  doc.text(`PAN: ${data.companyPAN}`, 15, yPos);

  yPos += 10;

  // ========== SUMMARY OF CHARGES TABLE ==========
  const tableData = data.items.map(item => [
    item.description,
    item.startDate,
    item.endDate,
    item.days.toString(),
    `₹${item.monthlyRate.toLocaleString('en-IN')}`,
    `₹${item.cost.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Start Date', 'End Date', 'Days', 'Monthly Rate', 'Cost']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell: (data) => {
      // Draw subtle lines
      if (data.section === 'head' || data.section === 'body') {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
      }
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;

  // ========== TOTALS (RIGHT ALIGNED) ==========
  const totalsX = pageWidth - 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Cost :`, totalsX - 50, yPos);
  doc.text(`₹${data.displayCost.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`Installation Cost :`, totalsX - 50, yPos);
  doc.text(`₹${data.installationCost.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`GST (18%) :`, totalsX - 50, yPos);
  doc.text(`₹${data.gst.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total in INR :`, totalsX - 50, yPos);
  doc.text(`₹${data.totalInr.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });

  yPos += 15;

  // ========== TERMS & CONDITIONS ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const terms = [
    '1. Advance Payment & Purchase Order is Mandatory to start the campaign.',
    '2. Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
    '3. Site available date may change in case of present display Renewal.',
    '4. Site Availability changes every minute, please double check site available dates when you confirm the sites.',
    '5. Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.',
    '6. Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered',
    '   within 5 days of confirmation, we will release the site.',
    '7. In case flex/vinyl/display material is damaged, torn or vandalised, it will be your responsibility to provide',
    '   new flex.',
    '8. Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.',
  ];
  
  // Draw box around terms
  const termsStartY = yPos - 3;
  const termsHeight = terms.length * 4.5 + 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);
  
  terms.forEach((term) => {
    doc.text(term, 18, yPos);
    yPos += 4.5;
  });

  // ========== FOOTER ==========
  yPos = doc.internal.pageSize.getHeight() - 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyGSTIN, 15, yPos);

  return doc.output('blob');
}
