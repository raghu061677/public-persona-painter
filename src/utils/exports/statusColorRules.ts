import type { RowStyleRule } from "./excel/exportListExcel";
import type { PdfRowStyleRule } from "./pdf/exportListPdf";

// ============= Vacant Media =============
export const vacantMediaExcelRules: RowStyleRule[] = [
  { when: (r) => r.availability_status === "VACANT_NOW", fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.availability_status === "AVAILABLE_SOON", fill: { argb: "FFFFF3E0" } },
];
export const vacantMediaPdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.availability_status === "VACANT_NOW", fillColor: [232, 245, 233] },
  { when: (r) => r.availability_status === "AVAILABLE_SOON", fillColor: [255, 243, 224] },
];

// ============= Invoices =============
export const invoiceExcelRules: RowStyleRule[] = [
  { when: (r) => r.status === "paid" || r.status === "Paid", fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.status === "partial" || r.status === "Partial", fill: { argb: "FFFFF3E0" } },
  { when: (r) => r.status === "overdue" || r.status === "Overdue", fill: { argb: "FFFEE2E2" } },
  { when: (r) => r.status === "draft" || r.status === "Draft", fill: { argb: "FFF3F4F6" } },
];
export const invoicePdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.status === "paid" || r.status === "Paid", fillColor: [232, 245, 233] },
  { when: (r) => r.status === "partial" || r.status === "Partial", fillColor: [255, 243, 224] },
  { when: (r) => r.status === "overdue" || r.status === "Overdue", fillColor: [254, 226, 226] },
  { when: (r) => r.status === "draft" || r.status === "Draft", fillColor: [243, 244, 246] },
];

// ============= Expenses =============
export const expenseExcelRules: RowStyleRule[] = [
  { when: (r) => r.payment_status === "paid" || r.payment_status === "Paid", fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.payment_status === "pending" || r.payment_status === "Pending", fill: { argb: "FFFFF3E0" } },
];
export const expensePdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.payment_status === "paid" || r.payment_status === "Paid", fillColor: [232, 245, 233] },
  { when: (r) => r.payment_status === "pending" || r.payment_status === "Pending", fillColor: [255, 243, 224] },
];

// ============= Campaigns =============
export const campaignExcelRules: RowStyleRule[] = [
  { when: (r) => r.status === "running" || r.status === "Running", fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.status === "upcoming" || r.status === "Upcoming" || r.status === "planned" || r.status === "Planned", fill: { argb: "FFFFF3E0" } },
  { when: (r) => r.status === "completed" || r.status === "Completed", fill: { argb: "FFF3F4F6" } },
];
export const campaignPdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.status === "running" || r.status === "Running", fillColor: [232, 245, 233] },
  { when: (r) => r.status === "upcoming" || r.status === "Upcoming" || r.status === "planned" || r.status === "Planned", fillColor: [255, 243, 224] },
  { when: (r) => r.status === "completed" || r.status === "Completed", fillColor: [243, 244, 246] },
];

// ============= Plans =============
export const planExcelRules: RowStyleRule[] = [
  { when: (r) => r.status === "approved" || r.status === "Approved", fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.status === "sent" || r.status === "Sent", fill: { argb: "FFFFF3E0" } },
  { when: (r) => r.status === "draft" || r.status === "Draft", fill: { argb: "FFF3F4F6" } },
  { when: (r) => r.status === "rejected" || r.status === "Rejected", fill: { argb: "FFFEE2E2" } },
];
export const planPdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.status === "approved" || r.status === "Approved", fillColor: [232, 245, 233] },
  { when: (r) => r.status === "sent" || r.status === "Sent", fillColor: [255, 243, 224] },
  { when: (r) => r.status === "draft" || r.status === "Draft", fillColor: [243, 244, 246] },
  { when: (r) => r.status === "rejected" || r.status === "Rejected", fillColor: [254, 226, 226] },
];

// ============= Power Bills =============
export const powerBillExcelRules: RowStyleRule[] = [
  { when: (r) => r.payment_status === "paid" || r.payment_status === "Paid" || r.paid === true, fill: { argb: "FFE8F5E9" } },
  { when: (r) => r.payment_status === "overdue" || r.payment_status === "Overdue", fill: { argb: "FFFEE2E2" } },
  { when: (r) => r.payment_status === "pending" || r.payment_status === "Pending", fill: { argb: "FFFFF3E0" } },
];
export const powerBillPdfRules: PdfRowStyleRule[] = [
  { when: (r) => r.payment_status === "paid" || r.payment_status === "Paid" || r.paid === true, fillColor: [232, 245, 233] },
  { when: (r) => r.payment_status === "overdue" || r.payment_status === "Overdue", fillColor: [254, 226, 226] },
  { when: (r) => r.payment_status === "pending" || r.payment_status === "Pending", fillColor: [255, 243, 224] },
];
