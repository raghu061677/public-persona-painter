import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Trash2, AlertCircle, FileText, DollarSign, Clock, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import { getInvoiceStatusColor, formatINR, getDaysOverdue } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";
import { useLayoutSettings } from "@/hooks/use-layout-settings";

// Global List View System
import { useListView } from "@/hooks/useListView";
import { useListViewExport } from "@/hooks/useListViewExport";
import { invoiceExcelRules, invoicePdfRules } from "@/utils/exports/statusColorRules";

// Invoice-specific filters, chips, summary
import { InvoiceAdvancedFilters, InvoiceFilterPills, type InvoiceFilters } from "@/components/invoices/InvoiceAdvancedFilters";
import { InvoiceQuickChips } from "@/components/invoices/InvoiceQuickChips";
import { InvoicesSummaryBar } from "@/components/invoices/InvoicesSummaryBar";

const INVOICE_STATUSES = ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'];

type SortField = 'id' | 'client_name' | 'invoice_date' | 'due_date' | 'total_amount' | 'balance_due' | 'status';
type SortDirection = 'asc' | 'desc';

export default function InvoicesList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Layout settings
  const { getSetting, updateSetting, isReady } = useLayoutSettings('invoices');

  // Global List View
  const lv = useListView("finance.invoices");
  const advancedFilters = (lv.filters || {}) as InvoiceFilters;

  const { handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "finance.invoices",
    title: "Invoices",
    excelRules: invoiceExcelRules,
    pdfRules: invoicePdfRules,
    valueOverrides: {
      sno: (_row: any, index: number) => index + 1,
      invoice_number: (row: any) => row.id || "",
      days_overdue: (row: any) => {
        if (!row.due_date || row.status === "Paid" || row.status === "Cancelled") return "";
        const days = getDaysOverdue(row.due_date);
        return days > 0 ? days : "";
      },
    },
  });

  // Auto-create presets
  useEffect(() => {
    if (!company?.id || lv.catalog.loading) return;
    autoCreatePresets();
  }, [company?.id, lv.catalog.loading, lv.presets]);

  const autoCreatePresets = async () => {
    if (!company?.id) return;
    const existing = lv.presets || [];
    const presetNames = ["Finance Follow-up", "Client Statement", "GST Summary"];
    const missing = presetNames.filter(
      (name) => !existing.some((p) => p.preset_name === name)
    );
    if (missing.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const presetDefs: Record<string, any> = {
      "Finance Follow-up": {
        filters: { status: ["Sent", "Partial", "Overdue"] },
        sort: { field: "due_date", direction: "asc" },
        selected_fields: ["invoice_number", "client_name", "invoice_date", "due_date", "status", "total_amount", "paid_amount", "balance_due", "campaign_id"],
      },
      "Client Statement": {
        filters: {},
        sort: { field: "invoice_date", direction: "desc" },
        selected_fields: ["invoice_number", "invoice_date", "client_name", "campaign_id", "total_amount", "paid_amount", "balance_due", "status"],
      },
      "GST Summary": {
        filters: {},
        sort: { field: "invoice_date", direction: "desc" },
        selected_fields: ["invoice_number", "invoice_date", "client_name", "subtotal", "cgst_amount", "sgst_amount", "igst_amount", "total_amount", "status"],
      },
    };

    for (const name of missing) {
      const def = presetDefs[name];
      if (!def) continue;
      try {
        await supabase.from("list_view_presets").insert({
          company_id: company.id,
          page_key: "finance.invoices",
          preset_name: name,
          is_shared: true,
          is_default: false,
          created_by: user.id,
          filters: def.filters,
          sort: def.sort,
          selected_fields: def.selected_fields,
          field_order: def.selected_fields,
          search_query: "",
          export_format: "excel",
          export_style: {},
        });
      } catch (e) {
        console.warn(`Failed to create preset "${name}":`, e);
      }
    }
    // No direct reload needed - effect dependency on lv.presets handles it
  };

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) fetchInvoices();
  }, [company]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
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
      toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  // Apply search + advanced filters + sort
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const f = advancedFilters;

    // Global search
    const term = lv.searchQuery?.toLowerCase();
    if (term) {
      result = result.filter(inv =>
        inv.id?.toLowerCase().includes(term) ||
        inv.client_name?.toLowerCase().includes(term) ||
        inv.campaign_id?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (f.status?.length) {
      result = result.filter(inv => f.status!.includes(inv.status));
    }

    // Amount filters
    if (f.total_min) {
      result = result.filter(inv => (inv.total_amount || 0) >= f.total_min!);
    }
    if (f.balance_min) {
      result = result.filter(inv => (inv.balance_due || 0) >= f.balance_min!);
    }

    // Client contains
    if (f.client_contains) {
      const ct = f.client_contains.toLowerCase();
      result = result.filter(inv => inv.client_name?.toLowerCase().includes(ct));
    }

    // Campaign contains
    if (f.campaign_contains) {
      const cc = f.campaign_contains.toLowerCase();
      result = result.filter(inv => inv.campaign_id?.toLowerCase().includes(cc));
    }

    // Due date between
    if (f.due_between?.from && f.due_between?.to) {
      result = result.filter(inv => {
        if (!inv.due_date) return false;
        const d = String(inv.due_date).substring(0, 10);
        return d >= f.due_between!.from && d <= f.due_between!.to;
      });
    }

    // Invoice date between
    if (f.invoice_between?.from && f.invoice_between?.to) {
      result = result.filter(inv => {
        if (!inv.invoice_date) return false;
        const d = String(inv.invoice_date).substring(0, 10);
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
  }, [invoices, lv.searchQuery, advancedFilters, sortField, sortDirection]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Invoice deleted successfully" });
      fetchInvoices();
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === 'Paid') updateData.balance_due = 0;
    const { error } = await supabase.from('invoices').update(updateData).eq('id', invoiceId);
    if (error) {
      toast({ title: "Error", description: "Failed to update invoice status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Invoice status updated to ${newStatus}` });
      fetchInvoices();
    }
  };

  // Stats for header cards
  const totalInvoices = filteredInvoices.length;
  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid').length;
  const pendingAmount = filteredInvoices
    .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const overdueInvoices = filteredInvoices.filter(inv => {
    if (inv.status !== 'Paid' && inv.due_date) return getDaysOverdue(inv.due_date) > 0;
    return false;
  }).length;

  // Filter handlers
  const handleApplyAdvancedFilters = useCallback((f: InvoiceFilters) => {
    lv.setFilters(f as Record<string, any>);
  }, [lv]);

  const handleResetFilters = useCallback(() => {
    lv.setFilters({});
  }, [lv]);

  const handleClearSingleFilter = useCallback((key: keyof InvoiceFilters) => {
    const next = { ...advancedFilters };
    delete next[key];
    // Clear related fields
    if (key === "month") delete next.invoice_between;
    if (key === "duration_days") delete next.due_between;
    lv.setFilters(next as Record<string, any>);
  }, [advancedFilters, lv]);

  const handlePresetSelect = useCallback((preset: any) => {
    lv.applyPreset(preset);
    // Also sync local sort state
    if (preset.sort) {
      setSortField(preset.sort.field as SortField);
      setSortDirection(preset.sort.direction as SortDirection);
    }
  }, [lv]);

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
  ];

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportExcel(filteredInvoices)}
              className="gap-1.5"
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPdf(filteredInvoices)}
              className="gap-1.5"
            >
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(true)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
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
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">{paidInvoices}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl font-bold text-amber-600">{formatINR(pendingAmount)}</div>
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Chips */}
        <InvoiceQuickChips
          filters={advancedFilters}
          onFiltersChange={(f) => lv.setFilters(f as Record<string, any>)}
          presets={lv.presets || []}
          activePreset={lv.activePreset || null}
          onPresetSelect={handlePresetSelect}
          onOpenAdvanced={() => setShowAdvancedFilters(true)}
        />

        {/* Filter Pills */}
        <InvoiceFilterPills
          filters={advancedFilters}
          onClear={handleClearSingleFilter}
          onClearAll={handleResetFilters}
        />

        {/* Summary Bar */}
        <InvoicesSummaryBar invoices={filteredInvoices} />

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search invoices..."
              value={lv.searchQuery}
              onChange={(e) => lv.setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
                        <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">No invoices found</TableCell>
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
                                  onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(invoice.id)}`)}
                                  className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                                >
                                  {invoice.id}
                                </button>
                                {isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
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
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">{formatINR(invoice.total_amount)}</TableCell>
                            <TableCell className="px-4 py-3 text-right">{formatINR(invoice.balance_due)}</TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(invoice.id)}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(invoice.id)}>
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

      {/* Advanced Filters Drawer */}
      <InvoiceAdvancedFilters
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
        filters={advancedFilters}
        onApply={handleApplyAdvancedFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
}
