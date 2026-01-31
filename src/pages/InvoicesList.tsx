import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Trash2, AlertCircle, FileText, DollarSign, Clock, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { getInvoiceStatusColor, formatINR, getDaysOverdue } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";
import { useLayoutSettings } from "@/hooks/use-layout-settings";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";

const INVOICE_STATUSES = ['Draft', 'Sent', 'Pending', 'Paid', 'Overdue', 'Cancelled'];

type SortField = 'id' | 'client_name' | 'invoice_date' | 'due_date' | 'total_amount' | 'balance_due' | 'status';
type SortDirection = 'asc' | 'desc';

export default function InvoicesList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Layout settings with persistence
  const { getSetting, updateSetting, isReady } = useLayoutSettings('invoices');

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) {
      fetchInvoices();
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

  const fetchInvoices = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  // Filter and sort logic
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inv =>
        inv.id?.toLowerCase().includes(term) ||
        inv.client_name?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(inv => inv.status === statusFilter);
    }
    
    // Date range filter
    if (dateRange?.from) {
      result = result.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        if (dateRange.to) {
          return invDate >= dateRange.from! && invDate <= dateRange.to;
        }
        return invDate >= dateRange.from!;
      });
    }
    
    // Amount range filter
    if (amountRange.min) {
      const min = parseFloat(amountRange.min);
      if (!isNaN(min)) {
        result = result.filter(inv => (inv.total_amount || 0) >= min);
      }
    }
    if (amountRange.max) {
      const max = parseFloat(amountRange.max);
      if (!isNaN(max)) {
        result = result.filter(inv => (inv.total_amount || 0) <= max);
      }
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'invoice_date':
        case 'due_date':
          aVal = a[sortField] ? new Date(a[sortField]).getTime() : 0;
          bVal = b[sortField] ? new Date(b[sortField]).getTime() : 0;
          break;
        case 'total_amount':
        case 'balance_due':
          aVal = a[sortField] || 0;
          bVal = b[sortField] || 0;
          break;
        default:
          aVal = (a[sortField] || '').toString().toLowerCase();
          bVal = (b[sortField] || '').toString().toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [invoices, searchTerm, statusFilter, dateRange, amountRange, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateRange(undefined);
    setAmountRange({ min: "", max: "" });
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || dateRange?.from || amountRange.min || amountRange.max;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      fetchInvoices();
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    
    // If status is Paid, set balance_due to 0
    if (newStatus === 'Paid') {
      updateData.balance_due = 0;
    }
    
    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Invoice status updated to ${newStatus}`,
      });
      fetchInvoices();
    }
  };

  // Calculate stats
  const totalInvoices = filteredInvoices.length;
  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid').length;
  const pendingAmount = filteredInvoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const overdueInvoices = filteredInvoices.filter(inv => {
    if (inv.status !== 'Paid' && inv.due_date) {
      return getDaysOverdue(inv.due_date) > 0;
    }
    return false;
  }).length;

  // Customization options
  const customizationOptions: PageCustomizationOption[] = [
    {
      id: 'show-header',
      label: 'Page Header',
      description: 'Show page title and description',
      enabled: getSetting('showHeader', true),
      onChange: (val) => updateSetting('showHeader', val),
    },
    {
      id: 'show-stats',
      label: 'Statistics Cards',
      description: 'Display invoice summary metrics',
      enabled: getSetting('showStats', true),
      onChange: (val) => updateSetting('showStats', val),
    },
    {
      id: 'show-filters',
      label: 'Search Bar',
      description: 'Show search and filter controls',
      enabled: getSetting('showFilters', false),
      onChange: (val) => updateSetting('showFilters', val),
    },
    {
      id: 'show-summary',
      label: 'Summary Section',
      description: 'Display aging and payment summary',
      enabled: getSetting('showSummary', true),
      onChange: (val) => updateSetting('showSummary', val),
    },
  ];

  if (!isReady) {
    return null; // Avoid flash of default state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header with Customization */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {getSetting('showHeader', true) && (
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Invoices Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track invoices and payment status
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <PageCustomization options={customizationOptions} />
            {isAdmin && (
              <Button
                onClick={() => navigate('/admin/invoices/new')}
                size="default"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">New Invoice</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {getSetting('showStats', true) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Paid Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">{paidInvoices}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl font-bold text-amber-600">{formatINR(pendingAmount)}</div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600">{overdueInvoices}</div>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {INVOICE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Date Range Filter */}
            <DateRangeFilter
              label=""
              value={dateRange}
              onChange={setDateRange}
              placeholder="Invoice date"
            />
            
            {/* Amount Range */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min ₹"
                value={amountRange.min}
                onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-[100px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max ₹"
                value={amountRange.max}
                onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-[100px]"
              />
            </div>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border-t">
                <Table className="min-w-max w-full table-auto whitespace-nowrap">
                  <TableHeader className="bg-muted sticky top-0 z-20">
                    <TableRow>
                      <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('id')}>
                          Invoice ID {getSortIcon('id')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('client_name')}>
                          Client {getSortIcon('client_name')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('invoice_date')}>
                          Date {getSortIcon('invoice_date')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('due_date')}>
                          Due Date {getSortIcon('due_date')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('status')}>
                          Status {getSortIcon('status')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('total_amount')}>
                          Total {getSortIcon('total_amount')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right font-semibold">
                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('balance_due')}>
                          Balance {getSortIcon('balance_due')}
                        </Button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const daysOverdue = getDaysOverdue(invoice.due_date);
                  const isOverdue = daysOverdue > 0 && invoice.balance_due > 0;

                  return (
                    <TableRow 
                      key={invoice.id}
                      className={`transition-all duration-150 hover:bg-muted/80 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <TableCell className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium border-r">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                            className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                          >
                            {invoice.id}
                          </button>
                          {isOverdue && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/clients/${invoice.client_id}`)}
                          className="text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {invoice.client_name}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="px-4 py-3">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => handleStatusChange(invoice.id, value)}
                        >
                          <SelectTrigger className={`w-[120px] h-8 text-xs ${getInvoiceStatusColor(invoice.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVOICE_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {formatINR(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {formatINR(invoice.balance_due)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
      </div>
    </div>
  );
}
