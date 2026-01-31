import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Receipt, 
  AlertCircle, 
  TrendingUp,
  ArrowRight,
  IndianRupee
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logPortalAccess } from "@/utils/portalAccessLogger";

interface FinancialSummary {
  totalOutstanding: number;
  overdueAmount: number;
  paidThisMonth: number;
  totalInvoices: number;
  unpaidInvoices: number;
}

export default function PortalDashboard() {
  const { portalUser } = useClientPortal();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary>({
    totalOutstanding: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (portalUser) {
      loadDashboardData();
      logPortalAccess(portalUser.client_id, 'login');
    }
  }, [portalUser]);

  const loadDashboardData = async () => {
    if (!portalUser) return;

    try {
      // Fetch all invoices for this client
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, due_date, total_amount, balance_due, status')
        .eq('client_id', portalUser.client_id)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

      // Calculate summary
      let totalOutstanding = 0;
      let overdueAmount = 0;
      let paidThisMonth = 0;
      let unpaidInvoices = 0;

      (invoices || []).forEach((inv: any) => {
        const balance = Number(inv.balance_due) || 0;
        const total = Number(inv.total_amount) || 0;
        
        if (balance > 0) {
          totalOutstanding += balance;
          unpaidInvoices++;
          
          // Check if overdue
          if (inv.due_date && new Date(inv.due_date) < now && inv.status !== 'Paid') {
            overdueAmount += balance;
          }
        }
        
        // Check payments this month (total - balance = paid amount)
        const paidAmount = total - balance;
        if (inv.invoice_date?.startsWith(currentMonth) && paidAmount > 0) {
          paidThisMonth += paidAmount;
        }
      });

      setSummary({
        totalOutstanding,
        overdueAmount,
        paidThisMonth,
        totalInvoices: invoices?.length || 0,
        unpaidInvoices,
      });

      setRecentInvoices((invoices || []).slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here's your financial overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={summary.totalOutstanding > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.unpaidInvoices} unpaid invoice(s)
            </p>
          </CardContent>
        </Card>

        <Card className={summary.overdueAmount > 0 ? 'border-red-200 bg-red-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertCircle className={`h-4 w-4 ${summary.overdueAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.overdueAmount > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(summary.overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.paidThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Current month payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/portal/invoices')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">View Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    {summary.totalInvoices} total invoices
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/portal/receipts')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">View Receipts</h3>
                  <p className="text-sm text-muted-foreground">
                    Download payment receipts
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/portal/invoices')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices found</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/portal/invoices/${invoice.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.invoice_no || invoice.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.total_amount || 0)}</p>
                      {(invoice.balance_due || 0) > 0 && (
                        <p className="text-sm text-destructive">
                          Due: {formatCurrency(invoice.balance_due)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
