import ExcelJS from "exceljs";

export interface TDSExportEntry {
  client_name: string;
  invoice_id: string;
  invoice_date: string | null;
  financial_year: string;
  quarter: string;
  invoice_amount: number;
  amount_received: number;
  tds_amount: number;
  tds_section: string | null;
  deduction_date: string | null;
  form16a_received: boolean;
  reflected_in_26as: boolean;
  verified: boolean;
  status: string;
  followup_notes: string | null;
  tds_certificate_no: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

function fmtINR(n: number): number {
  return Math.round(n * 100) / 100;
}

function deriveStatus(e: TDSExportEntry): string {
  if (e.tds_amount === 0) return "Not Applicable";
  if (e.verified) return "Completed";
  if (e.reflected_in_26as) return "Reflected";
  if (e.form16a_received) return "Filed";
  return "Pending";
}

function tdsPercent(e: TDSExportEntry): string {
  if (e.invoice_amount === 0) return "-";
  return ((e.tds_amount / e.invoice_amount) * 100).toFixed(2) + "%";
}

function styleHeader(row: ExcelJS.Row, argb: string = "FF1E3A8A") {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  row.alignment = { horizontal: "center", vertical: "middle" };
  row.height = 24;
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
}

function applyAlternateRows(ws: ExcelJS.Worksheet, startRow: number, count: number) {
  for (let i = 0; i < count; i++) {
    const r = ws.getRow(startRow + i);
    r.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
    if (i % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
  }
}

export async function exportTDSReconciliation(
  entries: TDSExportEntry[],
  fy?: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  // ===================== SHEET 1: TDS Summary (client-wise) =====================
  const wsSummary = wb.addWorksheet("TDS Summary");

  // Build client-wise aggregation
  const clientMap = new Map<string, { invoiceAmt: number; received: number; tds: number; count: number; verified: number; pending: number }>();
  for (const e of entries) {
    const existing = clientMap.get(e.client_name) || { invoiceAmt: 0, received: 0, tds: 0, count: 0, verified: 0, pending: 0 };
    existing.invoiceAmt += e.invoice_amount;
    existing.received += e.amount_received;
    existing.tds += e.tds_amount;
    existing.count++;
    if (e.verified) existing.verified++;
    else existing.pending++;
    clientMap.set(e.client_name, existing);
  }

  // Title
  const sumCols = 8;
  wsSummary.mergeCells(1, 1, 1, sumCols);
  const sumTitle = wsSummary.getRow(1).getCell(1);
  sumTitle.value = `TDS Reconciliation Summary${fy ? ` – ${fy}` : ""}`;
  sumTitle.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  sumTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  sumTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsSummary.getRow(1).height = 30;

  wsSummary.mergeCells(2, 1, 2, sumCols);
  const sumSub = wsSummary.getRow(2).getCell(1);
  sumSub.value = `Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} | Clients: ${clientMap.size} | Total Entries: ${entries.length}`;
  sumSub.font = { size: 10, italic: true };
  sumSub.alignment = { horizontal: "center" };

  const sumHeaders = ["Client Name", "Invoices", "Invoice Amount", "Amount Received", "TDS Deducted", "TDS %", "Verified", "Pending"];
  wsSummary.columns = [
    { width: 30 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 },
  ];
  const sumHdrRow = wsSummary.getRow(3);
  sumHdrRow.values = sumHeaders;
  styleHeader(sumHdrRow);
  wsSummary.views = [{ state: "frozen", ySplit: 3 }];

  let sumRowIdx = 4;
  let grandInv = 0, grandRec = 0, grandTds = 0;
  for (const [client, data] of clientMap) {
    const r = wsSummary.getRow(sumRowIdx);
    r.values = [
      client, data.count, fmtINR(data.invoiceAmt), fmtINR(data.received),
      fmtINR(data.tds), data.invoiceAmt > 0 ? ((data.tds / data.invoiceAmt) * 100).toFixed(2) + "%" : "-",
      data.verified, data.pending,
    ];
    r.getCell(3).numFmt = "₹#,##0";
    r.getCell(4).numFmt = "₹#,##0";
    r.getCell(5).numFmt = "₹#,##0";
    grandInv += data.invoiceAmt;
    grandRec += data.received;
    grandTds += data.tds;
    sumRowIdx++;
  }
  applyAlternateRows(wsSummary, 4, clientMap.size);

  // Grand total row
  const totalRow = wsSummary.getRow(sumRowIdx);
  totalRow.values = ["GRAND TOTAL", entries.length, fmtINR(grandInv), fmtINR(grandRec), fmtINR(grandTds), grandInv > 0 ? ((grandTds / grandInv) * 100).toFixed(2) + "%" : "-", "", ""];
  totalRow.font = { bold: true };
  totalRow.getCell(3).numFmt = "₹#,##0";
  totalRow.getCell(4).numFmt = "₹#,##0";
  totalRow.getCell(5).numFmt = "₹#,##0";
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    cell.border = { top: { style: "medium", color: { argb: "FF3B82F6" } }, bottom: { style: "medium", color: { argb: "FF3B82F6" } } };
  });

  // ===================== SHEET 2: TDS Detailed =====================
  const wsDetail = wb.addWorksheet("TDS Detailed");
  const detHeaders = [
    "Client Name", "Invoice No", "Invoice Date", "FY", "Quarter",
    "Invoice Amount", "Amount Received", "TDS Deducted", "TDS %", "Section",
    "Deduction Date", "Form 16A Received", "26AS Reflected", "Verified", "Status", "Remarks",
  ];
  const detWidths = [28, 20, 14, 14, 10, 16, 16, 16, 10, 12, 14, 16, 14, 12, 16, 30];

  wsDetail.mergeCells(1, 1, 1, detHeaders.length);
  const detTitle = wsDetail.getRow(1).getCell(1);
  detTitle.value = `TDS Detailed Report${fy ? ` – ${fy}` : ""}`;
  detTitle.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  detTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  detTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsDetail.getRow(1).height = 30;

  wsDetail.columns = detWidths.map((w) => ({ width: w }));
  const detHdrRow = wsDetail.getRow(2);
  detHdrRow.values = detHeaders;
  styleHeader(detHdrRow, "FF3B82F6");
  wsDetail.views = [{ state: "frozen", ySplit: 2 }];

  let detRowIdx = 3;
  for (const e of entries) {
    const r = wsDetail.getRow(detRowIdx);
    r.values = [
      e.client_name, e.invoice_id, fmtDate(e.invoice_date),
      e.financial_year, e.quarter,
      fmtINR(e.invoice_amount), fmtINR(e.amount_received), fmtINR(e.tds_amount),
      tdsPercent(e), e.tds_section || "-",
      fmtDate(e.deduction_date),
      e.form16a_received ? "Yes" : "No",
      e.reflected_in_26as ? "Yes" : "No",
      e.verified ? "Yes" : "No",
      deriveStatus(e),
      e.followup_notes || "",
    ];
    r.getCell(6).numFmt = "₹#,##0";
    r.getCell(7).numFmt = "₹#,##0";
    r.getCell(8).numFmt = "₹#,##0";
    r.alignment = { vertical: "middle" };
    detRowIdx++;
  }
  applyAlternateRows(wsDetail, 3, entries.length);

  // ===================== SHEET 3: Follow-up =====================
  const wsFollowup = wb.addWorksheet("Follow-up");
  const pending = entries.filter((e) => e.tds_amount > 0 && !e.verified);
  const fuHeaders = ["Client Name", "Invoice No", "FY / Quarter", "TDS Amount", "Status", "Form 16A", "26AS", "Certificate No", "Follow-up Notes"];
  const fuWidths = [28, 20, 14, 16, 14, 12, 12, 18, 40];

  wsFollowup.mergeCells(1, 1, 1, fuHeaders.length);
  const fuTitle = wsFollowup.getRow(1).getCell(1);
  fuTitle.value = `Pending TDS Follow-ups (${pending.length} items)`;
  fuTitle.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  fuTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
  fuTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsFollowup.getRow(1).height = 28;

  wsFollowup.columns = fuWidths.map((w) => ({ width: w }));
  const fuHdrRow = wsFollowup.getRow(2);
  fuHdrRow.values = fuHeaders;
  styleHeader(fuHdrRow, "FFF59E0B");
  fuHdrRow.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
  wsFollowup.views = [{ state: "frozen", ySplit: 2 }];

  let fuRowIdx = 3;
  for (const e of pending) {
    const r = wsFollowup.getRow(fuRowIdx);
    r.values = [
      e.client_name, e.invoice_id, `${e.financial_year} / ${e.quarter}`,
      fmtINR(e.tds_amount), deriveStatus(e),
      e.form16a_received ? "Yes" : "No", e.reflected_in_26as ? "Yes" : "No",
      e.tds_certificate_no || "-", e.followup_notes || "",
    ];
    r.getCell(4).numFmt = "₹#,##0";
    r.getCell(9).alignment = { wrapText: true };
    fuRowIdx++;
  }
  applyAlternateRows(wsFollowup, 3, pending.length);

  // ===================== SHEET 4: Quarter Summary =====================
  const wsQtr = wb.addWorksheet("Quarter Summary");
  const qtrMap = new Map<string, { invoiceAmt: number; received: number; tds: number; count: number; verified: number }>();
  for (const e of entries) {
    const key = `${e.financial_year}|${e.quarter}`;
    const ex = qtrMap.get(key) || { invoiceAmt: 0, received: 0, tds: 0, count: 0, verified: 0 };
    ex.invoiceAmt += e.invoice_amount;
    ex.received += e.amount_received;
    ex.tds += e.tds_amount;
    ex.count++;
    if (e.verified) ex.verified++;
    qtrMap.set(key, ex);
  }

  const qtrHeaders = ["Financial Year", "Quarter", "Invoices", "Invoice Amount", "Received", "TDS Deducted", "Verified Count", "Pending Count"];
  const qtrWidths = [16, 14, 12, 18, 18, 18, 14, 14];

  wsQtr.mergeCells(1, 1, 1, qtrHeaders.length);
  const qtrTitle = wsQtr.getRow(1).getCell(1);
  qtrTitle.value = `Quarter-wise TDS Summary${fy ? ` – ${fy}` : ""}`;
  qtrTitle.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  qtrTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
  qtrTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsQtr.getRow(1).height = 28;

  wsQtr.columns = qtrWidths.map((w) => ({ width: w }));
  const qtrHdrRow = wsQtr.getRow(2);
  qtrHdrRow.values = qtrHeaders;
  styleHeader(qtrHdrRow, "FF8B5CF6");
  wsQtr.views = [{ state: "frozen", ySplit: 2 }];

  let qtrRowIdx = 3;
  const sortedKeys = [...qtrMap.keys()].sort();
  for (const key of sortedKeys) {
    const [fyVal, qtr] = key.split("|");
    const data = qtrMap.get(key)!;
    const r = wsQtr.getRow(qtrRowIdx);
    r.values = [
      fyVal, qtr, data.count,
      fmtINR(data.invoiceAmt), fmtINR(data.received), fmtINR(data.tds),
      data.verified, data.count - data.verified,
    ];
    r.getCell(4).numFmt = "₹#,##0";
    r.getCell(5).numFmt = "₹#,##0";
    r.getCell(6).numFmt = "₹#,##0";
    qtrRowIdx++;
  }
  applyAlternateRows(wsQtr, 3, qtrMap.size);

  // ===================== Download =====================
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fyLabel = fy || "All";
  link.download = `TDS_Reconciliation_${fyLabel.replace(/\s+/g, "_")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
