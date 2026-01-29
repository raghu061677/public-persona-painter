import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import type { ExportOptions } from '@/components/plans/ExportOptionsDialog';
import { formatAssetDisplayCode } from '@/lib/assets/formatAssetDisplayCode';

interface ExportData {
  plan: any;
  planItems: any[];
  options: ExportOptions;
}

function formatDateToDDMonYY(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}

function getDocumentTypeLabel(optionType: string): string {
  const labels: Record<string, string> = {
    quotation: 'Quotation',
    estimate: 'Estimate',
    proforma_invoice: 'Proforma Invoice',
    work_order: 'Work Order',
  };
  return labels[optionType] || 'Quotation';
}

export async function generateUnifiedExcel(data: ExportData): Promise<Blob> {
  const { plan, planItems, options } = data;

  // Fetch client details
  const { data: clientData } = await supabase
    .from('clients')
    .select('*')
    .eq('id', plan.client_id)
    .single();

  // Fetch company details for the prefix
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', plan.company_id)
    .maybeSingle();

  const workbook = new ExcelJS.Workbook();
  
  // ============ SHEET 1: SUMMARY ============
  const summarySheet = workbook.addWorksheet('Summary');
  
  // Set column widths
  summarySheet.columns = [
    { width: 30 },
    { width: 40 },
  ];

  let rowNum = 1;

  // Title
  summarySheet.mergeCells(`A${rowNum}:B${rowNum}`);
  const titleCell = summarySheet.getCell(`A${rowNum}`);
  titleCell.value = `${getDocumentTypeLabel(options.optionType)} Summary`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  rowNum += 2;

  // Client Information
  summarySheet.getCell(`A${rowNum}`).value = 'Client Name';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = clientData?.name || plan.client_name || '';
  rowNum++;

  if (clientData?.billing_address_line1) {
    summarySheet.getCell(`A${rowNum}`).value = 'Address';
    summarySheet.getCell(`A${rowNum}`).font = { bold: true };
    summarySheet.getCell(`B${rowNum}`).value = clientData.billing_address_line1;
    rowNum++;
  }

  if (clientData?.gst_number) {
    summarySheet.getCell(`A${rowNum}`).value = 'GSTIN';
    summarySheet.getCell(`A${rowNum}`).font = { bold: true };
    summarySheet.getCell(`B${rowNum}`).value = clientData.gst_number;
    rowNum++;
  }

  const cityStatePin = `${clientData?.billing_city || ''}, ${clientData?.billing_state || ''}, ${clientData?.billing_pincode || ''}`;
  summarySheet.getCell(`A${rowNum}`).value = 'City, State, Pincode';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = cityStatePin;
  rowNum += 2;

  // Document Information
  summarySheet.getCell(`A${rowNum}`).value = 'Document Type';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = getDocumentTypeLabel(options.optionType);
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Document No';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = plan.id;
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Document Date';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = formatDateToDDMonYY(plan.created_at);
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Campaign Name';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = plan.plan_name;
  rowNum += 2;

  // Campaign Summary
  const totalInventories = planItems.length;
  const totalSqft = planItems.reduce((sum, item) => sum + (item.total_sqft || 0), 0);
  const totalPrinting = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMounting = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const installationCost = totalPrinting + totalMounting;
  const displayCost = plan.grand_total - plan.gst_amount - installationCost;

  summarySheet.getCell(`A${rowNum}`).value = 'Total Inventories';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = totalInventories;
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Total SQFT';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = Math.round(totalSqft);
  rowNum += 2;

  // Financial Summary
  summarySheet.getCell(`A${rowNum}`).value = 'Display Cost';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = Math.round(displayCost);
  summarySheet.getCell(`B${rowNum}`).numFmt = '₹#,##0';
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Printing Cost';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = totalPrinting;
  summarySheet.getCell(`B${rowNum}`).numFmt = '₹#,##0';
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'Installation Cost';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = totalMounting;
  summarySheet.getCell(`B${rowNum}`).numFmt = '₹#,##0';
  rowNum++;

  summarySheet.getCell(`A${rowNum}`).value = 'GST Amount (18%)';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true };
  summarySheet.getCell(`B${rowNum}`).value = Math.round(plan.gst_amount);
  summarySheet.getCell(`B${rowNum}`).numFmt = '₹#,##0';
  rowNum += 2;

  summarySheet.getCell(`A${rowNum}`).value = 'Grand Total';
  summarySheet.getCell(`A${rowNum}`).font = { bold: true, size: 14 };
  summarySheet.getCell(`B${rowNum}`).value = Math.round(plan.grand_total);
  summarySheet.getCell(`B${rowNum}`).numFmt = '₹#,##0';
  summarySheet.getCell(`B${rowNum}`).font = { bold: true, size: 14 };
  summarySheet.getCell(`B${rowNum}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }
  };

  // ============ SHEET 2: LINE ITEMS ============
  const itemsSheet = workbook.addWorksheet('Line Items');
  
  // Headers
  const headers = [
    'Sr No',
    'Asset Code',
    'Area',
    'Location',
    'Size',
    'SQFT',
    'Illumination',
    'Qty',
    'Start Date',
    'End Date',
    'Days',
    'Monthly Rate',
    'Base Rate',
    'Negotiated Rate',
    'Display Cost',
    'Printing Mode',
    'Printing Rate',
    'Printing Cost',
    'Installation Mode',
    'Installation Rate',
    'Installation Cost',
    'Total Line Amount',
  ];

  const headerRow = itemsSheet.addRow(headers);
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;

  // Set column widths
  itemsSheet.columns = [
    { width: 8 },  // Sr No
    { width: 15 }, // Asset Code
    { width: 15 }, // Area
    { width: 25 }, // Location
    { width: 12 }, // Size
    { width: 10 }, // SQFT
    { width: 12 }, // Illumination
    { width: 8 },  // Qty
    { width: 12 }, // Start Date
    { width: 12 }, // End Date
    { width: 8 },  // Days
    { width: 12 }, // Monthly Rate
    { width: 12 }, // Base Rate
    { width: 12 }, // Negotiated Rate
    { width: 12 }, // Display Cost
    { width: 12 }, // Printing Mode
    { width: 12 }, // Printing Rate
    { width: 12 }, // Printing Cost
    { width: 14 }, // Installation Mode
    { width: 12 }, // Installation Rate
    { width: 14 }, // Installation Cost
    { width: 15 }, // Total Line Amount
  ];

  // Add data rows
  planItems.forEach((item, index) => {
    const days = plan.duration_days || 30;
    // Use full precision for pro-rata, round only the final line total
    const proRataCost = Math.round(((item.sales_price || item.card_rate) / 30) * days * 100) / 100;
    const lineTotal = Math.round((proRataCost + (item.printing_charges || 0) + (item.mounting_charges || 0)) * 100) / 100;

    const printingSqftMode = item.printing_charges && item.total_sqft ? 'Sqft' : 'Unit';
    const printingRate = item.printing_charges && item.total_sqft && printingSqftMode === 'Sqft' 
      ? Math.round(item.printing_charges / item.total_sqft)
      : item.printing_charges || 0;

    const installationSqftMode = item.mounting_charges && item.total_sqft ? 'Sqft' : 'Unit';
    const installationRate = item.mounting_charges && item.total_sqft && installationSqftMode === 'Sqft'
      ? Math.round(item.mounting_charges / item.total_sqft)
      : item.mounting_charges || 0;

    // Build display asset code with company prefix (always apply)
    const displayAssetCode = formatAssetDisplayCode({
      mediaAssetCode: item.media_asset_code,
      fallbackId: item.asset_id,
      companyName: companyData?.name || null,
    });

    const row = itemsSheet.addRow([
      index + 1,
      displayAssetCode,
      item.area,
      item.location,
      item.dimensions,
      Math.round(item.total_sqft || 0),
      item.illumination_type || 'Non-Lit',
      1,
      formatDateToDDMonYY(item.start_date || plan.start_date),
      formatDateToDDMonYY(item.end_date || plan.end_date),
      days,
      item.card_rate,
      item.base_rent || 0,
      item.sales_price,
      Math.round(proRataCost),
      printingSqftMode,
      printingRate,
      item.printing_charges || 0,
      installationSqftMode,
      installationRate,
      item.mounting_charges || 0,
      Math.round(lineTotal),
    ]);

    // Format number columns
    [12, 13, 14, 15, 17, 18, 20, 21, 22].forEach(colNum => {
      const cell = row.getCell(colNum);
      cell.numFmt = '₹#,##0';
    });

    row.alignment = { vertical: 'middle' };
  });

  // Add totals row
  const totalsRowNum = planItems.length + 2;
  const totalsRow = itemsSheet.getRow(totalsRowNum);
  
  itemsSheet.getCell(`A${totalsRowNum}`).value = 'TOTALS';
  itemsSheet.getCell(`A${totalsRowNum}`).font = { bold: true };
  
  const totalDisplayCost = Math.round(planItems.reduce((sum, item) => {
    const days = plan.duration_days || 30;
    // Use full precision for each item, then round the total sum
    const proRata = ((item.sales_price || item.card_rate) / 30) * days;
    return sum + proRata;
  }, 0) * 100) / 100;
  
  const totalPrintingCost = planItems.reduce((sum, item) => sum + (item.printing_charges || 0), 0);
  const totalMountingCost = planItems.reduce((sum, item) => sum + (item.mounting_charges || 0), 0);
  const totalLineAmount = totalDisplayCost + totalPrintingCost + totalMountingCost;

  itemsSheet.getCell(`O${totalsRowNum}`).value = Math.round(totalDisplayCost);
  itemsSheet.getCell(`O${totalsRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`O${totalsRowNum}`).font = { bold: true };

  itemsSheet.getCell(`R${totalsRowNum}`).value = totalPrintingCost;
  itemsSheet.getCell(`R${totalsRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`R${totalsRowNum}`).font = { bold: true };

  itemsSheet.getCell(`U${totalsRowNum}`).value = totalMountingCost;
  itemsSheet.getCell(`U${totalsRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`U${totalsRowNum}`).font = { bold: true };

  itemsSheet.getCell(`V${totalsRowNum}`).value = Math.round(totalLineAmount);
  itemsSheet.getCell(`V${totalsRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`V${totalsRowNum}`).font = { bold: true };

  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }
  };

  // Add GST row
  const gstRowNum = totalsRowNum + 1;
  itemsSheet.getCell(`A${gstRowNum}`).value = 'GST (18%)';
  itemsSheet.getCell(`A${gstRowNum}`).font = { bold: true };
  itemsSheet.getCell(`V${gstRowNum}`).value = Math.round(plan.gst_amount);
  itemsSheet.getCell(`V${gstRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`V${gstRowNum}`).font = { bold: true };

  // Add Grand Total row
  const grandTotalRowNum = gstRowNum + 1;
  itemsSheet.getCell(`A${grandTotalRowNum}`).value = 'GRAND TOTAL';
  itemsSheet.getCell(`A${grandTotalRowNum}`).font = { bold: true, size: 12 };
  itemsSheet.getCell(`V${grandTotalRowNum}`).value = Math.round(plan.grand_total);
  itemsSheet.getCell(`V${grandTotalRowNum}`).numFmt = '₹#,##0';
  itemsSheet.getCell(`V${grandTotalRowNum}`).font = { bold: true, size: 12 };
  
  const grandTotalRow = itemsSheet.getRow(grandTotalRowNum);
  grandTotalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' }
  };

  // Apply borders to data range
  const lastRow = grandTotalRowNum;
  for (let row = 1; row <= lastRow; row++) {
    for (let col = 1; col <= 22; col++) {
      const cell = itemsSheet.getRow(row).getCell(col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    }
  }

  // Generate buffer and return as blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
