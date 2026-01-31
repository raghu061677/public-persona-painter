import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Calendar, DollarSign, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";

interface Expense {
  id: string;
  expense_no?: string;
  vendor_name: string;
  category: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  notes: string | null;
}

const PO_STATUSES = ['Paid', 'Pending', 'Overdue'];
type SortField = 'id' | 'vendor_name' | 'category' | 'created_at' | 'amount' | 'total_amount' | 'payment_status';
type SortDirection = 'asc' | 'desc';

export default function PurchaseOrders() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load purchase orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique vendors for filter
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(expenses.map(e => e.vendor_name).filter(Boolean));
    return Array.from(vendors).sort();
  }, [expenses]);

  // Filter and sort logic
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(exp =>
        exp.id?.toLowerCase().includes(term) ||
        exp.expense_no?.toLowerCase().includes(term) ||
        exp.vendor_name?.toLowerCase().includes(term) ||
        exp.category?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(exp => exp.payment_status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Vendor filter
    if (vendorFilter !== "all") {
      result = result.filter(exp => exp.vendor_name === vendorFilter);
    }
    
    // Date range filter
    if (dateRange?.from) {
      result = result.filter(exp => {
        const expDate = new Date(exp.created_at);
        if (dateRange.to) {
          return expDate >= dateRange.from! && expDate <= dateRange.to;
        }
        return expDate >= dateRange.from!;
      });
    }
    
    // Amount range filter
    if (amountRange.min) {
      const min = parseFloat(amountRange.min);
      if (!isNaN(min)) {
        result = result.filter(exp => (exp.total_amount || 0) >= min);
      }
    }
    if (amountRange.max) {
      const max = parseFloat(amountRange.max);
      if (!isNaN(max)) {
        result = result.filter(exp => (exp.total_amount || 0) <= max);
      }
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'created_at':
          aVal = a[sortField] ? new Date(a[sortField]).getTime() : 0;
          bVal = b[sortField] ? new Date(b[sortField]).getTime() : 0;
          break;
        case 'amount':
        case 'total_amount':
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
  }, [expenses, searchTerm, statusFilter, vendorFilter, dateRange, amountRange, sortField, sortDirection]);

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
    setVendorFilter("all");
    setDateRange(undefined);
    setAmountRange({ min: "", max: "" });
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || vendorFilter !== "all" || dateRange?.from || amountRange.min || amountRange.max;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDisplayId = (expense: Expense) => {
    if (expense.expense_no) return expense.expense_no;
    const d = new Date(expense.created_at);
    return `PO-${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${expense.id.slice(0,4).toUpperCase()}`;
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground">
          Manage vendor purchase orders and expenses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Orders ({filteredExpenses.length} of {expenses.length})
          </CardTitle>
          <CardDescription>
            Track all vendor orders and expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, vendor, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Vendor Filter */}
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {uniqueVendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PO_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Date Range Filter */}
            <DateRangeFilter
              label=""
              value={dateRange}
              onChange={setDateRange}
              placeholder="Date range"
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

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No purchase orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {hasActiveFilters ? "Try adjusting your filters" : "Vendor orders will appear here once created"}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-border/50 rounded-lg">
                  <Table className="min-w-max w-full table-auto whitespace-nowrap">
                    <TableHeader className="bg-muted sticky top-0 z-20">
                      <TableRow>
                        <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('id')}>
                            Order ID {getSortIcon('id')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('vendor_name')}>
                            Vendor {getSortIcon('vendor_name')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('category')}>
                            Category {getSortIcon('category')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('created_at')}>
                            Date {getSortIcon('created_at')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('amount')}>
                            Amount {getSortIcon('amount')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">GST</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('total_amount')}>
                            Total {getSortIcon('total_amount')}
                          </Button>
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">
                          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('payment_status')}>
                            Status {getSortIcon('payment_status')}
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense, index) => (
                        <TableRow 
                          key={expense.id}
                          className={`transition-all duration-150 hover:bg-muted/80 ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                          }`}
                        >
                          <TableCell className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium border-r font-mono text-sm">
                            {getDisplayId(expense)}
                          </TableCell>
                          <TableCell className="px-4 py-3">{expense.vendor_name}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(expense.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">₹{expense.amount.toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right">₹{expense.gst_amount.toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right font-medium">
                            <div className="flex items-center gap-1 justify-end">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              ₹{expense.total_amount.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">{getStatusBadge(expense.payment_status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
