import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ListToolbar } from "@/components/list-views";
import { useListView } from "@/hooks/useListView";
import { useListViewExport } from "@/hooks/useListViewExport";
import { expenseExcelRules, expensePdfRules } from "@/utils/exports/statusColorRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Zap, Receipt, ExternalLink, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PowerBillExpenseDialog } from "@/components/expenses/PowerBillExpenseDialog";
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";
import { getAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";
import type { ExpenseCategory, CostCenter, ExpenseFormData } from "@/types/expenses";
import { ExpensesSummaryBar } from "@/components/expenses/ExpensesSummaryBar";

export default function ExpensesList() {
  const { company } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);

  // Global List View System
  const lv = useListView("finance.expenses");
  const { handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "finance.expenses",
    title: "Expenses",
    excelRules: expenseExcelRules,
    pdfRules: expensePdfRules,
  });
  const [powerBills, setPowerBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("regular");
  const [editingBill, setEditingBill] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Add Expense Dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  
  // Page customization state
  const [showSearch, setShowSearch] = useState(true);
  const [showSummaryCards, setShowSummaryCards] = useState(true);
  
  // Filters and sorting state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) {
      fetchExpenses();
      fetchPowerBills();
      fetchCategories();
      fetchCostCenters();
    }
  }, [company]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setCategories((data as ExpenseCategory[]) || []);
  };

  const fetchCostCenters = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true);
    setCostCenters((data as CostCenter[]) || []);
  };

  const handleExpenseSubmit = async (formData: ExpenseFormData): Promise<string | null> => {
    if (!company?.id) return null;
    
    const gstAmount = formData.cgst + formData.sgst + formData.igst;
    const totalAmount = formData.amount_before_tax + gstAmount;
    const tdsAmount = formData.tds_applicable ? (formData.amount_before_tax * formData.tds_percent / 100) : 0;
    const netPayable = totalAmount - tdsAmount;

    // Map category string to valid DB enum value
    // DB allows only: Printing | Mounting | Transport | Electricity | Other
    const categoryMap: Record<string, 'Printing' | 'Mounting' | 'Transport' | 'Electricity' | 'Other'> = {
      'Printing': 'Printing',
      'Mounting': 'Mounting',
      'Transport': 'Transport',
      'Electricity': 'Electricity',
      'Power/Electricity': 'Electricity',
      'Other': 'Other',
      'Rent': 'Other',
      'Maintenance': 'Other',
    };
    const categoryValue = categoryMap[formData.category] || 'Other';

    // Map payment status to valid enum value (DB only supports Pending | Paid)
    const validPaymentStatuses = ['Pending', 'Paid'] as const;
    type PaymentStatusEnum = typeof validPaymentStatuses[number];
    const paymentStatus: PaymentStatusEnum = validPaymentStatuses.includes(formData.payment_status as PaymentStatusEnum)
      ? (formData.payment_status as PaymentStatusEnum)
      : 'Pending';

    // Generate a unique ID and expense number in format EXP-YYYY-MM-XX
    const expenseId = crypto.randomUUID();
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Get next sequence number for this month
    const monthStart = `${year}-${month}-01`;
    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .gte('created_at', monthStart);
    const seq = ((count || 0) + 1).toString().padStart(2, '0');
    const expenseNo = `EXP-${year}-${month}-${seq}`;

    const insertData = {
      id: expenseId,
      expense_no: expenseNo,
      company_id: company.id,
      expense_date: format(formData.expense_date, 'yyyy-MM-dd'),
      vendor_id: formData.vendor_id || null,
      vendor_name: formData.vendor_name,
      vendor_gstin: formData.vendor_gstin || null,
      invoice_no: formData.invoice_no || null,
      invoice_date: formData.invoice_date ? format(formData.invoice_date, 'yyyy-MM-dd') : null,
      payment_mode: formData.payment_mode,
      payment_status: paymentStatus,
      paid_date: formData.paid_date ? format(formData.paid_date, 'yyyy-MM-dd') : null,
      amount: formData.amount_before_tax,
      amount_before_tax: formData.amount_before_tax,
      gst_type_enum: formData.gst_type_enum,
      gst_percent: formData.cgst + formData.sgst + formData.igst > 0 ? 18 : 0,
      cgst: formData.cgst,
      sgst: formData.sgst,
      igst: formData.igst,
      gst_amount: gstAmount,
      total_tax: gstAmount,
      total_amount: totalAmount,
      tds_applicable: formData.tds_applicable,
      tds_percent: formData.tds_percent,
      tds_amount: tdsAmount,
      net_payable: netPayable,
      category: categoryValue,
      category_id: formData.category_id || null,
      subcategory: formData.subcategory || null,
      notes: formData.notes || null,
      cost_center_id: formData.cost_center_id || null,
      allocation_type: formData.allocation_type,
      campaign_id: formData.campaign_id || null,
      plan_id: formData.plan_id || null,
      asset_id: formData.asset_id || null,
      tags: formData.tags || [],
      approval_status: 'Draft',
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(insertData as any)
      .select('id')
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Success",
      description: "Expense created successfully",
    });
    
    fetchExpenses();
    setIsExpenseDialogOpen(false);
    return data?.id || null;
  };

  const handleExpenseUpdate = async (id: string, formData: Partial<ExpenseFormData>): Promise<boolean> => {
    // Map category string to valid DB enum value if provided
    const categoryMap: Record<string, 'Printing' | 'Mounting' | 'Transport' | 'Electricity' | 'Other'> = {
      'Printing': 'Printing',
      'Mounting': 'Mounting',
      'Transport': 'Transport',
      'Electricity': 'Electricity',
      'Power/Electricity': 'Electricity',
      'Other': 'Other',
      'Rent': 'Other',
      'Maintenance': 'Other',
    };
    const categoryValue = formData.category ? (categoryMap[formData.category] || 'Other') : undefined;

    const { error } = await supabase
      .from('expenses')
      .update({
        vendor_name: formData.vendor_name,
        category: categoryValue,
        notes: formData.notes,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
      return false;
    }

    fetchExpenses();
    return true;
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchExpenses = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const fetchPowerBills = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('asset_power_bills')
      .select(`
        *, 
        media_assets!inner(id, location, city, area, company_id, media_asset_code)
      `)
      .eq('media_assets.company_id', company.id)
      .order('bill_month', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch power bills",
        variant: "destructive",
      });
    } else {
      setPowerBills(data || []);
    }
    setLoading(false);
  };

  const filteredExpenses = expenses
    .filter(exp => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
          exp.expense_no?.toLowerCase().includes(term) ||
          exp.id?.toLowerCase().includes(term) ||
          exp.vendor_name?.toLowerCase().includes(term) ||
          exp.category?.toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      }
      // Category filter
      if (categoryFilter !== "all" && exp.category !== categoryFilter) return false;
      // Status filter
      if (statusFilter !== "all" && exp.payment_status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "created_at" || sortField === "expense_date") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const filteredPowerBills = powerBills.filter(bill => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      bill.asset_id?.toLowerCase().includes(term) ||
      bill.consumer_name?.toLowerCase().includes(term) ||
      bill.service_number?.toLowerCase().includes(term)
    );
  });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0);
  const totalPowerBills = filteredPowerBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleEditBill = (bill: any) => {
    setEditingBill(bill);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (bill: any) => {
    setBillToDelete(bill);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('asset_power_bills')
        .delete()
        .eq('id', billToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Power bill deleted successfully",
      });

      fetchPowerBills();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete power bill",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const handleBillUpdated = () => {
    fetchPowerBills();
    setEditDialogOpen(false);
    setEditingBill(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground mt-1">
              Track operational expenses and power bills
            </p>
          </div>
          <div className="flex gap-2">
            <PowerBillExpenseDialog onBillAdded={fetchPowerBills} />
            <Button variant="gradient" size="lg" onClick={() => setIsExpenseDialogOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Global List View Toolbar */}
        <ListToolbar
          searchQuery={lv.searchQuery}
          onSearchChange={(q) => { lv.setSearchQuery(q); setSearchTerm(q); }}
          searchPlaceholder="Search expenses..."
          fields={lv.catalog.fields}
          groups={lv.catalog.groups}
          selectedFields={lv.selectedFields}
          defaultFieldKeys={lv.catalog.defaultFieldKeys}
          onFieldsChange={lv.setSelectedFields}
          presets={lv.presets}
          activePreset={lv.activePreset}
          onPresetSelect={lv.applyPreset}
          onPresetSave={lv.saveCurrentAsView}
          onPresetUpdate={lv.updateCurrentView}
          onPresetDelete={lv.deletePreset}
          onPresetDuplicate={lv.duplicatePreset}
          onExportExcel={(fields) => handleExportExcel(filteredExpenses, fields)}
          onExportPdf={(fields) => handleExportPdf(filteredExpenses, fields)}
          onReset={lv.resetToDefaults}
        />

        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, vendor, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Printing">Printing</SelectItem>
              <SelectItem value="Mounting">Mounting</SelectItem>
              <SelectItem value="Transport">Transport</SelectItem>
              <SelectItem value="Electricity">Electricity</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortField} onValueChange={(value) => setSortField(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="expense_date">Expense Date</SelectItem>
              <SelectItem value="total_amount">Amount</SelectItem>
              <SelectItem value="vendor_name">Vendor</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Summary Bar */}
        {showSummaryCards && (
          <ExpensesSummaryBar expenses={filteredExpenses} />
        )}

        {/* Legacy Summary Cards */}
        {false && showSummaryCards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Regular Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{formatINR(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">{filteredExpenses.length} entries</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Power Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{formatINR(totalPowerBills)}</div>
                <p className="text-xs text-muted-foreground">{filteredPowerBills.length} bills</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {filteredPowerBills.filter(b => b.payment_status === 'Pending').length}
                </div>
                <p className="text-xs text-muted-foreground">Requires payment</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {formatINR(
                    filteredExpenses
                      .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
                      .reduce((sum, e) => sum + (e.total_amount || 0), 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Current month total</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Tabs for Expenses */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="regular">
              <Receipt className="mr-2 h-4 w-4" />
              Regular Expenses
            </TabsTrigger>
            <TabsTrigger value="power-bills">
              <Zap className="mr-2 h-4 w-4" />
              Power Bills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular">
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Total (incl GST)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {expense.expense_no || (() => {
                            const d = new Date(expense.created_at);
                            return `EXP-${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${expense.id.slice(0,2).toUpperCase()}`;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.vendor_name}</TableCell>
                        <TableCell>{formatDate(expense.expense_date || expense.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={expense.payment_status === 'Paid' ? 'default' : 'secondary'}>
                            {expense.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatINR(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(expense.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="power-bills">
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Consumer Name</TableHead>
                    <TableHead>Bill Month</TableHead>
                    <TableHead>Bill Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredPowerBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                        No power bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPowerBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          {getAssetDisplayCode(bill.media_assets, bill.asset_id)}
                        </TableCell>
                        <TableCell>
                          {bill.media_assets?.location}, {bill.media_assets?.city}
                        </TableCell>
                        <TableCell>{bill.consumer_name || 'N/A'}</TableCell>
                        <TableCell>
                          {bill.bill_month ? format(new Date(bill.bill_month), 'MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(bill.bill_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatINR(bill.paid_amount)}
                        </TableCell>
                        <TableCell>
                          {bill.payment_date ? format(new Date(bill.payment_date), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusColor(bill.payment_status)}>
                            {bill.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {bill.bill_url ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(bill.bill_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No receipt</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditBill(bill)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(bill)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <PowerBillExpenseDialog
          mode="edit"
          billToEdit={editingBill}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onBillAdded={handleBillUpdated}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Power Bill</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this power bill for{' '}
                <strong>{billToDelete?.asset_id}</strong>?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Expense Dialog */}
        <ExpenseFormDialog
          open={isExpenseDialogOpen}
          onOpenChange={setIsExpenseDialogOpen}
          categories={categories}
          costCenters={costCenters}
          onSubmit={handleExpenseSubmit}
          onUpdate={handleExpenseUpdate}
        />
      </div>
    </div>
  );
}
