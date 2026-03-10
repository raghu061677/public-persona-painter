/**
 * Go-Ads 360° — Email Template Renderer
 * Safely replaces {{variable}} placeholders in subject and body.
 */

export interface EmailPayload {
  // Company
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  // Client
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  // Plan
  plan_name?: string;
  plan_code?: string;
  plan_status?: string;
  plan_total?: string;
  // Campaign
  campaign_name?: string;
  campaign_code?: string;
  campaign_status?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  campaign_duration_days?: string;
  // Asset
  asset_code?: string;
  asset_name?: string;
  asset_location?: string;
  asset_city?: string;
  asset_area?: string;
  media_type?: string;
  size?: string;
  booking_from?: string;
  booking_to?: string;
  // Operations
  assigned_to?: string;
  installation_date?: string;
  proof_uploaded_at?: string;
  proof_verified_at?: string;
  proof_link?: string;
  photo_count?: string;
  asset_status?: string;
  // Finance
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  invoice_total?: string;
  amount_due?: string;
  amount_paid?: string;
  balance_due?: string;
  payment_link?: string;
  // Links
  portal_link?: string;
  plan_link?: string;
  campaign_link?: string;
  invoice_link?: string;
  proof_gallery_link?: string;
  // Rich content
  asset_table_html?: string;
  asset_summary_html?: string;
  proof_table_html?: string;
  // Generic
  [key: string]: string | undefined;
}

/**
 * Replace all {{variable}} placeholders in a template string.
 * Missing variables are replaced with empty string to avoid broken templates.
 */
export function replaceVariables(template: string, payload: EmailPayload): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return payload[key] ?? '';
  });
}

/**
 * Render a full email from template + payload.
 */
export function renderTemplate(
  subjectTemplate: string,
  bodyTemplate: string,
  payload: EmailPayload
): { subject: string; body: string } {
  return {
    subject: replaceVariables(subjectTemplate, payload),
    body: replaceVariables(bodyTemplate, payload),
  };
}

/**
 * Generate sample preview data for template testing.
 */
export function getSamplePayload(): EmailPayload {
  return {
    company_name: 'Go-Ads 360°',
    company_email: 'info@go-ads.in',
    company_phone: '+91 9876543210',
    client_name: 'Rajesh Kumar',
    client_company: 'Matrix Network Solutions',
    client_email: 'rajesh@matrix-corp.com',
    client_phone: '+91 9876543210',
    plan_name: 'Q1 2026 – Hyderabad Bus Shelters',
    plan_code: 'PLAN-202603-0015',
    plan_status: 'Approved',
    plan_total: '₹4,50,000',
    campaign_name: 'Summer Brand Campaign 2026',
    campaign_code: 'CAM-202603-0011',
    campaign_status: 'Active',
    campaign_start_date: '01 Apr 2026',
    campaign_end_date: '30 Jun 2026',
    campaign_duration_days: '91',
    asset_code: 'HYD-BQS-0008',
    asset_name: 'Bus Shelter – Begumpet',
    asset_location: 'Begumpet Main Road',
    asset_city: 'Hyderabad',
    asset_area: 'Begumpet',
    media_type: 'Bus Shelter',
    size: '40x10 ft',
    booking_from: '01 Apr 2026',
    booking_to: '30 Jun 2026',
    assigned_to: 'Suresh (Mounter)',
    installation_date: '02 Apr 2026',
    proof_uploaded_at: '02 Apr 2026, 3:15 PM',
    proof_verified_at: '03 Apr 2026, 10:00 AM',
    proof_link: 'https://app.go-ads.in/portal/proofs/CAM-202603-0011',
    photo_count: '4',
    asset_status: 'Installed',
    invoice_number: 'INV-2026-0042',
    invoice_date: '01 Apr 2026',
    due_date: '15 Apr 2026',
    invoice_total: '₹4,50,000',
    amount_due: '₹4,50,000',
    amount_paid: '₹0',
    balance_due: '₹4,50,000',
    payment_link: 'https://app.go-ads.in/portal/pay/INV-2026-0042',
    portal_link: 'https://app.go-ads.in/portal',
    plan_link: 'https://app.go-ads.in/admin/plans/PLAN-202603-0015',
    campaign_link: 'https://app.go-ads.in/admin/campaigns/CAM-202603-0011',
    invoice_link: 'https://app.go-ads.in/portal/invoices/INV-2026-0042',
    proof_gallery_link: 'https://app.go-ads.in/portal/proofs/CAM-202603-0011',
    asset_table_html: '<table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Asset</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Location</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Type</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Status</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0;">HYD-BQS-0008</td><td style="padding:8px;border:1px solid #e2e8f0;">Begumpet Main Road</td><td style="padding:8px;border:1px solid #e2e8f0;">Bus Shelter</td><td style="padding:8px;border:1px solid #e2e8f0;">Installed</td></tr></table>',
    asset_summary_html: '<p>Total Assets: 5 | Installed: 3 | Pending: 2</p>',
    proof_table_html: '<p>4 proof photos uploaded and verified.</p>',
  };
}

/**
 * List of all supported template variables with descriptions.
 */
export const TEMPLATE_VARIABLES: Array<{ key: string; label: string; category: string }> = [
  // Company
  { key: 'company_name', label: 'Company Name', category: 'Company' },
  { key: 'company_email', label: 'Company Email', category: 'Company' },
  { key: 'company_phone', label: 'Company Phone', category: 'Company' },
  // Client
  { key: 'client_name', label: 'Client Contact Name', category: 'Client' },
  { key: 'client_company', label: 'Client Company Name', category: 'Client' },
  { key: 'client_email', label: 'Client Email', category: 'Client' },
  { key: 'client_phone', label: 'Client Phone', category: 'Client' },
  // Plan
  { key: 'plan_name', label: 'Plan Name', category: 'Plan' },
  { key: 'plan_code', label: 'Plan Code', category: 'Plan' },
  { key: 'plan_status', label: 'Plan Status', category: 'Plan' },
  { key: 'plan_total', label: 'Plan Total Amount', category: 'Plan' },
  // Campaign
  { key: 'campaign_name', label: 'Campaign Name', category: 'Campaign' },
  { key: 'campaign_code', label: 'Campaign Code', category: 'Campaign' },
  { key: 'campaign_status', label: 'Campaign Status', category: 'Campaign' },
  { key: 'campaign_start_date', label: 'Campaign Start Date', category: 'Campaign' },
  { key: 'campaign_end_date', label: 'Campaign End Date', category: 'Campaign' },
  { key: 'campaign_duration_days', label: 'Campaign Duration (days)', category: 'Campaign' },
  // Asset
  { key: 'asset_code', label: 'Asset Code', category: 'Asset' },
  { key: 'asset_name', label: 'Asset Name', category: 'Asset' },
  { key: 'asset_location', label: 'Asset Location', category: 'Asset' },
  { key: 'asset_city', label: 'Asset City', category: 'Asset' },
  { key: 'asset_area', label: 'Asset Area', category: 'Asset' },
  { key: 'media_type', label: 'Media Type', category: 'Asset' },
  { key: 'size', label: 'Size / Dimensions', category: 'Asset' },
  // Operations
  { key: 'assigned_to', label: 'Assigned Mounter', category: 'Operations' },
  { key: 'installation_date', label: 'Installation Date', category: 'Operations' },
  { key: 'proof_uploaded_at', label: 'Proof Upload Time', category: 'Operations' },
  { key: 'proof_verified_at', label: 'Proof Verification Time', category: 'Operations' },
  { key: 'proof_link', label: 'Proof Gallery Link', category: 'Operations' },
  { key: 'photo_count', label: 'Photo Count', category: 'Operations' },
  // Finance
  { key: 'invoice_number', label: 'Invoice Number', category: 'Finance' },
  { key: 'invoice_date', label: 'Invoice Date', category: 'Finance' },
  { key: 'due_date', label: 'Due Date', category: 'Finance' },
  { key: 'invoice_total', label: 'Invoice Total', category: 'Finance' },
  { key: 'amount_due', label: 'Amount Due', category: 'Finance' },
  { key: 'amount_paid', label: 'Amount Paid', category: 'Finance' },
  { key: 'balance_due', label: 'Balance Due', category: 'Finance' },
  { key: 'payment_link', label: 'Payment Link', category: 'Finance' },
  // Links
  { key: 'portal_link', label: 'Client Portal Link', category: 'Links' },
  { key: 'campaign_link', label: 'Campaign Link', category: 'Links' },
  { key: 'invoice_link', label: 'Invoice Link', category: 'Links' },
  // Rich
  { key: 'asset_table_html', label: 'Asset Details Table (HTML)', category: 'Rich Content' },
  { key: 'asset_summary_html', label: 'Asset Summary (HTML)', category: 'Rich Content' },
  { key: 'proof_table_html', label: 'Proof Summary (HTML)', category: 'Rich Content' },
];
