import { format, differenceInDays } from "date-fns";
import { formatINR } from "@/utils/finance";

export type TemplateType =
  | "due_reminder"
  | "overdue_reminder"
  | "final_reminder"
  | "promise_broken"
  | "tds_certificate"
  | "ledger_share";

export interface TemplateVars {
  client_name: string;
  invoice_no: string;
  invoice_date?: string;
  due_date?: string;
  balance_due: number;
  overdue_days: number;
  company_name?: string;
  campaign_name?: string;
  campaign_duration?: string;
  top_items?: string;
}

interface InvoiceItem {
  location?: string;
  description?: string;
  dimensions?: string;
  size?: string;
  booking_unit?: string;
  quantity?: number;
  unit_price?: number;
  rate?: number;
  subtotal?: number;
  total_amount?: number;
  amount?: number;
}

export function formatTopItems(items: InvoiceItem[], max = 3): string {
  if (!items || items.length === 0) return "";

  const lines = items.slice(0, max).map((item) => {
    const loc = item.location || item.description || "Media Location";
    const dim = item.dimensions || item.size || "";
    const unit = item.booking_unit || `${item.quantity || 1} unit(s)`;
    const rate = item.unit_price || item.rate || 0;
    const total = item.subtotal || item.total_amount || item.amount || 0;
    const parts = [loc];
    if (dim) parts.push(dim);
    parts.push(`${unit} @ ${formatINR(rate)} = ${formatINR(total)}`);
    return `• ${parts.join(" – ")}`;
  });

  if (items.length > max) {
    lines.push(`(and ${items.length - max} more locations…)`);
  }
  return lines.join("\n");
}

export function formatCampaignDuration(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";
  try {
    return `${format(new Date(startDate), "dd MMM")} – ${format(new Date(endDate), "dd MMM yyyy")}`;
  } catch {
    return "";
  }
}

export function autoSelectTemplate(overdueDays: number, promiseBroken: boolean): TemplateType {
  if (promiseBroken) return "promise_broken";
  if (overdueDays > 15) return "final_reminder";
  if (overdueDays > 0) return "overdue_reminder";
  return "due_reminder";
}

const templates: Record<TemplateType, { label: string; subject: string; body: string }> = {
  due_reminder: {
    label: "Due Reminder (Polite)",
    subject: "Payment Reminder – {{invoice_no}}",
    body: `Dear {{client_name}},

This is a gentle reminder regarding the payment for your {{campaign_section}}

Invoice: {{invoice_no}}
Amount Due: {{balance_due}}
Due Date: {{due_date}}
{{items_section}}
Kindly arrange the payment at the earliest convenience.

Regards,
{{company_name}}`,
  },
  overdue_reminder: {
    label: "Overdue Reminder",
    subject: "Overdue Payment – {{invoice_no}}",
    body: `Dear {{client_name}},

Your payment is overdue by {{overdue_days}} days for {{campaign_section}}

Invoice: {{invoice_no}}
Amount Due: {{balance_due}}
Due Date: {{due_date}} ({{overdue_days}} days overdue)
{{items_section}}
We request immediate attention to this matter.

Regards,
{{company_name}}`,
  },
  final_reminder: {
    label: "Final Reminder",
    subject: "URGENT: Final Payment Reminder – {{invoice_no}}",
    body: `Dear {{client_name}},

This is a final reminder. Your payment has been overdue for {{overdue_days}} days.

Invoice: {{invoice_no}}
Amount Due: {{balance_due}}
Due Date: {{due_date}} ({{overdue_days}} days overdue)
{{campaign_section_line}}{{items_section}}
Kindly settle the outstanding amount immediately to avoid further action.

Regards,
{{company_name}}`,
  },
  promise_broken: {
    label: "Promise Broken Follow-up",
    subject: "Follow-up: Promised Payment Pending – {{invoice_no}}",
    body: `Dear {{client_name}},

We note that the payment promised earlier has not been received yet.

Invoice: {{invoice_no}}
Amount Due: {{balance_due}}
Due Date: {{due_date}}
{{campaign_section_line}}{{items_section}}
We kindly request you to arrange the payment at the earliest.

Regards,
{{company_name}}`,
  },
  tds_certificate: {
    label: "TDS Certificate Reminder",
    subject: "Request for TDS Certificate – {{invoice_no}}",
    body: `Dear {{client_name}},

We would like to request Form 16A / TDS Certificate for the TDS deducted on:

Invoice: {{invoice_no}}
{{campaign_section_line}}
Kindly share the certificate at your earliest convenience for our tax compliance records.

Regards,
{{company_name}}`,
  },
  ledger_share: {
    label: "Ledger / Statement",
    subject: "Account Statement – {{client_name}}",
    body: `Dear {{client_name}},

Please find below the outstanding summary for your account:

Invoice: {{invoice_no}}
Amount Due: {{balance_due}}
{{campaign_section_line}}{{items_section}}
We request you to review and confirm. For any discrepancy, please reach out.

Regards,
{{company_name}}`,
  },
};

export function getTemplateList() {
  return Object.entries(templates).map(([key, val]) => ({
    value: key as TemplateType,
    label: val.label,
  }));
}

export function renderTemplate(type: TemplateType, vars: TemplateVars): { subject: string; body: string } {
  const tmpl = templates[type];
  if (!tmpl) return { subject: "", body: "" };

  const campaignLine = vars.campaign_name
    ? `campaign "${vars.campaign_name}"${vars.campaign_duration ? ` (${vars.campaign_duration})` : ""}`
    : "your services";

  const campaignSection = vars.campaign_name
    ? `campaign "${vars.campaign_name}"${vars.campaign_duration ? ` (${vars.campaign_duration})` : ""}.\n`
    : "your services.\n";

  const campaignSectionLine = vars.campaign_name
    ? `Campaign: ${vars.campaign_name}${vars.campaign_duration ? ` (${vars.campaign_duration})` : ""}\n`
    : "";

  const itemsSection = vars.top_items
    ? `\nMedia Details:\n${vars.top_items}\n`
    : "";

  const replacements: Record<string, string> = {
    "{{client_name}}": vars.client_name || "Sir/Madam",
    "{{invoice_no}}": vars.invoice_no || "",
    "{{invoice_date}}": vars.invoice_date || "",
    "{{due_date}}": vars.due_date ? format(new Date(vars.due_date), "dd MMM yyyy") : "—",
    "{{balance_due}}": formatINR(vars.balance_due),
    "{{overdue_days}}": String(vars.overdue_days || 0),
    "{{company_name}}": vars.company_name || "Go-Ads",
    "{{campaign_name}}": vars.campaign_name || "",
    "{{campaign_duration}}": vars.campaign_duration || "",
    "{{campaign_section}}": campaignSection,
    "{{campaign_section_line}}": campaignSectionLine,
    "{{items_section}}": itemsSection,
    "{{top_items}}": vars.top_items || "",
  };

  let subject = tmpl.subject;
  let body = tmpl.body;
  for (const [k, v] of Object.entries(replacements)) {
    subject = subject.split(k).join(v);
    body = body.split(k).join(v);
  }

  return { subject, body };
}
