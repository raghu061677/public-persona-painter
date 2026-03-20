/**
 * Core entity validation schemas using Zod.
 * Used for form validation, API input gating, and data integrity checks.
 */

import { z } from "zod";

// ── Payment Confirmation ──
export const paymentConfirmationSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  invoice_id: z.string().nullable().optional(),
  claimed_amount: z.number().min(0.01, "Amount must be positive"),
  claimed_method: z.string().min(1, "Payment method is required").optional().or(z.literal("")),
  claimed_reference: z.string().max(200).optional().or(z.literal("")),
  claimed_date: z.string().min(1, "Payment date is required").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

// ── Payment Approval ──
export const paymentApprovalSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  method: z.string().min(1, "Payment method is required"),
  reference: z.string().max(200).optional().or(z.literal("")),
  paymentDate: z.string().min(1, "Payment date is required"),
  invoice_id: z.string().min(1, "Invoice is required"),
});

// ── Invoice Create ──
export const invoiceCreateSchema = z.object({
  campaign_id: z.string().min(1, "Campaign is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
}).refine(data => {
  if (data.invoice_date && data.due_date) {
    return new Date(data.due_date) >= new Date(data.invoice_date);
  }
  return true;
}, { message: "Due date must be on or after invoice date", path: ["due_date"] });

// ── Invoice (full) ──
export const invoiceSchema = z.object({
  campaign_id: z.string().min(1, "Campaign is required").optional().or(z.literal("")),
  client_id: z.string().min(1, "Client is required").optional().or(z.literal("")),
  client_name: z.string().min(1, "Client name is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  subtotal: z.number().min(0, "Subtotal must be non-negative"),
  tax_amount: z.number().min(0, "Tax must be non-negative"),
  total_amount: z.number().min(0, "Total must be non-negative"),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Partially Paid"]).default("Draft"),
  notes: z.string().max(2000).optional().or(z.literal("")),
}).refine(data => {
  if (data.invoice_date && data.due_date) {
    return new Date(data.due_date) >= new Date(data.invoice_date);
  }
  return true;
}, { message: "Due date must be on or after invoice date", path: ["due_date"] });

// ── Campaign Create/Edit ──
export const campaignEntitySchema = z.object({
  name: z.string().trim().min(3, "Campaign name must be at least 3 characters").max(200),
  client_id: z.string().min(1, "Client is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["Draft", "Upcoming", "Running", "Completed", "Cancelled", "Archived", "Planned"]).default("Draft"),
  notes: z.string().max(2000).optional().or(z.literal("")),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, { message: "End date must be on or after start date", path: ["end_date"] });

// ── Campaign Asset ──
export const campaignAssetSchema = z.object({
  campaign_id: z.string().min(1, "Campaign is required"),
  asset_id: z.string().min(1, "Asset is required"),
  card_rate: z.number().min(0, "Card rate must be non-negative"),
  negotiated_rate: z.number().min(0, "Negotiated rate must be non-negative").nullable().optional(),
  printing_cost: z.number().min(0, "Printing cost must be non-negative").default(0),
  mounting_cost: z.number().min(0, "Mounting cost must be non-negative").default(0),
  booking_start_date: z.string().min(1, "Booking start is required"),
  booking_end_date: z.string().min(1, "Booking end is required"),
}).refine(data => {
  if (data.booking_start_date && data.booking_end_date) {
    return new Date(data.booking_end_date) >= new Date(data.booking_start_date);
  }
  return true;
}, { message: "Booking end must be on or after start", path: ["booking_end_date"] });

// ── Media Asset ──
export const mediaAssetEntitySchema = z.object({
  location: z.string().trim().min(3, "Location must be at least 3 characters").max(500),
  area: z.string().trim().min(2, "Area must be at least 2 characters").max(200),
  city: z.string().trim().min(2, "City is required").max(100),
  media_type: z.string().trim().min(2, "Media type is required").max(100),
  dimensions: z.string().trim().min(3, "Dimensions are required").max(50),
  card_rate: z.number().min(0, "Card rate must be non-negative"),
  base_rate: z.number().min(0, "Base rate must be non-negative").optional(),
  status: z.enum(["Available", "Booked", "Blocked", "Under Maintenance", "Expired"]).default("Available"),
});

// ── Reexport existing schemas ──
export { clientSchema } from "@/lib/validations";

export type PaymentConfirmationFormData = z.infer<typeof paymentConfirmationSchema>;
export type PaymentApprovalFormData = z.infer<typeof paymentApprovalSchema>;
export type InvoiceCreateFormData = z.infer<typeof invoiceCreateSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type CampaignEntityFormData = z.infer<typeof campaignEntitySchema>;
export type CampaignAssetFormData = z.infer<typeof campaignAssetSchema>;
export type MediaAssetEntityFormData = z.infer<typeof mediaAssetEntitySchema>;
