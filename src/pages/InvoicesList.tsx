import { useEffect, useState } from "react";
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
import { Plus, Search, Eye, Trash2, AlertCircle, FileText, DollarSign, Clock } from "lucide-react";
import { getInvoiceStatusColor, formatINR, getDaysOverdue } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";
import { useLayoutSettings } from "@/hooks/use-layout-settings";

export default function InvoicesList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
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

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.id?.toLowerCase().includes(term) ||
      inv.client_name?.toLowerCase().includes(term)
    );
  });

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
                onClick={() => navigate('/finance/invoices/new')}
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

        {/* Search Bar */}
        {getSetting('showFilters', false) && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                filteredInvoices.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice.due_date);
                  const isOverdue = daysOverdue > 0 && invoice.balance_due > 0;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {invoice.id}
                          {isOverdue && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.client_name}</TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(invoice.balance_due)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
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
  );
}
