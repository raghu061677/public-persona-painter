import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import type { 
  Expense, 
  ExpenseCategory, 
  CostCenter, 
  ExpenseFilters,
  ExpenseStats,
  ExpenseFormData
} from '@/types/expenses';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const defaultFilters: ExpenseFilters = {
  dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  category_id: null,
  cost_center_id: null,
  vendor_id: null,
  allocation_type: null,
  approval_status: null,
  payment_status: null,
  search: '',
};

export function useExpenses() {
  const { company } = useCompany();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExpenseFilters>(defaultFilters);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    unpaid_amount: 0,
    paid_amount: 0,
    gst_total: 0,
    tds_total: 0,
    top_category: null,
    top_category_amount: 0,
    count: 0,
  });

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories((data || []) as ExpenseCategory[]);
    }
  }, []);

  const fetchCostCenters = useCallback(async () => {
    if (!company?.id) return;
    
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching cost centers:', error);
    } else {
      setCostCenters((data || []) as CostCenter[]);
    }
  }, [company?.id]);

  const fetchExpenses = useCallback(async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_categories:category_id(id, name, color),
          cost_centers:cost_center_id(id, name, code)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.dateRange.from) {
        query = query.gte('expense_date', format(filters.dateRange.from, 'yyyy-MM-dd'));
      }
      if (filters.dateRange.to) {
        query = query.lte('expense_date', format(filters.dateRange.to, 'yyyy-MM-dd'));
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.cost_center_id) {
        query = query.eq('cost_center_id', filters.cost_center_id);
      }
      if (filters.allocation_type) {
        query = query.eq('allocation_type', filters.allocation_type);
      }
      if (filters.approval_status) {
        query = query.eq('approval_status', filters.approval_status);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.search) {
        query = query.or(`expense_no.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,invoice_no.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map data to Expense type
      const expenseData = (data || []).map((expense: any) => ({
        ...expense,
        campaigns: null,
        plans: null,
        media_assets: null,
      } as Expense));

      setExpenses(expenseData);
      calculateStats(expenseData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, filters]);

  const calculateStats = (data: Expense[]) => {
    const total_expenses = data.reduce((sum, e) => sum + (e.total_amount || 0), 0);
    const unpaid_amount = data
      .filter(e => e.payment_status !== 'Paid')
      .reduce((sum, e) => sum + (e.net_payable || e.total_amount || 0), 0);
    const paid_amount = data
      .filter(e => e.payment_status === 'Paid')
      .reduce((sum, e) => sum + (e.total_amount || 0), 0);
    const gst_total = data.reduce((sum, e) => sum + (e.total_tax || e.gst_amount || 0), 0);
    const tds_total = data.reduce((sum, e) => sum + (e.tds_amount || 0), 0);

    // Find top category
    const categoryTotals: Record<string, number> = {};
    data.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.total_amount || 0);
    });
    
    let top_category: string | null = null;
    let top_category_amount = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (amount > top_category_amount) {
        top_category = cat;
        top_category_amount = amount;
      }
    });

    setStats({
      total_expenses,
      unpaid_amount,
      paid_amount,
      gst_total,
      tds_total,
      top_category,
      top_category_amount,
      count: data.length,
    });
  };

  const generateExpenseNo = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_expense_no', { 
      p_company_id: company?.id 
    });
    
    if (error) {
      console.error('Error generating expense no:', error);
      // Fallback
      const fy = new Date().getMonth() >= 3 
        ? `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`
        : `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`;
      return `EXP-${fy}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    }
    return data;
  };

  const createExpense = async (formData: ExpenseFormData): Promise<string | null> => {
    if (!company?.id) return null;

    try {
      const expense_no = await generateExpenseNo();
      const { data: user } = await supabase.auth.getUser();
      
      // Calculate totals
      const total_tax = (formData.cgst || 0) + (formData.sgst || 0) + (formData.igst || 0);
      const total_amount = formData.amount_before_tax + total_tax;
      const tds_amount = formData.tds_applicable 
        ? total_amount * (formData.tds_percent || 0) / 100 
        : 0;
      const net_payable = total_amount - tds_amount;

      const insertData = {
        id: expense_no,
        expense_no,
        expense_date: format(formData.expense_date, 'yyyy-MM-dd'),
        company_id: company.id,
        vendor_name: formData.vendor_name,
        vendor_gstin: formData.vendor_gstin,
        invoice_no: formData.invoice_no,
        invoice_date: formData.invoice_date ? format(formData.invoice_date, 'yyyy-MM-dd') : null,
        payment_mode: formData.payment_mode,
        payment_status: formData.payment_status as 'Paid' | 'Pending',
        paid_date: formData.paid_date ? format(formData.paid_date, 'yyyy-MM-dd') : null,
        amount: formData.amount_before_tax,
        amount_before_tax: formData.amount_before_tax,
        gst_type_enum: formData.gst_type_enum,
        gst_percent: formData.gst_type_enum === 'None' ? 0 : 18,
        cgst: formData.cgst,
        sgst: formData.sgst,
        igst: formData.igst,
        gst_amount: total_tax,
        total_tax,
        total_amount,
        tds_applicable: formData.tds_applicable,
        tds_percent: formData.tds_percent,
        tds_amount,
        net_payable,
        category: formData.category,
        category_id: formData.category_id,
        subcategory: formData.subcategory,
        notes: formData.notes,
        cost_center_id: formData.cost_center_id,
        allocation_type: formData.allocation_type,
        campaign_id: formData.campaign_id,
        plan_id: formData.plan_id,
        asset_id: formData.asset_id,
        tags: formData.tags,
        created_by: user?.user?.id,
        approval_status: 'Draft',
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Expense created successfully' });
      fetchExpenses();
      return data?.id || null;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create expense',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateExpense = async (id: string, formData: Partial<ExpenseFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = {};
      
      if (formData.expense_date) {
        updateData.expense_date = format(formData.expense_date, 'yyyy-MM-dd');
      }
      if (formData.invoice_date) {
        updateData.invoice_date = format(formData.invoice_date, 'yyyy-MM-dd');
      }
      if (formData.paid_date) {
        updateData.paid_date = format(formData.paid_date, 'yyyy-MM-dd');
      }
      
      // Copy other fields
      const copyFields = [
        'vendor_id', 'vendor_name', 'vendor_gstin', 'invoice_no',
        'payment_mode', 'payment_status', 'gst_type_enum', 
        'tds_applicable', 'tds_percent', 'category', 'category_id',
        'subcategory', 'notes', 'cost_center_id', 'allocation_type',
        'campaign_id', 'plan_id', 'asset_id', 'tags'
      ];
      
      copyFields.forEach(field => {
        if (formData[field as keyof ExpenseFormData] !== undefined) {
          updateData[field] = formData[field as keyof ExpenseFormData];
        }
      });

      // Recalculate totals if amounts changed
      if (formData.amount_before_tax !== undefined) {
        const cgst = formData.cgst || 0;
        const sgst = formData.sgst || 0;
        const igst = formData.igst || 0;
        const total_tax = cgst + sgst + igst;
        const total_amount = formData.amount_before_tax + total_tax;
        
        updateData.amount = formData.amount_before_tax;
        updateData.amount_before_tax = formData.amount_before_tax;
        updateData.cgst = cgst;
        updateData.sgst = sgst;
        updateData.igst = igst;
        updateData.total_tax = total_tax;
        updateData.gst_amount = total_tax;
        updateData.total_amount = total_amount;
        
        const tds_amount = formData.tds_applicable 
          ? total_amount * (formData.tds_percent || 0) / 100 
          : 0;
        updateData.tds_amount = tds_amount;
        updateData.net_payable = total_amount - tds_amount;
      }

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Expense updated successfully' });
      fetchExpenses();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateApprovalStatus = async (
    id: string, 
    newStatus: string, 
    remarks?: string
  ): Promise<boolean> => {
    try {
      const { data: expense } = await supabase
        .from('expenses')
        .select('approval_status')
        .eq('id', id)
        .single();

      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.user?.id)
        .single();

      // Update expense status
      const updateData: Record<string, any> = { 
        approval_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'Approved') {
        updateData.approved_by = user?.user?.id;
      }
      if (newStatus === 'Rejected' && remarks) {
        updateData.rejected_reason = remarks;
      }

      const { error: updateError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Log the approval action
      await supabase.from('expense_approvals_log').insert({
        expense_id: id,
        action: newStatus === 'Approved' ? 'APPROVED' : 
                newStatus === 'Rejected' ? 'REJECTED' : 
                newStatus === 'Submitted' ? 'SUBMITTED' : 
                newStatus === 'Paid' ? 'MARKED_PAID' : 'STATUS_CHANGE',
        from_status: expense?.approval_status,
        to_status: newStatus,
        user_id: user?.user?.id,
        user_name: profile?.username || 'Unknown',
        remarks,
      });

      toast({ 
        title: 'Success', 
        description: `Expense ${newStatus.toLowerCase()} successfully` 
      });
      fetchExpenses();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Expense deleted successfully' });
      fetchExpenses();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (company?.id) {
      fetchCostCenters();
      fetchExpenses();
    }
  }, [company?.id, fetchCostCenters, fetchExpenses]);

  return {
    expenses,
    categories,
    costCenters,
    loading,
    filters,
    setFilters,
    stats,
    fetchExpenses,
    createExpense,
    updateExpense,
    updateApprovalStatus,
    deleteExpense,
    generateExpenseNo,
  };
}
