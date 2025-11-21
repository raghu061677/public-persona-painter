import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
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
import { Plus, Search, Zap, Receipt, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PowerBillExpenseDialog } from "@/components/expenses/PowerBillExpenseDialog";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";

export default function ExpensesList() {
  const { company } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);
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
  
  // Page customization state
  const [showSearch, setShowSearch] = useState(true);
  const [showSummaryCards, setShowSummaryCards] = useState(true);

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) {
      fetchExpenses();
      fetchPowerBills();
    }
  }, [company]);

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
      .select('*, media_assets!inner(id, location, city, area, company_id)')
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

  const filteredExpenses = expenses.filter(exp => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      exp.id?.toLowerCase().includes(term) ||
      exp.vendor_name?.toLowerCase().includes(term) ||
      exp.category?.toLowerCase().includes(term)
    );
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
          {isAdmin && (
            <div className="flex gap-2">
              <PowerBillExpenseDialog onBillAdded={fetchPowerBills} />
              <Button variant="gradient" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Expense
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Cards */}
        {showSummaryCards && (
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
                        <TableCell className="font-medium">{expense.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.vendor_name}</TableCell>
                        <TableCell>{formatDate(expense.created_at)}</TableCell>
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
                        <TableCell className="font-medium">{bill.asset_id}</TableCell>
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
      </div>
    </div>
  );
}
