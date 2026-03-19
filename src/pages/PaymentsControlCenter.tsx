import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Calendar, User, DollarSign, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal, Search, AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { PaymentsSummaryBar } from "@/components/payments/PaymentsSummaryBar";
import { PaymentQuickChips } from "@/components/payments/PaymentQuickChips";
import { PaymentAdvancedFilters, PaymentFilterPills } from "@/components/payments/PaymentAdvancedFilters";
import type { PaymentFilters } from "@/components/payments/PaymentAdvancedFilters";
import { PaymentConfirmationQueue } from "@/components/payments/PaymentConfirmationQueue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

type SortField = "id" | "client_name" | "invoice_date" | "due_date" | "total_amount" | "balance_due" | "status";
type SortDirection = "asc" | "desc";

export default function PaymentsControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "all";
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("invoice_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Summary metrics
  const [totalReceived, setTotalReceived] = useState(0);
  const [pendingConfirmations, setPendingConfirmations] = useState(0);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    loadPayments();
    loadMetrics();
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data: payments } = await supabase.from("payment_records").select("amount");
      setTotalReceived(payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0);

      const { count } = await supabase
        .from("payment_confirmations" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending");
      setPendingConfirmations(count || 0);
    } catch (e) {
      // Graceful - metrics are optional
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const f = filters;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (inv) => inv.id?.toLowerCase().includes(term) || inv.client_name?.toLowerCase().includes(term)
      );
    }
    if (f.status?.length) result = result.filter((inv) => f.status!.includes(inv.status));
    if (f.total_min) result = result.filter((inv) => (inv.total_amount || 0) >= f.total_min!);
    if (f.balance_min) result = result.filter((inv) => (inv.balance_due || 0) >= f.balance_min!);
    if (f.client_contains) {
      const term = f.client_contains.toLowerCase();
      result = result.filter((inv) => inv.client_name?.toLowerCase().includes(term));
    }
    if (f.due_between?.from && f.due_between?.to) {
      result = result.filter((inv) => {
        if (!inv.due_date) return false;
        const d = inv.due_date.substring(0, 10);
        return d >= f.due_between!.from && d <= f.due_between!.to;
      });
    }
    if (f.invoice_between?.from && f.invoice_between?.to) {
      result = result.filter((inv) => {
        if (!inv.invoice_date) return false;
        const d = inv.invoice_date.substring(0, 10);
        return d >= f.invoice_between!.from && d <= f.invoice_between!.to;
      });
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "invoice_date":
        case "due_date":
          aVal = a[sortField] ? new Date(a[sortField]).getTime() : 0;
          bVal = b[sortField] ? new Date(b[sortField]).getTime() : 0;
          break;
        case "total_amount":
        case "balance_due":
          aVal = a[sortField] || 0;
          bVal = b[sortField] || 0;
          break;
        default:
          aVal = (a[sortField] || "").toString().toLowerCase();
          bVal = (b[sortField] || "").toString().toLowerCase();
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, filters, sortField, sortDirection]);

  // Overdue invoices
  const overdueInvoices = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return invoices.filter(
      (inv) => inv.due_date && inv.due_date.substring(0, 10) < today && inv.balance_due > 0
    );
  }, [invoices]);

  // Summary
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const collectionPercent = totalReceived + totalOutstanding > 0
    ? ((totalReceived / (totalReceived + totalOutstanding)) * 100).toFixed(1)
    : "0";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const handleClearFilter = (key: keyof PaymentFilters) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      if (key === "month") delete next.invoice_between;
      if (key === "duration_days") delete next.due_between;
      return next;
    });
  };

  const hasActiveFilters = Object.keys(filters).some((k) => {
    const v = (filters as any)[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object" && v !== null) return true;
    return v !== undefined && v !== null && v !== "";
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid": return <Badge variant="default">Paid</Badge>;
      case "partial": return <Badge variant="secondary">Partial</Badge>;
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "overdue": return <Badge variant="destructive">Overdue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const InvoiceTable = ({ data: tableData }: { data: Invoice[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("id")}>
                Invoice ID {getSortIcon("id")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("client_name")}>
                Client {getSortIcon("client_name")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("due_date")}>
                Due Date {getSortIcon("due_date")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("total_amount")}>
                Total {getSortIcon("total_amount")}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("balance_due")}>
                Balance {getSortIcon("balance_due")}
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">{inv.id}</TableCell>
              <TableCell>{inv.client_name}</TableCell>
              <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}</TableCell>
              <TableCell>₹{(inv.total_amount || 0).toLocaleString()}</TableCell>
              <TableCell className="font-medium">₹{(inv.balance_due || 0).toLocaleString()}</TableCell>
              <TableCell>{getStatusBadge(inv.status)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(inv.id)}`)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Track payments, approvals, overdue & collections
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab("confirmations")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Confirmations</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingConfirmations}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab("overdue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">{overdueInvoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection %</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionPercent}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="confirmations">
            Confirmations
            {pendingConfirmations > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{pendingConfirmations}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdueInvoices.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{overdueInvoices.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Payments Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <PaymentQuickChips
            filters={filters}
            onFiltersChange={setFilters}
            onOpenAdvanced={() => setDrawerOpen(true)}
          />
          {hasActiveFilters && (
            <PaymentFilterPills
              filters={filters}
              onClear={handleClearFilter}
              onClearAll={() => setFilters({})}
            />
          )}
          <PaymentsSummaryBar invoices={filteredInvoices} />

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Tracking ({filteredInvoices.length} of {invoices.length})
                  </CardTitle>
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
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No payment records found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {hasActiveFilters || searchTerm ? "Try adjusting your filters" : "Payment activities will appear here"}
                  </p>
                </div>
              ) : (
                <InvoiceTable data={filteredInvoices} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmations Tab */}
        <TabsContent value="confirmations" className="space-y-4 mt-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Safety First</AlertTitle>
            <AlertDescription>
              Payments are <strong>never</strong> auto-approved. Each confirmation requires manual review
              before recording as a payment. Receipts are auto-sent via WhatsApp & Email on approval.
            </AlertDescription>
          </Alert>
          <PaymentConfirmationQueue />
        </TabsContent>

        {/* Overdue Tab */}
        <TabsContent value="overdue" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Overdue Invoices ({overdueInvoices.length})
              </CardTitle>
              <CardDescription>
                Invoices past their due date with outstanding balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">No overdue invoices</p>
                  <p className="text-sm text-muted-foreground mt-2">All payments are on track!</p>
                </div>
              ) : (
                <InvoiceTable data={overdueInvoices} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced Filters Drawer */}
      <PaymentAdvancedFilters
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        filters={filters}
        onApply={setFilters}
        onReset={() => setFilters({})}
      />
    </div>
  );
}
