import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, User, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentsSummaryBar } from "@/components/payments/PaymentsSummaryBar";
import { PaymentQuickChips } from "@/components/payments/PaymentQuickChips";
import { PaymentAdvancedFilters, PaymentFilterPills } from "@/components/payments/PaymentAdvancedFilters";
import type { PaymentFilters } from "@/components/payments/PaymentAdvancedFilters";
import { Search } from "lucide-react";

interface Invoice {
  id: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  payments: any;
  campaign_id?: string;
}

type SortField = 'id' | 'client_name' | 'invoice_date' | 'due_date' | 'total_amount' | 'balance_due' | 'status';
type SortDirection = 'asc' | 'desc';

export default function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const f = filters;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inv =>
        inv.id?.toLowerCase().includes(term) ||
        inv.client_name?.toLowerCase().includes(term)
      );
    }

    // Status
    if (f.status?.length) {
      result = result.filter(inv => f.status!.includes(inv.status));
    }

    // Amount thresholds
    if (f.total_min) {
      result = result.filter(inv => (inv.total_amount || 0) >= f.total_min!);
    }
    if (f.balance_min) {
      result = result.filter(inv => (inv.balance_due || 0) >= f.balance_min!);
    }

    // Client contains
    if (f.client_contains) {
      const term = f.client_contains.toLowerCase();
      result = result.filter(inv => inv.client_name?.toLowerCase().includes(term));
    }

    // Due date range
    if (f.due_between?.from && f.due_between?.to) {
      result = result.filter(inv => {
        if (!inv.due_date) return false;
        const d = inv.due_date.substring(0, 10);
        return d >= f.due_between!.from && d <= f.due_between!.to;
      });
    }

    // Invoice date range
    if (f.invoice_between?.from && f.invoice_between?.to) {
      result = result.filter(inv => {
        if (!inv.invoice_date) return false;
        const d = inv.invoice_date.substring(0, 10);
        return d >= f.invoice_between!.from && d <= f.invoice_between!.to;
      });
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
  }, [invoices, searchTerm, filters, sortField, sortDirection]);

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

  const handleClearFilter = (key: keyof PaymentFilters) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      if (key === "month") delete next.invoice_between;
      if (key === "duration_days") delete next.due_between;
      return next;
    });
  };

  const handleClearAll = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).some(k => {
    const v = (filters as any)[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object" && v !== null) return true;
    return v !== undefined && v !== null && v !== "";
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Track payments and transactions
        </p>
      </div>

      {/* Quick Chips */}
      <PaymentQuickChips
        filters={filters}
        onFiltersChange={setFilters}
        onOpenAdvanced={() => setDrawerOpen(true)}
      />

      {/* Filter Pills */}
      {hasActiveFilters && (
        <PaymentFilterPills
          filters={filters}
          onClear={handleClearFilter}
          onClearAll={handleClearAll}
        />
      )}

      {/* Summary Bar */}
      <PaymentsSummaryBar invoices={filteredInvoices} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Tracking ({filteredInvoices.length} of {invoices.length})
              </CardTitle>
              <CardDescription>
                Monitor all payment activities and invoice status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[250px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No payment records found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {hasActiveFilters || searchTerm ? "Try adjusting your filters" : "Payment activities will appear here once invoices are created"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('id')}>
                        Invoice ID {getSortIcon('id')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('client_name')}>
                        Client {getSortIcon('client_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('invoice_date')}>
                        Invoice Date {getSortIcon('invoice_date')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('due_date')}>
                        Due Date {getSortIcon('due_date')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('total_amount')}>
                        Total Amount {getSortIcon('total_amount')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('balance_due')}>
                        Balance Due {getSortIcon('balance_due')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('status')}>
                        Status {getSortIcon('status')}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {invoice.client_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          ₹{invoice.total_amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{invoice.balance_due.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters Drawer */}
      <PaymentAdvancedFilters
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        filters={filters}
        onApply={setFilters}
        onReset={handleClearAll}
      />
    </div>
  );
}
