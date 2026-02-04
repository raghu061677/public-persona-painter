/**
 * Proposal Excel Export
 * 
 * READ-ONLY export for Plans module - generates client proposal Excel.
 * This utility does NOT write to the database or modify any plan data.
 * 
 * Column structure matches manual proposal format:
 * Sno | Location | Direction | Size | Sqft | Illumination | Start Date | End Date | Days | 
 * Monthly Rate | Display Cost | Printing | Mounting | Final Amount
 */

import ExcelJS from 'exceljs';

export interface ProposalAsset {
  // Asset info (from media_assets)
  id: string;
  location: string;
  direction?: string;
  dimensions?: string;
  total_sqft?: number;
  illumination_type?: string;
  // Pricing info (from plan asset state)
  start_date?: string | Date;
  end_date?: string | Date;
  booked_days?: number;
  negotiated_rate?: number;
  negotiated_price?: number;
  sales_price?: number;
  card_rate?: number;
  printing_cost?: number;
  printing_rate?: number;
  mounting_cost?: number;
  mounting_rate?: number;
  mounting_mode?: string;
}

export interface ProposalExportData {
  planId: string;
  planName: string;
  clientName: string;
  assets: ProposalAsset[];
  assetPricing: Record<string, any>;
  planStartDate?: Date;
  planEndDate?: Date;
  durationDays?: number;
}

function formatDateToDDMonYY(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export async function generateProposalExcel(data: ProposalExportData): Promise<Blob> {
  const { planId, planName, clientName, assets, assetPricing, planStartDate, planEndDate, durationDays = 30 } = data;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Proposal');

  // Define columns with exact structure as per requirements
  sheet.columns = [
    { header: 'Sno', key: 'sno', width: 6 },
    { header: 'Location', key: 'location', width: 35 },
    { header: 'Direction', key: 'direction', width: 12 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Sqft', key: 'sqft', width: 10 },
    { header: 'Illumination', key: 'illumination', width: 14 },
    { header: 'Start Date', key: 'start_date', width: 12 },
    { header: 'End Date', key: 'end_date', width: 12 },
    { header: 'Days', key: 'days', width: 8 },
    { header: 'Monthly Rate (₹)', key: 'monthly_rate', width: 16 },
    { header: 'Display Cost (₹)', key: 'display_cost', width: 16 },
    { header: 'Printing (₹)', key: 'printing', width: 14 },
    { header: 'Mounting (₹)', key: 'mounting', width: 14 },
    { header: 'Final Amount (₹)', key: 'final_amount', width: 16 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Deep blue
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;

  // Track totals
  let totalDisplayCost = 0;
  let totalPrinting = 0;
  let totalMounting = 0;
  let totalFinalAmount = 0;

  // Add data rows
  assets.forEach((asset, index) => {
    const pricing = assetPricing[asset.id] || {};
    
    // Get values from pricing state or asset defaults
    const assetStartDate = pricing.start_date 
      ? (typeof pricing.start_date === 'string' ? new Date(pricing.start_date) : pricing.start_date)
      : (planStartDate || new Date());
    const assetEndDate = pricing.end_date 
      ? (typeof pricing.end_date === 'string' ? new Date(pricing.end_date) : pricing.end_date)
      : (planEndDate || new Date());
    
    const bookedDays = pricing.booked_days || durationDays || 30;
    
    // Monthly rate: negotiated_price > negotiated_rate > sales_price > card_rate
    const monthlyRate = pricing.negotiated_price || pricing.negotiated_rate || pricing.sales_price || asset.card_rate || 0;
    
    // Display Cost = Monthly Rate × booked_days / 30 (READ-ONLY calculation for Excel only)
    const displayCost = roundToTwo((monthlyRate * bookedDays) / 30);
    
    // Printing cost: use pricing.printing_charges > pricing.printing_cost > (sqft * printing_rate) > 0
    const sqft = asset.total_sqft || 0;
    const printingRate = pricing.printing_rate || 0;
    let printingCost = 0;
    if (pricing.printing_charges && pricing.printing_charges > 0) {
      printingCost = roundToTwo(pricing.printing_charges);
    } else if (pricing.printing_cost && pricing.printing_cost > 0) {
      printingCost = roundToTwo(pricing.printing_cost);
    } else if (sqft > 0 && printingRate > 0) {
      printingCost = roundToTwo(sqft * printingRate);
    }
    
    // Mounting cost: use pricing.mounting_charges > pricing.mounting_cost > (sqft * mounting_rate if mode is sqft) > 0
    const mountingRate = pricing.mounting_rate || 0;
    const mountingMode = pricing.mounting_mode || 'sqft';
    let mountingCost = 0;
    if (pricing.mounting_charges && pricing.mounting_charges > 0) {
      mountingCost = roundToTwo(pricing.mounting_charges);
    } else if (pricing.mounting_cost && pricing.mounting_cost > 0) {
      mountingCost = roundToTwo(pricing.mounting_cost);
    } else if (mountingMode === 'fixed' && mountingRate > 0) {
      mountingCost = roundToTwo(mountingRate);
    } else if (sqft > 0 && mountingRate > 0) {
      mountingCost = roundToTwo(sqft * mountingRate);
    }
    
    // Final Amount = Display Cost + Printing + Mounting
    const finalAmount = roundToTwo(displayCost + printingCost + mountingCost);
    
    // Accumulate totals
    totalDisplayCost += displayCost;
    totalPrinting += printingCost;
    totalMounting += mountingCost;
    totalFinalAmount += finalAmount;

    const row = sheet.addRow({
      sno: index + 1,
      location: asset.location || '-',
      direction: asset.direction || '-',
      size: asset.dimensions || '-',
      sqft: asset.total_sqft || '-',
      illumination: asset.illumination_type || '-',
      start_date: formatDateToDDMonYY(assetStartDate),
      end_date: formatDateToDDMonYY(assetEndDate),
      days: bookedDays,
      monthly_rate: monthlyRate,
      display_cost: displayCost,
      printing: printingCost,
      mounting: mountingCost,
      final_amount: finalAmount,
    });

    // Alternate row colors for readability
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }, // Light gray
      };
    }

    // Right-align numeric columns
    ['sqft', 'days', 'monthly_rate', 'display_cost', 'printing', 'mounting', 'final_amount'].forEach(col => {
      row.getCell(col).alignment = { horizontal: 'right' };
    });

    // Center date columns
    ['start_date', 'end_date'].forEach(col => {
      row.getCell(col).alignment = { horizontal: 'center' };
    });
  });

  // Add totals section
  const emptyRow = sheet.addRow({});
  const totalsLabelRow = sheet.addRow({
    sno: '',
    location: '',
    direction: '',
    size: '',
    sqft: '',
    illumination: '',
    start_date: '',
    end_date: '',
    days: '',
    monthly_rate: 'TOTALS',
    display_cost: roundToTwo(totalDisplayCost),
    printing: roundToTwo(totalPrinting),
    mounting: roundToTwo(totalMounting),
    final_amount: roundToTwo(totalFinalAmount),
  });

  // Style totals row
  totalsLabelRow.font = { bold: true };
  totalsLabelRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' }, // Light blue
  };
  
  // Right-align totals
  ['display_cost', 'printing', 'mounting', 'final_amount'].forEach(col => {
    totalsLabelRow.getCell(col).alignment = { horizontal: 'right' };
  });
  totalsLabelRow.getCell('monthly_rate').alignment = { horizontal: 'right' };

  // Add Grand Total row
  const grandTotalRow = sheet.addRow({
    sno: '',
    location: '',
    direction: '',
    size: '',
    sqft: '',
    illumination: '',
    start_date: '',
    end_date: '',
    days: '',
    monthly_rate: '',
    display_cost: '',
    printing: '',
    mounting: 'Grand Total:',
    final_amount: roundToTwo(totalFinalAmount),
  });
  
  grandTotalRow.font = { bold: true, size: 12 };
  grandTotalRow.getCell('mounting').alignment = { horizontal: 'right' };
  grandTotalRow.getCell('final_amount').alignment = { horizontal: 'right' };
  grandTotalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }, // Emerald green
  };
  grandTotalRow.getCell('mounting').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  grandTotalRow.getCell('final_amount').font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Apply number formatting to currency columns
  sheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      ['monthly_rate', 'display_cost', 'printing', 'mounting', 'final_amount'].forEach(col => {
        const cell = row.getCell(col);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });
    }
  });

  // Add borders to all cells
  const lastRow = sheet.lastRow?.number || 1;
  const lastCol = 14;
  
  for (let row = 1; row <= lastRow; row++) {
    for (let col = 1; col <= lastCol; col++) {
      const cell = sheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  }

  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
