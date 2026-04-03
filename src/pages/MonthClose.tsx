import { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Lock, Unlock, CalendarCheck, AlertTriangle, CheckCircle2,
  IndianRupee, TrendingUp, TrendingDown, FileText, BarChart3, Loader2,
  ChevronDown, ChevronRight, Zap, Printer, Wrench, Eye
} from "lucide-react";
import { format, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────
interface CampaignRow {
  id: string;
  campaign_code: string | null;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  gst_percent: number;
  status: string;
}

interface InvoiceRow {
  id: string;
  invoice_no: string | null;
  client_name: string;
  campaign_id: string | null;
  invoice_date: string;
  due_date: string;
  sub_total: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  balance_due: number;
  status: string;
  billing_month: string | null;
}

interface ExpenseRow {
  id: string;
  category: string;
  vendor_name: string | null;
  notes: string | null;
  amount: number;
  gst_amount: number | null;
  total_amount: number | null;
  expense_date: string | null;
  payment_status: string | null;
  campaign_id: string | null;
}

interface PowerBillRow {
  id: string;
  asset_id: string;
  bill_month: string;
  bill_amount: number;
  total_due: number | null;
  payment_status: string | null;
  consumer_name: string | null;
  service_number: string | null;
}

interface CampaignAssetRow {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  booking_start_date: string | null;
  booking_end_date: string | null;
  negotiated_rate: number | null;
  card_rate: number;
  printing_charges: number | null;
  mounting_charges: number | null;
  rent_amount: number | null;
  total_sqft: number | null;
  status: string;
}

interface ClosingCheck {
  label: string;
  passed: boolean;
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────
function getClosedMonths(companyId: string): string[] {
  try {
    const raw = localStorage.getItem(`goads_closed_months_${companyId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setClosedMonths(companyId: string, months: string[]) {
  localStorage.setItem(`goads_closed_months_${companyId}`, JSON.stringify(months));
}

export function isMonthClosed(companyId: string | undefined, monthKey: string): boolean {
  if (!companyId) return false;
  return getClosedMonths(companyId).includes(monthKey);
}

function generateMonthOptions() {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = subMonths(now, i);
    months.push({ label: format(d, "MMMM yyyy"), value: format(d, "yyyy-MM") });
  }
  return months;
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Component ────────────────────────────────────────
export default function MonthClose() {
  const { company } = useCompany();
  const companyId = company?.id;
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Data
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [powerBills, setPowerBills] = useState<PowerBillRow[]>([]);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [campaignAssets, setCampaignAssets] = useState<Record<string, CampaignAssetRow[]>>({});
  const [assetsLoading, setAssetsLoading] = useState<string | null>(null);

  const monthOptions = useMemo(generateMonthOptions, []);
  const isClosed = companyId ? isMonthClosed(companyId, selectedMonth) : false;
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = format(endOfMonth(new Date(monthStart)), "yyyy-MM-dd");

  useEffect(() => {
    if (companyId) loadAll();
  }, [companyId, selectedMonth]);

  async function loadAll() {
    if (!companyId) return;
    setLoading(true);
    try {
      const [campaignsRes, invoicesRes, expensesRes, powerBillsRes] = await Promise.all([
        // Campaigns active during this month
        supabase
          .from("campaigns")
          .select("id, campaign_code, campaign_name, client_name, start_date, end_date, total_amount, gst_percent, status")
          .eq("company_id", companyId)
          .or(`is_deleted.is.null,is_deleted.eq.false`)
          .lte("start_date", monthEnd)
          .gte("end_date", monthStart)
          .order("start_date", { ascending: false }),
        // Invoices for this month
        supabase
          .from("invoices")
          .select("id, invoice_no, client_name, campaign_id, invoice_date, due_date, sub_total, gst_percent, gst_amount, total_amount, balance_due, status, billing_month")
          .eq("company_id", companyId)
          .gte("invoice_date", monthStart)
          .lte("invoice_date", monthEnd)
          .order("invoice_date", { ascending: false }),
        // Expenses for this month
        supabase
          .from("expenses")
          .select("id, category, vendor_name, notes, amount, gst_amount, total_amount, expense_date, payment_status, campaign_id")
          .eq("company_id", companyId)
          .gte("expense_date", monthStart)
          .lte("expense_date", monthEnd)
          .order("expense_date", { ascending: false }),
        // Power bills for this month
        supabase
          .from("asset_power_bills")
          .select("id, asset_id, bill_month, bill_amount, total_due, payment_status, consumer_name, service_number")
          .eq("bill_month", selectedMonth)
          .order("bill_amount", { ascending: false }),
      ]);

      setCampaigns(campaignsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setExpenses(expensesRes.data || []);
      setPowerBills(powerBillsRes.data || []);
    } catch (err) {
      toast.error("Failed to load month data");
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaignAssets(campaignId: string) {
    if (campaignAssets[campaignId]) return;
    setAssetsLoading(campaignId);
    try {
      const { data } = await supabase
        .from("campaign_assets")
        .select("id, asset_id, location, city, area, media_type, booking_start_date, booking_end_date, negotiated_rate, card_rate, printing_charges, mounting_charges, rent_amount, total_sqft, status")
        .eq("campaign_id", campaignId)
        .order("city");
      setCampaignAssets(prev => ({ ...prev, [campaignId]: data || [] }));
    } catch {
      toast.error("Failed to load campaign assets");
    } finally {
      setAssetsLoading(null);
    }
  }

  function toggleCampaign(id: string) {
    if (expandedCampaign === id) {
      setExpandedCampaign(null);
    } else {
      setExpandedCampaign(id);
      loadCampaignAssets(id);
    }
  }

  // ─── Derived KPIs ────────────────────────────────────
  const invoicesGst = invoices.filter(i => i.gst_percent > 0);
  const invoicesZero = invoices.filter(i => (i.gst_percent ?? 0) === 0);
  const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.total_amount || e.amount || 0), 0);
  const totalPowerBills = powerBills.reduce((s, b) => s + (b.bill_amount || 0), 0);
  const printingExpenses = expenses.filter(e => e.category === "printing").reduce((s, e) => s + (e.total_amount || e.amount || 0), 0);
  const mountingExpenses = expenses.filter(e => e.category === "mounting").reduce((s, e) => s + (e.total_amount || e.amount || 0), 0);
  const allExpensesTotal = totalExpenses + totalPowerBills;
  const profit = totalRevenue - allExpensesTotal;
  const draftInvoices = invoices.filter(i => i.status === "Draft").length;
  const paidInvoices = invoices.filter(i => i.status === "Paid").length;
  const overdueInvoices = invoices.filter(i => i.status === "Overdue").length;

  // Closing checks
  const checks: ClosingCheck[] = [
    { label: "No draft invoices pending", passed: draftInvoices === 0, detail: draftInvoices === 0 ? "All invoices finalized" : `${draftInvoices} draft invoice(s) need attention` },
    { label: "Invoices generated", passed: invoices.length > 0, detail: invoices.length > 0 ? `${invoices.length} invoice(s) for this month` : "No invoices found" },
    { label: "Expenses recorded", passed: true, detail: `${expenses.length} expense(s) + ${powerBills.length} power bill(s)` },
  ];
  const hasBlockers = checks.some(c => !c.passed);

  function handleCloseMonth() {
    if (!companyId) return;
    setClosing(true);
    setTimeout(() => {
      const existing = getClosedMonths(companyId);
      if (!existing.includes(selectedMonth)) setClosedMonths(companyId, [...existing, selectedMonth]);
      setClosing(false);
      toast.success(`${format(new Date(monthStart), "MMMM yyyy")} has been closed`);
    }, 800);
  }

  function handleReopenMonth() {
    if (!companyId) return;
    setClosedMonths(companyId, getClosedMonths(companyId).filter(m => m !== selectedMonth));
    toast.info(`${format(new Date(monthStart), "MMMM yyyy")} reopened`);
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      Paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Draft: "bg-muted text-muted-foreground",
      Overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Cancelled: "bg-muted text-muted-foreground",
      Running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      Planned: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      pending: "bg-amber-100 text-amber-800",
      paid: "bg-emerald-100 text-emerald-800",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" /> Monthly Closing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete view of campaigns, invoices & expenses for selected month
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2">
                  {m.label}
                  {companyId && isMonthClosed(companyId, m.value) && <Lock className="h-3 w-3 text-destructive" />}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isClosed && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Lock className="h-4 w-4" />
          <AlertTitle>Month Closed</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{format(new Date(monthStart), "MMMM yyyy")} is locked.</span>
            <Button variant="outline" size="sm" onClick={handleReopenMonth}>
              <Unlock className="h-3.5 w-3.5 mr-1" /> Reopen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── KPI Cards ──────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}><CardContent className="pt-4 pb-3"><div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" /><div className="h-7 w-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Revenue</div>
            <p className="text-xl font-bold text-emerald-600">{inr(totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{invoices.length} invoices</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3.5 w-3.5" /> Expenses</div>
            <p className="text-xl font-bold text-red-600">{inr(allExpensesTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{expenses.length} entries + {powerBills.length} power bills</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" /> Net Profit</div>
            <p className={`text-xl font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{inr(profit)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Zap className="h-3.5 w-3.5" /> Power Bills</div>
            <p className="text-xl font-bold">{inr(totalPowerBills)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{powerBills.length} bills</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Printer className="h-3.5 w-3.5" /> Printing</div>
            <p className="text-xl font-bold">{inr(printingExpenses)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Wrench className="h-3.5 w-3.5" /> Mounting</div>
            <p className="text-xl font-bold">{inr(mountingExpenses)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* ─── Main Tabs ──────────────────────────────── */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="w-full flex flex-wrap">
          <TabsTrigger value="campaigns" className="flex-1">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="invoices-gst" className="flex-1">Invoices 18% ({invoicesGst.length})</TabsTrigger>
          <TabsTrigger value="invoices-zero" className="flex-1">Invoices 0% ({invoicesZero.length})</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="power-bills" className="flex-1">Power Bills ({powerBills.length})</TabsTrigger>
          <TabsTrigger value="concession" className="flex-1">Concession</TabsTrigger>
          <TabsTrigger value="validation" className="flex-1">Validation</TabsTrigger>
        </TabsList>

        {/* ─── Campaigns Tab ──────────────────────────── */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader><CardTitle className="text-lg">Active Campaigns in {format(new Date(monthStart), "MMMM yyyy")}</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No campaigns active this month</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(c => (
                    <Collapsible key={c.id} open={expandedCampaign === c.id} onOpenChange={() => toggleCampaign(c.id)}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                          {expandedCampaign === c.id ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">{c.campaign_code || c.id.slice(0, 8)}</span>
                              <span className="font-semibold text-sm truncate">{c.campaign_name}</span>
                              <Badge className={statusColor(c.status)} variant="outline">{c.status}</Badge>
                              <Badge variant="outline" className="text-[10px]">GST {c.gst_percent}%</Badge>
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                              <span>{c.client_name}</span>
                              <span>{format(new Date(c.start_date), "dd MMM")} – {format(new Date(c.end_date), "dd MMM yyyy")}</span>
                              <span className="font-medium text-foreground">{inr(c.total_amount)}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/campaigns/${c.id}`); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-7 mt-1 mb-3 border rounded-lg overflow-x-auto">
                          {assetsLoading === c.id ? (
                            <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading assets...</div>
                          ) : (campaignAssets[c.id] || []).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">No assets found</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="text-xs">
                                  <TableHead>Asset ID</TableHead>
                                  <TableHead>Location</TableHead>
                                  <TableHead>City / Area</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Booking Period</TableHead>
                                  <TableHead className="text-right">Rate</TableHead>
                                  <TableHead className="text-right">Printing</TableHead>
                                  <TableHead className="text-right">Mounting</TableHead>
                                  <TableHead className="text-right">Rent</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(campaignAssets[c.id] || []).map(a => (
                                  <TableRow key={a.id} className="text-xs">
                                    <TableCell className="font-mono">{a.asset_id}</TableCell>
                                    <TableCell className="max-w-[180px] truncate">{a.location}</TableCell>
                                    <TableCell>{a.city}, {a.area}</TableCell>
                                    <TableCell>{a.media_type}</TableCell>
                                    <TableCell>
                                      {a.booking_start_date && a.booking_end_date
                                        ? `${format(new Date(a.booking_start_date), "dd MMM")} – ${format(new Date(a.booking_end_date), "dd MMM yy")}`
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">{inr(a.negotiated_rate ?? a.card_rate)}</TableCell>
                                    <TableCell className="text-right">{a.printing_charges ? inr(a.printing_charges) : "—"}</TableCell>
                                    <TableCell className="text-right">{a.mounting_charges ? inr(a.mounting_charges) : "—"}</TableCell>
                                    <TableCell className="text-right">{a.rent_amount ? inr(a.rent_amount) : "—"}</TableCell>
                                    <TableCell><Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Invoices GST Tab ────────────────────────── */}
        <TabsContent value="invoices-gst">
          <InvoiceTable title="Invoices with 18% GST" invoices={invoicesGst} loading={loading} navigate={navigate} statusColor={statusColor} />
        </TabsContent>

        {/* ─── Invoices 0% Tab ─────────────────────────── */}
        <TabsContent value="invoices-zero">
          <InvoiceTable title="Invoices with 0% GST" invoices={invoicesZero} loading={loading} navigate={navigate} statusColor={statusColor} />
        </TabsContent>

        {/* ─── Expenses Tab ────────────────────────────── */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expenses — {format(new Date(monthStart), "MMMM yyyy")}</CardTitle>
              <CardDescription>
                Printing: {inr(printingExpenses)} · Mounting: {inr(mountingExpenses)} · Other: {inr(totalExpenses - printingExpenses - mountingExpenses)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses this month</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Badge variant="outline" className={
                              e.category === "printing" ? "border-blue-300 text-blue-700" :
                              e.category === "mounting" ? "border-purple-300 text-purple-700" :
                              e.category === "electricity" ? "border-amber-300 text-amber-700" :
                              "border-muted"
                            }>{e.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{e.vendor_name || "—"}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{e.notes || "—"}</TableCell>
                          <TableCell className="text-sm">{e.expense_date ? format(new Date(e.expense_date), "dd MMM yyyy") : "—"}</TableCell>
                          <TableCell className="text-right text-sm">{inr(e.amount)}</TableCell>
                          <TableCell className="text-right text-sm">{e.gst_amount ? inr(e.gst_amount) : "—"}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{inr(e.total_amount || e.amount)}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(e.payment_status || "pending")}>{e.payment_status || "Pending"}</Badge></TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right">{inr(expenses.reduce((s, e) => s + e.amount, 0))}</TableCell>
                        <TableCell className="text-right">{inr(expenses.reduce((s, e) => s + (e.gst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{inr(totalExpenses)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Power Bills Tab ─────────────────────────── */}
        <TabsContent value="power-bills">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Power Bills — {format(new Date(monthStart), "MMMM yyyy")}</CardTitle>
              <CardDescription>Total: {inr(totalPowerBills)}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : powerBills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No power bills this month</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset ID</TableHead>
                        <TableHead>Consumer</TableHead>
                        <TableHead>Service No.</TableHead>
                        <TableHead className="text-right">Bill Amount</TableHead>
                        <TableHead className="text-right">Total Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {powerBills.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-sm">{b.asset_id}</TableCell>
                          <TableCell className="text-sm">{b.consumer_name || "—"}</TableCell>
                          <TableCell className="text-sm">{b.service_number || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{inr(b.bill_amount)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{b.total_due ? inr(b.total_due) : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(b.payment_status || "pending")}>{b.payment_status || "Pending"}</Badge></TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">{inr(totalPowerBills)}</TableCell>
                        <TableCell className="text-right">{inr(powerBills.reduce((s, b) => s + (b.total_due || 0), 0))}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Concession Allocation Tab ──────────────── */}
        <TabsContent value="concession">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Concession Allocation</CardTitle>
              <CardDescription>Run concession fee allocation for this month's period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Allocate concession contract fees to assets for <strong>{format(new Date(monthStart), "MMMM yyyy")}</strong>.
              </p>
              <Button onClick={() => navigate(`/admin/finance/concession-allocation`)}>
                <Eye className="h-4 w-4 mr-1" /> Open Concession Allocation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Validation Tab ──────────────────────────── */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Pre-Close Validation</CardTitle>
              <CardDescription>All checks must pass before closing the month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checks.map((check, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${check.passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"}`}>
                  {check.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                  <Badge variant={check.passed ? "default" : "secondary"}>{check.passed ? "Pass" : "Warning"}</Badge>
                </div>
              ))}

              {/* Close / Reopen Action */}
              {!isClosed && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div>
                    <h3 className="font-semibold">Close {format(new Date(monthStart), "MMMM yyyy")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Locking will make invoices & expenses read-only.</p>
                  </div>
                  <Button size="lg" onClick={handleCloseMonth} disabled={closing || hasBlockers} className="min-w-[180px]">
                    {closing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing...</> : <><Lock className="mr-2 h-4 w-4" /> Close Month</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Reusable Invoice Table ───────────────────────────
function InvoiceTable({ title, invoices, loading, navigate, statusColor }: {
  title: string;
  invoices: InvoiceRow[];
  loading: boolean;
  navigate: (path: string) => void;
  statusColor: (s: string) => string;
}) {
  const total = invoices.reduce((s, i) => s + i.total_amount, 0);
  const gstTotal = invoices.reduce((s, i) => s + i.gst_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Total: {inr(total)} (GST: {inr(gstTotal)})</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" /> : invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No invoices in this category</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">GST ({invoices[0]?.gst_percent ?? 0}%)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_no || inv.id.slice(0, 12)}</TableCell>
                    <TableCell className="text-sm font-medium">{inv.client_name}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.invoice_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.due_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right text-sm">{inr(inv.sub_total)}</TableCell>
                    <TableCell className="text-right text-sm">{inr(inv.gst_amount)}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{inr(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-sm">{inr(inv.balance_due)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(inv.id)}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">{inr(invoices.reduce((s, i) => s + i.sub_total, 0))}</TableCell>
                  <TableCell className="text-right">{inr(gstTotal)}</TableCell>
                  <TableCell className="text-right">{inr(total)}</TableCell>
                  <TableCell className="text-right">{inr(invoices.reduce((s, i) => s + i.balance_due, 0))}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
