/**
 * Shared professional footer for Excel exports.
 * Appends Note, Contact, and Terms & Conditions sections after the asset table.
 */
import ExcelJS from 'exceljs';

const TERMS_CLAUSES = [
  'i) Blocking of media will be valid for 24 hours only, after which the site will be released and becomes subject to availability. Blocking is considered confirmed only after written confirmation via email.',
  'ii) All sites are subject to availability at the time of written confirmation.',
  'iii) Matrix Network Solutions shall not be responsible for flex theft, tearing, or damage caused due to weather conditions, vandalism, or external factors beyond control.',
  'iv) Government taxes (GST or other statutory levies) will be charged extra as applicable.',
  'v) A Purchase Order (PO) must be issued within 7 days from the campaign start date and should be issued in favour of Matrix Network Solutions.',
  'vi) Extension of an ongoing campaign must be informed at least 10 days prior to the campaign end date. If no written communication is received, it will be treated as no extension.',
  'vii) Payment must be made in advance prior to the campaign start date unless otherwise agreed in writing.',
  'viii) Any dispute arising out of or in connection with this contract shall be subject to the jurisdiction of courts in Telangana.',
  'ix) If any site becomes unavailable due to government authority orders, road widening, or regulatory restrictions, Matrix Network Solutions reserves the right to provide an alternate equivalent site.',
  'x) Creative artwork must be provided at least 3 working days prior to the campaign start date.',
  'xi) Campaign proof photographs will be shared with the client after installation.',
];

export function addProfessionalFooter(
  worksheet: ExcelJS.Worksheet,
  colCount: number,
  startRow: number,
): number {
  let row = startRow;

  // 2 empty rows gap
  row += 2;

  // --- SECTION 1: Note ---
  worksheet.mergeCells(row, 1, row, colCount);
  const noteTitle = worksheet.getRow(row).getCell(1);
  noteTitle.value = 'Note:';
  noteTitle.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
  row++;

  const noteLines = [
    'Rates are valid for 24 hours from the time of proposal.',
    'All media bookings will be confirmed only after written confirmation.',
  ];
  for (const line of noteLines) {
    worksheet.mergeCells(row, 1, row, colCount);
    const cell = worksheet.getRow(row).getCell(1);
    cell.value = line;
    cell.font = { size: 10 };
    cell.alignment = { wrapText: true };
    row++;
  }

  // gap
  row++;

  // --- SECTION 2: For Bookings & Confirmation ---
  worksheet.mergeCells(row, 1, row, colCount);
  const contactTitle = worksheet.getRow(row).getCell(1);
  contactTitle.value = 'For Bookings & Confirmation:';
  contactTitle.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
  row++;

  const contactLines = [
    'Matrix Network Solutions',
    'Email : info@matrix-networksolutions.com',
    'Mobile : 9666444888 | 9908099090',
  ];
  for (const line of contactLines) {
    worksheet.mergeCells(row, 1, row, colCount);
    const cell = worksheet.getRow(row).getCell(1);
    cell.value = line;
    cell.font = { size: 10 };
    cell.alignment = { wrapText: true };
    row++;
  }

  // gap
  row++;

  // --- SECTION 3: Terms & Conditions ---
  worksheet.mergeCells(row, 1, row, colCount);
  const tcTitle = worksheet.getRow(row).getCell(1);
  tcTitle.value = 'TERMS & CONDITIONS';
  tcTitle.font = { bold: true, size: 12 };
  tcTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  tcTitle.alignment = { vertical: 'middle' };
  worksheet.getRow(row).height = 26;
  // Fill entire merged area background
  for (let c = 1; c <= colCount; c++) {
    worksheet.getRow(row).getCell(c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' },
    };
  }
  row++;

  for (const clause of TERMS_CLAUSES) {
    worksheet.mergeCells(row, 1, row, colCount);
    const cell = worksheet.getRow(row).getCell(1);
    cell.value = clause;
    cell.font = { size: 9.5 };
    cell.alignment = { wrapText: true, vertical: 'top' };
    worksheet.getRow(row).height = 30;
    row++;
  }

  return row;
}
