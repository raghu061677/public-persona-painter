import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrderData {
  plan: any;
  client: any;
  assets: any[];
  companyData?: any;
}

export async function generateWorkOrderPDF(planId: string): Promise<Blob> {
  // Fetch plan details
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  // Fetch company details
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

  if (clientError) throw clientError;

  // Fetch plan items with asset details
  const { data: planItems, error: itemsError } = await supabase
    .from('plan_items')
    .select('*, media_assets(*)')
    .eq('plan_id', planId);

  if (itemsError) throw itemsError;

  const data: WorkOrderData = {
    plan,
    client,
    assets: planItems || [],
    companyData,
  };

  return createPDF(data);
}

function createPDF(data: WorkOrderData): Blob {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  // Colors
  const darkBlue: [number, number, number] = [30, 58, 138];
  const lightGray: [number, number, number] = [249, 250, 251];
  const borderGray: [number, number, number] = [229, 231, 235];

  // Header Section - Company Details
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('WORK ORDER', pageWidth - 15, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`WO-${data.plan.id}`, pageWidth - 15, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 15, yPos, { align: 'right' });

  // Company details - Left side
  yPos = 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyData?.name || 'Matrix Network Solutions', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyData?.address_line1 || 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,', 15, yPos);
  yPos += 4;
  doc.text(data.companyData?.address_line2 || 'Near Begumpet Metro Station, Opp Country Club,', 15, yPos);
  yPos += 4;
  doc.text(`${data.companyData?.city || 'Begumpet'}, ${data.companyData?.state || 'Hyderabad'} - ${data.companyData?.pincode || '500016'}`, 15, yPos);
  yPos += 5;
  doc.text(`GSTIN: ${data.companyData?.gstin || '36AATFM4107H2Z3'} | PAN: ${data.companyData?.pan || 'AATFM4107H'}`, 15, yPos);
  yPos += 4;
  doc.text(`Phone: ${data.companyData?.phone || '+91-4042625757'} | Email: ${data.companyData?.email || 'raghu@matrix-networksolutions.com'}`, 15, yPos);
  yPos += 4;
  doc.text(`Website: ${data.companyData?.website || 'www.matrixnetworksolutions.com'}`, 15, yPos);

  yPos = 50;

  // Bank Details Box
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPos, 80, 20, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(15, yPos, 80, 20, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details:', 18, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('HDFC Bank | A/C: 50200010727301', 18, yPos + 9);
  doc.text('IFSC: HDFC0001555 | Branch: Karkhana Road', 18, yPos + 13);

  // Bill To / Ship To Section
  yPos = 75;
  
  // Bill To
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, yPos, (pageWidth - 35) / 2, 30, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(15, yPos, (pageWidth - 35) / 2, 30, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 18, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.client.name || '', 18, yPos + 11);
  doc.text(data.client.billing_address_line1 || '', 18, yPos + 15);
  if (data.client.billing_city) {
    doc.text(`${data.client.billing_city}, ${data.client.billing_state} - ${data.client.billing_pincode}`, 18, yPos + 19);
  }
  if (data.client.gst_number) {
    doc.text(`GSTIN: ${data.client.gst_number}`, 18, yPos + 23);
  }
  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, 18, yPos + 27);
  }

  // Ship To
  const shipToX = 15 + (pageWidth - 35) / 2 + 5;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(shipToX, yPos, (pageWidth - 35) / 2, 30, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(shipToX, yPos, (pageWidth - 35) / 2, 30, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SHIP TO:', shipToX + 3, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const shipToAddress = data.client.shipping_same_as_billing ? 
    data.client.billing_address_line1 : data.client.shipping_address_line1;
  doc.text(data.client.name || '', shipToX + 3, yPos + 11);
  doc.text(shipToAddress || 'Same as Bill To', shipToX + 3, yPos + 15);

  yPos = 110;

  // Subject Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Subject: Work Order for Outdoor Media Display - ${data.plan.plan_name || ''}`, 15, yPos);
  
  yPos += 8;

  // Assets Table
  const tableData = data.assets.map((item: any, index: number) => {
    const asset = item.media_assets;
    const lineTotal = (item.negotiated_rate || 0) - (item.discount || 0) + 
                     (item.printing_charges || 0) + (item.mounting_charges || 0);
    
    return [
      index + 1,
      asset?.id || '',
      `${asset?.area || ''} - ${asset?.location || ''}`,
      asset?.direction || '',
      asset?.dimensions || '',
      asset?.total_sqft || '',
      asset?.illumination || 'Non-Lit',
      `Rs. ${(item.card_rate || 0).toLocaleString('en-IN')}`,
      `Rs. ${(item.negotiated_rate || 0).toLocaleString('en-IN')}`,
      `Rs. ${(item.discount || 0).toLocaleString('en-IN')}`,
      `Rs. ${(item.printing_charges || 0).toLocaleString('en-IN')}`,
      `Rs. ${(item.mounting_charges || 0).toLocaleString('en-IN')}`,
      `Rs. ${lineTotal.toLocaleString('en-IN')}`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      'S.No',
      'Asset ID',
      'Display Name',
      'Direction',
      'Size',
      'Sqft',
      'Illum.',
      'Rate',
      'Negotiated',
      'Discount',
      'Printing',
      'Mounting',
      'Total',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [darkBlue[0], darkBlue[1], darkBlue[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right' },
      12: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

  // Summary Box
  const summaryX = pageWidth - 75;
  let summaryY = finalY + 10;

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(summaryX, summaryY, 60, 45, 'S');

  doc.setFontSize(9);
  const summaryItems = [
    ['Subtotal:', `Rs. ${(data.plan.sub_total || 0).toLocaleString('en-IN')}`],
    ['Total Printing:', `Rs. ${(data.plan.total_printing || 0).toLocaleString('en-IN')}`],
    ['Total Mounting:', `Rs. ${(data.plan.total_mounting || 0).toLocaleString('en-IN')}`],
    ['Discount:', `Rs. ${(data.plan.total_discount || 0).toLocaleString('en-IN')}`],
    ['Taxable Amount:', `Rs. ${(data.plan.taxable_amount || 0).toLocaleString('en-IN')}`],
    ['CGST @ 9%:', `Rs. ${(data.plan.cgst_amount || 0).toLocaleString('en-IN')}`],
    ['SGST @ 9%:', `Rs. ${(data.plan.sgst_amount || 0).toLocaleString('en-IN')}`],
  ];

  summaryItems.forEach(([label, value], index) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, summaryX + 3, summaryY + 6 + (index * 5));
    doc.text(value, summaryX + 57, summaryY + 6 + (index * 5), { align: 'right' });
  });

  summaryY += 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total:', summaryX + 3, summaryY);
  doc.text(`Rs. ${(data.plan.grand_total || 0).toLocaleString('en-IN')}`, summaryX + 57, summaryY, { align: 'right' });

  // Terms & Conditions
  const termsY = finalY + 60;
  if (termsY < pageHeight - 40) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions:', 15, termsY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const terms = [
      '1. Advance payment & Work Order approval is mandatory before campaign execution.',
      '2. Printing & Mounting charges are extra if applicable.',
      '3. Site availability is subject to renewal by existing client.',
      '4. Artwork must be submitted before execution.',
      '5. Any damage or vandalism to flex will require fresh material from client.',
      '6. All taxes extra as applicable.',
    ];
    
    terms.forEach((term, index) => {
      doc.text(term, 15, termsY + 6 + (index * 4));
    });

    // Signature Block
    const sigY = termsY + 35;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`For ${data.companyData?.name || 'Matrix Network Solutions'}`, 15, sigY);
    doc.text('___________________________', 15, sigY + 15);
    doc.text('Authorized Signatory', 15, sigY + 20);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated Work Order. No signature required.', pageWidth / 2, pageHeight - 8, { align: 'center' });
  doc.text('Powered by Go-Ads 360° OOH Media System', pageWidth / 2, pageHeight - 4, { align: 'center' });

  return doc.output('blob');
}
