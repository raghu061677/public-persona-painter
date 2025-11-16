import { useState, useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPortalAccess } from '@/utils/portalAccessLogger';

interface Invoice {
  id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  payments: any;
}

export default function ClientPortalPayments() {
  const { portalUser } = useClientPortal();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0
  });

  useEffect(() => {
    if (portalUser) {
      loadInvoices();
      logPortalAccess(portalUser.client_id, 'view_invoice');
    }
  }, [portalUser]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', portalUser!.client_id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);

      // Calculate stats
      const totalInvoiced = data?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const outstandingBalance = data?.reduce((sum, inv) => sum + inv.balance_due, 0) || 0;
      const totalPaid = totalInvoiced - outstandingBalance;

      setStats({
        totalInvoiced,
        totalPaid,
        outstandingBalance
      });
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // TODO: Implement actual invoice PDF download
      toast({
        title: 'Coming Soon',
        description: 'Invoice download functionality will be available soon'
      });

      logPortalAccess(portalUser!.client_id, 'download_invoice', 'invoice', invoiceId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download invoice',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments & Invoices</h1>
        <p className="text-muted-foreground mt-2">Track your payment history and outstanding balances</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvoiced)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <DollarSign className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.outstandingBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{invoice.id}</h3>
                          <Badge variant={getStatusColor(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Invoice Date: {formatDate(invoice.invoice_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due Date: {formatDate(invoice.due_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</div>
                        {invoice.balance_due > 0 && (
                          <div className="text-sm text-orange-600">
                            Balance: {formatCurrency(invoice.balance_due)}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    {/* Payment Timeline */}
                    {invoice.payments && Array.isArray(invoice.payments) && invoice.payments.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Payment History</h4>
                        <div className="space-y-2">
                          {invoice.payments.map((payment: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {formatDate(payment.date)}
                              </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
