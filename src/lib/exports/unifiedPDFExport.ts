import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';

interface ExportData {
  plan: any;
  planItems: any[];
  options: ExportOptions;
}

// Format date to DDMonYY (e.g., "15Aug25")
function formatDateToDDMonYY(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}

// Get document type heading
function getDocumentHeading(optionType: string): string {
  const headings: Record<string, string> = {
    quotation: 'QUOTATION',
    estimate: 'ESTIMATE',
    proforma_invoice: 'PROFORMA INVOICE',
    work_order: 'WORK ORDER',
  };
  return headings[optionType] || 'QUOTATION';
}

// Get document number label
function getDocNumberLabel(optionType: string): string {
  const labels: Record<string, string> = {
    quotation: 'Quotation No',
    estimate: 'Estimate No',
    proforma_invoice: 'PI No',
    work_order: 'WO No',
  };
  return labels[optionType] || 'Doc No';
}

// Get document date label
function getDocDateLabel(optionType: string): string {
  const labels: Record<string, string> = {
    quotation: 'Quotation Date',
    estimate: 'Estimate Date',
    proforma_invoice: 'PI Date',
    work_order: 'WO Date',
  };
  return labels[optionType] || 'Date';
}

export async function generateUnifiedPDF(data: ExportData): Promise<Blob> {
  const { plan, planItems, options } = data;

  // Fetch client details
  const { data: clientData } = await supabase
    .from('clients')
    .select('*')
    .eq('id', plan.client_id)
    .single();

  // Fetch user details for POC
  const { data: userData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', plan.created_by)
    .single();

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Select format-specific generator
  switch (options.format) {
    case 'full_detail':
      generateFullDetailPDF(doc, plan, planItems, clientData, userData, options, pageWidth, pageHeight);
      break;
    case 'compact':
      generateCompactPDF(doc, plan, planItems, clientData, userData, options, pageWidth, pageHeight);
      break;
    case 'summary_only':
      generateSummaryOnlyPDF(doc, plan, planItems, clientData, userData, options, pageWidth, pageHeight);
      break;
    case 'with_photos':
      await generateWithPhotosPDF(doc, plan, planItems, clientData, userData, options, pageWidth, pageHeight);
      break;
  }

  return doc.output('blob');
}

// ============ FULL DETAIL FORMAT ============
function generateFullDetailPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  let yPos = 15;

  // Header Section - Left
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(12);
  doc.text(getDocumentHeading(options.optionType), 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || plan.client_name || '', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (client?.billing_address_line1) {
    doc.text(client.billing_address_line1, 15, yPos);
    yPos += 5;
  }
  if (client?.gst_number) {
    doc.text(`GSTIN: ${client.gst_number}`, 15, yPos);
    yPos += 5;
  }
  const cityStatePin = `${client?.billing_city || ''}, ${client?.billing_state || ''}, ${client?.billing_pincode || ''}`;
  doc.text(cityStatePin, 15, yPos);

  // Header Section - Right
  const rightX = pageWidth - 15;
  let rightY = 15;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Name : ${plan.plan_name}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  doc.text(`${getDocNumberLabel(options.optionType)} : ${plan.id}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const planDate = formatDateToDDMonYY(plan.created_at);
  doc.text(`${getDocDateLabel(options.optionType)} : ${planDate}`, rightX, rightY, { align: 'right' });
  
  rightY += 5;
  const pocName = user?.full_name || 'N/A';
  doc.text(`Point of Contact : ${pocName}`, rightX, rightY, { align: 'right' });

  // Company GSTIN and PAN
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${options.gstin || '36AATFM4107H2Z3'}`, 15, yPos);
  yPos += 5;
  doc.text(`PAN: ${options.gstin?.substring(2, 12) || 'AATFM4107H'}`, 15, yPos);

  yPos += 10;

  // Summary of Charges Table
  const tableData: any[] = [];
  
  planItems.forEach((item) => {
    const startDate = formatDateToDDMonYY(item.start_date || plan.start_date);
    const endDate = formatDateToDDMonYY(item.end_date || plan.end_date);
    const days = plan.duration_days || 30;
    const monthlyRate = item.sales_price || item.card_rate || 0;
    const proRataCost = (monthlyRate / 30) * days;

    tableData.push([
      item.location || item.asset_id,
      startDate,
      endDate,
      days.toString(),
      `₹${monthlyRate.toLocaleString('en-IN')}`,
      `₹${Math.round(proRataCost).toLocaleString('en-IN')}`
    ]);
  });

  // Add printing and mounting rows if needed
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  
  if (totalPrinting > 0) {
    const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
    const printRate = totalSqft > 0 ? Math.round(totalPrinting / totalSqft) : 0;
    tableData.push([
      `Printing ${Math.round(totalSqft)} SQFT @ ${printRate}RS`,
      '',
      '',
      '',
      '',
      `₹${totalPrinting.toLocaleString('en-IN')}`
    ]);
  }
  
  if (totalMounting > 0) {
    const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
    const mountRate = totalSqft > 0 ? Math.round(totalMounting / totalSqft) : 0;
    tableData.push([
      `Mounting ${Math.round(totalSqft)} SQFT @ ${mountRate}RS`,
      '',
      '',
      '',
      '',
      `₹${totalMounting.toLocaleString('en-IN')}`
    ]);
  }

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
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;

  // Totals Section (Right Aligned)
  const totalsX = pageWidth - 15;
  const displayCost = plan.grand_total - plan.gst_amount;
  const installationCost = totalPrinting + totalMounting;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Cost :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(displayCost - installationCost).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`Installation Cost :`, totalsX - 50, yPos);
  doc.text(`₹${installationCost.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(`GST (18%) :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total in INR :`, totalsX - 50, yPos);
  doc.text(`₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });

  yPos += 15;

  // Terms & Conditions
  if (yPos + 60 > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const termsStartY = yPos - 3;
  const termsHeight = options.termsAndConditions.length * 4.5 + 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);
  
  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 18, yPos);
    yPos += 4.5;
  });

  // Footer
  yPos = pageHeight - 25;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
}

// ============ COMPACT FORMAT ============
function generateCompactPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  let yPos = 15;

  // Same header as Full Detail
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  yPos += 6;
  doc.setFontSize(12);
  doc.text(getDocumentHeading(options.optionType), 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || plan.client_name || '', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (client?.billing_address_line1) {
    doc.text(client.billing_address_line1, 15, yPos);
    yPos += 5;
  }

  // Right side meta
  const rightX = pageWidth - 15;
  let rightY = 15;
  doc.setFontSize(9);
  doc.text(`Display Name : ${plan.plan_name}`, rightX, rightY, { align: 'right' });
  rightY += 5;
  doc.text(`${getDocNumberLabel(options.optionType)} : ${plan.id}`, rightX, rightY, { align: 'right' });
  rightY += 5;
  doc.text(`${getDocDateLabel(options.optionType)} : ${formatDateToDDMonYY(plan.created_at)}`, rightX, rightY, { align: 'right' });

  yPos += 10;

  // Compact Table: Description | Period | Days | Amount
  const compactData: any[] = [];
  const groupedItems: Record<string, any[]> = {};
  
  // Group by similar rate and dates
  planItems.forEach(item => {
    const key = `${item.sales_price}_${item.start_date}_${item.end_date}`;
    if (!groupedItems[key]) {
      groupedItems[key] = [];
    }
    groupedItems[key].push(item);
  });

  Object.values(groupedItems).forEach(group => {
    const count = group.length;
    const firstItem = group[0];
    const startDate = formatDateToDDMonYY(firstItem.start_date || plan.start_date);
    const endDate = formatDateToDDMonYY(firstItem.end_date || plan.end_date);
    const days = plan.duration_days || 30;
    const unitCost = ((firstItem.sales_price || 0) / 30) * days;
    const totalCost = unitCost * count;

    compactData.push([
      `${count} x ${firstItem.media_type || 'Media'}`,
      `${startDate} - ${endDate}`,
      days.toString(),
      `₹${Math.round(totalCost).toLocaleString('en-IN')}`
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Period', 'Days', 'Amount']],
    body: compactData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // Compact Totals
  const totalsX = pageWidth - 15;
  const displayCost = plan.grand_total - plan.gst_amount;
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const installationCost = totalPrinting + totalMounting;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Display Cost:`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(displayCost - installationCost).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Printing:`, totalsX - 45, yPos);
  doc.text(`₹${totalPrinting.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Installation:`, totalsX - 45, yPos);
  doc.text(`₹${totalMounting.toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`GST (18%):`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total:`, totalsX - 45, yPos);
  doc.text(`₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`, totalsX, yPos, { align: 'right' });

  yPos += 12;

  // Compact Terms (smaller font, tighter spacing)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const termsStartY = yPos - 2;
  const termsHeight = options.termsAndConditions.length * 3.5 + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);

  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 17, yPos, { maxWidth: pageWidth - 35 });
    yPos += 3.5;
  });

  // Footer
  yPos = pageHeight - 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
}

// ============ SUMMARY ONLY FORMAT ============
function generateSummaryOnlyPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  let yPos = 15;

  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVERTISING SERVICES', 15, yPos);
  yPos += 6;
  doc.setFontSize(12);
  doc.text(`${getDocumentHeading(options.optionType)} - SUMMARY`, 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${client?.name || plan.client_name}`, 15, yPos);
  yPos += 5;
  doc.text(`Plan: ${plan.plan_name}`, 15, yPos);
  yPos += 5;
  doc.text(`Period: ${formatDateToDDMonYY(plan.start_date)} - ${formatDateToDDMonYY(plan.end_date)}`, 15, yPos);

  yPos += 15;

  // Summary Table
  const totalInventories = planItems.length;
  const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const displayCost = plan.grand_total - plan.gst_amount - totalPrinting - totalMounting;

  const summaryData = [
    ['Total Inventories', totalInventories.toString()],
    ['Total SQFT', Math.round(totalSqft).toLocaleString('en-IN')],
    ['Display Cost', `₹${Math.round(displayCost).toLocaleString('en-IN')}`],
    ['Printing Cost', `₹${totalPrinting.toLocaleString('en-IN')}`],
    ['Installation Cost', `₹${totalMounting.toLocaleString('en-IN')}`],
    ['GST (18%)', `₹${Math.round(plan.gst_amount).toLocaleString('en-IN')}`],
    ['Grand Total', `₹${Math.round(plan.grand_total).toLocaleString('en-IN')}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80, fillColor: [245, 245, 245] },
      1: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: 15, right: pageWidth - 175 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // Terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions -', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const termsStartY = yPos - 2;
  const termsHeight = options.termsAndConditions.length * 3.5 + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, termsStartY, pageWidth - 30, termsHeight);

  options.termsAndConditions.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 17, yPos, { maxWidth: pageWidth - 35 });
    yPos += 3.5;
  });

  // Footer
  yPos = pageHeight - 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For,', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Matrix Network Solutions', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(options.gstin || '36AATFM4107H2Z3', 15, yPos);
}

// ============ WITH PHOTOS FORMAT ============
async function generateWithPhotosPDF(
  doc: jsPDF,
  plan: any,
  planItems: any[],
  client: any,
  user: any,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number
) {
  // First generate the full detail document
  generateFullDetailPDF(doc, plan, planItems, client, user, options, pageWidth, pageHeight);

  // Add new page for photos
  doc.addPage();
  let yPos = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Execution Photos', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Fetch campaign assets with photos
  const { data: campaignAssets } = await supabase
    .from('campaign_assets')
    .select('asset_id, location, photos')
    .eq('campaign_id', plan.id);

  if (campaignAssets && campaignAssets.length > 0) {
    for (const asset of campaignAssets) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Asset: ${asset.asset_id} - ${asset.location}`, 15, yPos);
      yPos += 8;

      const photos = asset.photos as any;
      if (photos) {
        const photoTypes = ['newspaper', 'geotag', 'traffic1', 'traffic2'];
        const photoLabels = ['Newspaper', 'Geo-tag', 'Traffic Shot 1', 'Traffic Shot 2'];
        
        // Display in 2x2 grid
        const gridSize = 80;
        const spacing = 10;
        let xPos = 15;
        let rowCount = 0;

        for (let i = 0; i < photoTypes.length; i++) {
          const photoUrl = photos[photoTypes[i]];
          if (photoUrl) {
            try {
              // Add photo placeholder (actual image loading would require CORS-friendly URLs)
              doc.setDrawColor(200, 200, 200);
              doc.rect(xPos, yPos, gridSize, gridSize);
              doc.setFontSize(8);
              doc.text(photoLabels[i], xPos + gridSize / 2, yPos + gridSize + 4, { align: 'center' });
              
              rowCount++;
              if (rowCount % 2 === 0) {
                xPos = 15;
                yPos += gridSize + 10;
              } else {
                xPos += gridSize + spacing;
              }
            } catch (error) {
              console.error('Error adding photo:', error);
            }
          }
        }

        if (rowCount % 2 !== 0) {
          yPos += gridSize + 10;
        }
        yPos += 10;
      }
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No campaign execution photos available yet.', 15, yPos);
  }
}
