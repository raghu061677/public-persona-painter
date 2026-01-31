import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Receipt, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReceiptGeneration } from "@/hooks/useReceiptGeneration";
import { logPortalAccess } from "@/utils/portalAccessLogger";

interface ReceiptRecord {
  id: string;
  receipt_no: string;
  receipt_date: string;
  invoice_id: string;
  invoice_no?: string;
  amount_received: number;
  payment_method: string;
  reference_no?: string;
}

export default function PortalReceipts() {
  const { portalUser } = useClientPortal();
  const { toast } = useToast();
  const { downloadReceiptPDF, generating } = useReceiptGeneration();
  
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    if (portalUser) {
      loadReceipts();
    }
  }, [portalUser]);

  useEffect(() => {
    applyFilters();
  }, [receipts, searchTerm, monthFilter]);

  const loadReceipts = async () => {
    if (!portalUser) return;

    try {
      // Fetch receipts for this client
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('client_id', portalUser.client_id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      const receiptData = data || [];

      // Fetch invoice numbers for display
      const invoiceIds = [...new Set(receiptData.map(r => r.invoice_id).filter(Boolean))];
      let invoiceMap: Record<string, string> = {};
      
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_no')
          .in('id', invoiceIds);

        invoiceMap = (invoices || []).reduce((acc, inv) => {
          acc[inv.id] = inv.invoice_no || inv.id;
          return acc;
        }, {} as Record<string, string>);
      }

      const enrichedReceipts = receiptData.map(r => ({
        ...r,
        invoice_no: invoiceMap[r.invoice_id] || r.invoice_id,
      }));

      setReceipts(enrichedReceipts);

      // Extract unique months for filter
      const months = [...new Set(enrichedReceipts.map(r => r.receipt_date?.slice(0, 7)).filter(Boolean))];
      setAvailableMonths(months.sort().reverse());
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load receipts",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...receipts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.receipt_no?.toLowerCase().includes(term) ||
        r.invoice_no?.toLowerCase().includes(term) ||
        r.reference_no?.toLowerCase().includes(term)
      );
    }

    // Month filter
    if (monthFilter !== "all") {
      filtered = filtered.filter(r => r.receipt_date?.startsWith(monthFilter));
    }

    setFilteredReceipts(filtered);
  };

  const handleDownload = async (receiptId: string) => {
    setDownloadingId(receiptId);
    
    try {
      if (portalUser) {
        logPortalAccess(portalUser.client_id, 'download_proof', 'receipt', receiptId);
      }
      await downloadReceiptPDF(receiptId);
    } finally {
      setDownloadingId(null);
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
        <h1 className="text-3xl font-bold">Receipts</h1>
        <p className="text-muted-foreground mt-1">
          Download your payment receipts
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by month" />
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

      {/* Receipts List */}
      {filteredReceipts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No receipts found</h3>
              <p className="text-muted-foreground mt-1">
                {receipts.length === 0 
                  ? "You don't have any payment receipts yet" 
                  : "No receipts match your search"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map((receipt) => (
            <Card key={receipt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Receipt className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{receipt.receipt_no}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.receipt_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Invoice: {receipt.invoice_no}</span>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(receipt.amount_received)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        via {receipt.payment_method}
                        {receipt.reference_no && ` • ${receipt.reference_no}`}
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleDownload(receipt.id)}
                      disabled={downloadingId === receipt.id || generating}
                    >
                      <Download className={`h-4 w-4 mr-2 ${downloadingId === receipt.id ? 'animate-spin' : ''}`} />
                      {downloadingId === receipt.id ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredReceipts.length > 0 && (
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Total {filteredReceipts.length} receipt(s)
              </span>
              <span className="font-semibold text-green-600">
                Total Received: {formatCurrency(
                  filteredReceipts.reduce((sum, r) => sum + (r.amount_received || 0), 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
