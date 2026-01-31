import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Eye, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logPortalAccess } from "@/utils/portalAccessLogger";

interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  billing_month: string;
}

export default function PortalInvoices() {
  const { portalUser } = useClientPortal();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    if (portalUser) {
      loadInvoices();
    }
  }, [portalUser]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, statusFilter, monthFilter]);

  const loadInvoices = async () => {
    if (!portalUser) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, due_date, total_amount, paid_amount, balance_due, status, billing_month')
        .eq('client_id', portalUser.client_id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      const invoiceData = data || [];
      setInvoices(invoiceData);

      // Extract unique months for filter
      const months = [...new Set(invoiceData.map(inv => inv.billing_month).filter(Boolean))];
      setAvailableMonths(months.sort().reverse());
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoices",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoice_no?.toLowerCase().includes(term) ||
        inv.id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Month filter
    if (monthFilter !== "all") {
      filtered = filtered.filter(inv => inv.billing_month === monthFilter);
    }

    setFilteredInvoices(filtered);
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    setDownloading(invoiceId);
    
    try {
      if (portalUser) {
        logPortalAccess(portalUser.client_id, 'download_invoice', 'invoice', invoiceId);
      }

      // Import dynamically to avoid bundle size issues
      const { renderInvoicePDF } = await import('@/lib/invoices/templates/registry');
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) throw new Error('Invoice not found');

      // Fetch invoice items
      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      // Fetch client
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', invoice.client_id)
        .single();

      // Fetch org settings
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const invoiceData = {
        invoice,
        items: items || [],
        client: client || { name: invoice.client_name },
        campaign: null,
        company: orgSettings || {},
        orgSettings,
      };

      const pdfBlob = await renderInvoicePDF(invoiceData, invoice.pdf_template_key || 'default_existing');
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_no || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `Invoice ${invoice.invoice_no || invoice.id} downloaded`,
      });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download invoice",
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'partial':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">
          View and download your invoices
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No invoices found</h3>
              <p className="text-muted-foreground mt-1">
                {invoices.length === 0 
                  ? "You don't have any invoices yet" 
                  : "No invoices match your filters"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{invoice.invoice_no || invoice.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Date: {new Date(invoice.invoice_date).toLocaleDateString('en-IN')} • 
                        Due: {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="text-left md:text-right">
                      <p className="font-semibold text-lg">{formatCurrency(invoice.total_amount)}</p>
                      {(invoice.balance_due || 0) > 0 && (
                        <p className="text-sm text-destructive font-medium">
                          Balance: {formatCurrency(invoice.balance_due)}
                        </p>
                      )}
                    </div>
                    
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/portal/invoices/${invoice.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice.id)}
                        disabled={downloading === invoice.id}
                      >
                        <Download className={`h-4 w-4 mr-2 ${downloading === invoice.id ? 'animate-spin' : ''}`} />
                        {downloading === invoice.id ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
