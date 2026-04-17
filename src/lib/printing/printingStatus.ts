/**
 * Printing Status — central normalizer
 *
 * Fixes the case-sensitivity bug on /admin/operations/printing where the
 * DB stores values like "Assigned"/"Pending" but UI compared lowercase.
 *
 * This helper is local to the printing module and does not affect the
 * canonical campaign asset status pipeline in
 * src/lib/constants/campaignAssetStatus.ts.
 */

export type PrintingStatus =
  | "Pending"
  | "Assigned"
  | "In Printing"
  | "Printed"
  | "Delivered"
  | "Installed"
  | "Completed"
  | "Verified";

const ALIAS_MAP: Record<string, PrintingStatus> = {
  pending: "Pending",
  assigned: "Assigned",
  "in printing": "In Printing",
  in_printing: "In Printing",
  printing: "In Printing",
  printed: "Printed",
  delivered: "Delivered",
  installed: "Installed",
  mounted: "Installed",
  completed: "Completed",
  photouploaded: "Completed",
  photo_uploaded: "Completed",
  verified: "Verified",
};

export function normalizePrintingStatus(raw: unknown): PrintingStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "Pending";
  return ALIAS_MAP[s] ?? "Pending";
}

type Variant = "default" | "secondary" | "outline" | "destructive";

export function getPrintingStatusBadge(raw: unknown): {
  label: PrintingStatus;
  variant: Variant;
  className: string;
} {
  const label = normalizePrintingStatus(raw);
  switch (label) {
    case "Pending":
      return {
        label,
        variant: "outline",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "Assigned":
      return {
        label,
        variant: "secondary",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "In Printing":
      return {
        label,
        variant: "secondary",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "Printed":
      return {
        label,
        variant: "secondary",
        className: "bg-indigo-100 text-indigo-700 border-indigo-200",
      };
    case "Delivered":
      return {
        label,
        variant: "secondary",
        className: "bg-purple-100 text-purple-700 border-purple-200",
      };
    case "Installed":
    case "Completed":
    case "Verified":
      return {
        label,
        variant: "default",
        className: "bg-green-100 text-green-700 border-green-200",
      };
    default:
      return { label, variant: "outline", className: "" };
  }
}
