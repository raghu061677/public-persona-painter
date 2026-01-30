// Enterprise Expenses Module Types
// Using string types for flexibility with Supabase

export type GstType = 'None' | 'IGST' | 'CGST_SGST';
export type PaymentMode = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Card';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Pending';
export type ApprovalStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
export type AllocationType = 'General' | 'Campaign' | 'Plan' | 'Asset';
export type CostCenterType = 'Branch' | 'City' | 'Region' | 'Department' | 'Project';

export interface ExpenseCategory {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  default_gst_type: string;
  default_gst_percent: number;
  default_tds_percent: number;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  type: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_no: string | null;
  expense_date: string;
  company_id: string | null;
  vendor_id: string | null;
  vendor_name: string;
  vendor_gstin: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  payment_mode: string;
  payment_status: string;
  paid_date: string | null;
  amount: number;
  amount_before_tax: number;
  gst_percent: number;
  gst_type_enum: string;
  cgst: number;
  sgst: number;
  igst: number;
  gst_amount: number;
  total_tax: number;
  total_amount: number;
  tds_applicable: boolean;
  tds_percent: number;
  tds_amount: number;
  net_payable: number;
  category: string;
  category_id: string | null;
  subcategory: string | null;
  notes: string | null;
  cost_center_id: string | null;
  allocation_type: string;
  campaign_id: string | null;
  plan_id: string | null;
  asset_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approval_status: string;
  rejected_reason: string | null;
  attachments_count: number;
  tags: string[] | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  expense_categories?: { id: string; name: string; color: string } | null;
  cost_centers?: { id: string; name: string; code: string | null } | null;
  campaigns?: { id: string; campaign_name: string; client_name: string } | null;
  plans?: { id: string; name: string; client_name: string } | null;
  media_assets?: { id: string; media_asset_code: string; location: string } | null;
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ExpenseApprovalLog {
  id: string;
  expense_id: string;
  action: string;
  from_status: string | null;
  to_status: string;
  user_id: string | null;
  user_name: string | null;
  remarks: string | null;
  created_at: string;
}

export interface ExpenseBudget {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  cost_center_id: string | null;
  category_id: string | null;
  budget_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  cost_centers?: CostCenter;
  expense_categories?: ExpenseCategory;
}

export interface ExpenseFilters {
  dateRange: { from: Date | null; to: Date | null };
  category_id: string | null;
  cost_center_id: string | null;
  vendor_id: string | null;
  allocation_type: string | null;
  approval_status: string | null;
  payment_status: string | null;
  search: string;
}

export interface ExpenseFormData {
  expense_date: Date;
  vendor_id: string | null;
  vendor_name: string;
  vendor_gstin: string;
  invoice_no: string;
  invoice_date: Date | null;
  payment_mode: string;
  payment_status: string;
  paid_date: Date | null;
  amount_before_tax: number;
  gst_type_enum: string;
  cgst: number;
  sgst: number;
  igst: number;
  tds_applicable: boolean;
  tds_percent: number;
  category_id: string | null;
  category: string;
  subcategory: string;
  notes: string;
  cost_center_id: string | null;
  allocation_type: string;
  campaign_id: string | null;
  plan_id: string | null;
  asset_id: string | null;
  tags: string[];
}

export interface ExpenseStats {
  total_expenses: number;
  unpaid_amount: number;
  paid_amount: number;
  gst_total: number;
  tds_total: number;
  top_category: string | null;
  top_category_amount: number;
  count: number;
}
