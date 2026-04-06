import ExcelJS from "exceljs";
import { LedgerEntry, LedgerSummary, OutstandingRow } from "@/hooks/useClientLedger";
import { formatDate } from "@/utils/plans";

export async function exportClientLedgerExcel(
  entries: LedgerEntry[],
  summary: LedgerSummary,
  outstanding: OutstandingRow[],
  client?: { name: string; gstin?: string | null } | null
) {
  const wb = new ExcelJS.Workbook();
  const clientName = client?.name || "Client";

  // --- Ledger Sheet ---
  const ws = wb.addWorksheet("Client Ledger");
  ws.addRow([`${clientName} — Receivable Ledger`]).font = { bold: true, size: 14 };
  if (client?.gstin) ws.addRow([`GSTIN: ${client.gstin}`]);
  ws.addRow([`Generated: ${new Date().toLocaleDateString("en-IN")}`]);
  ws.addRow([]);

  // Summary
  ws.addRow(["Summary"]).font = { bold: true, size: 12 };
  ws.addRow(["Total Invoiced", summary.totalInvoiced]);
  ws.addRow(["Total Received", summary.totalReceived]);
  ws.addRow(["Total TDS", summary.totalTds]);
  ws.addRow(["Total Credits", summary.totalCredits]);
  ws.addRow(["Net Outstanding", summary.netOutstanding]).font = { bold: true };
  ws.addRow([]);

  // Ledger table
  const headerRow = ws.addRow(["Date", "Type", "Ref No", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)", "Status"]);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; });

  for (const e of entries) {
    ws.addRow([
      formatDate(e.date),
      e.type === "invoice" ? "Invoice" : e.type === "payment" ? "Payment" : e.type === "tds" ? "TDS" : "Credit Note",
      e.refNo,
      e.description,
      e.debit || "",
      e.credit || "",
      e.runningBalance,
      e.status,
    ]);
  }

  // Auto-width
  ws.columns.forEach(col => { col.width = 18; });
  ws.getColumn(4).width = 40;

  // Currency format
  const fmtINR = '#,##0';
  for (let r = headerRow.number + 1; r <= ws.rowCount; r++) {
    [5, 6, 7].forEach(c => { ws.getCell(r, c).numFmt = fmtINR; });
  }

  // --- Outstanding Sheet ---
  if (outstanding.length > 0) {
    const os = wb.addWorksheet("Outstanding");
    os.addRow([`${clientName} — Outstanding Invoices`]).font = { bold: true, size: 14 };
    os.addRow([]);
    const oh = os.addRow(["Invoice No", "Invoice Date", "Due Date", "Total", "Paid", "Credits", "Balance Due", "Overdue Days", "Status"]);
    oh.font = { bold: true };
    oh.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; });

    for (const o of outstanding) {
      os.addRow([o.invoiceNo, formatDate(o.invoiceDate), formatDate(o.dueDate), o.totalAmount, o.paidAmount, o.creditAmount, o.balanceDue, o.overdueDays, o.status]);
    }
    os.columns.forEach(col => { col.width = 16; });
    for (let r = oh.number + 1; r <= os.rowCount; r++) {
      [4, 5, 6, 7].forEach(c => { os.getCell(r, c).numFmt = fmtINR; });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clientName.replace(/\s+/g, "_")}_Ledger.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
