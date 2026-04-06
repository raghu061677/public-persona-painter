import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LedgerEntry, LedgerSummary, OutstandingRow } from "@/hooks/useClientLedger";
import { formatDate } from "@/utils/plans";
import { formatINR } from "@/utils/finance";

export function exportClientLedgerPdf(
  entries: LedgerEntry[],
  summary: LedgerSummary,
  outstanding: OutstandingRow[],
  client?: { name: string; gstin?: string | null } | null,
  company?: { name?: string } | null
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const clientName = client?.name || "Client";
  const companyName = company?.name || "Go-Ads";

  // Header
  doc.setFontSize(16);
  doc.text(`${clientName} — Receivable Ledger`, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Prepared by: ${companyName}`, 14, 22);
  if (client?.gstin) doc.text(`GSTIN: ${client.gstin}`, 14, 27);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, client?.gstin ? 32 : 27);

  // Summary box
  const summaryY = client?.gstin ? 38 : 33;
  doc.setFontSize(10);
  doc.setTextColor(0);
  const summaryData = [
    ["Total Invoiced", formatINR(summary.totalInvoiced)],
    ["Total Received", formatINR(summary.totalReceived)],
    ["Total TDS", formatINR(summary.totalTds)],
    ["Total Credits", formatINR(summary.totalCredits)],
    ["Net Outstanding", formatINR(summary.netOutstanding)],
  ];
  autoTable(doc, {
    startY: summaryY,
    head: [["Metric", "Amount"]],
    body: summaryData,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    tableWidth: 80,
  });

  // Ledger table
  const ledgerStartY = (doc as any).lastAutoTable?.finalY + 6 || summaryY + 40;
  const typeLabel = (t: string) => t === "invoice" ? "Invoice" : t === "payment" ? "Payment" : t === "tds" ? "TDS" : "Credit Note";

  autoTable(doc, {
    startY: ledgerStartY,
    head: [["Date", "Type", "Ref No", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)", "Status"]],
    body: entries.map(e => [
      formatDate(e.date),
      typeLabel(e.type),
      e.refNo,
      e.description,
      e.debit > 0 ? formatINR(e.debit) : "",
      e.credit > 0 ? formatINR(e.credit) : "",
      formatINR(e.runningBalance),
      e.status,
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: {
      3: { cellWidth: 60 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
  });

  // Outstanding on new page if present
  if (outstanding.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`${clientName} — Outstanding Invoices`, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Invoice No", "Date", "Due Date", "Total", "Paid", "Credits", "Balance", "Overdue", "Status"]],
      body: outstanding.map(o => [
        o.invoiceNo,
        formatDate(o.invoiceDate),
        formatDate(o.dueDate),
        formatINR(o.totalAmount),
        formatINR(o.paidAmount),
        o.creditAmount > 0 ? formatINR(o.creditAmount) : "—",
        formatINR(o.balanceDue),
        o.overdueDays > 0 ? `${o.overdueDays}d` : "—",
        o.status,
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right", fontStyle: "bold" } },
    });
  }

  doc.save(`${clientName.replace(/\s+/g, "_")}_Ledger.pdf`);
}
