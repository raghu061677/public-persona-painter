import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const PO_STATUSES = ["Paid", "Pending", "Overdue"];

export default function PurchaseOrders() {
  const { company } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState("all");

  useEffect(() => {
    if (company?.id) loadExpenses();
  }, [company]);

  const loadExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: "Failed to load purchase orders", variant: "destructive" });
    else setExpenses(data || []);
    setLoading(false);
  };

  const uniqueVendors = useMemo(() => [...new Set(expenses.map(e => e.vendor_name).filter(Boolean))].sort(), [expenses]);

  // Apply vendor filter at data level since it's extra
  const vendorFiltered = useMemo(() => {
    if (vendorFilter === "all") return expenses;
    return expenses.filter(e => e.vendor_name === vendorFilter);
  }, [expenses, vendorFilter]);

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
  const getDisplayId = (e: any) => e.expense_no || `PO-${new Date(e.created_at).getFullYear()}-${e.id.slice(0, 6).toUpperCase()}`;

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "paid") return <Badge variant="default">Paid</Badge>;
    if (s === "overdue") return <Badge variant="destructive">Overdue</Badge>;
    return <Badge variant="secondary">{status || "Pending"}</Badge>;
  };

  const kpis: FinanceKpi[] = useMemo(() => [
    { label: "Total POs", value: vendorFiltered.length, icon: ShoppingCart },
    { label: "Total Value", value: fmt(vendorFiltered.reduce((s, e) => s + (e.total_amount || 0), 0)), icon: IndianRupee },
    { label: "Pending", value: vendorFiltered.filter(e => e.payment_status?.toLowerCase() === "pending").length, icon: Clock, valueClassName: "text-amber-600" },
    { label: "Paid", value: vendorFiltered.filter(e => e.payment_status?.toLowerCase() === "paid").length, icon: CheckCircle2, valueClassName: "text-primary" },
  ], [vendorFiltered]);

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "PO ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium">{getDisplayId(r)}</span>, exportValue: (r) => getDisplayId(r) },
    { key: "vendor_name", header: "Vendor", sortable: true, cell: (r) => r.vendor_name, exportValue: (r) => r.vendor_name },
    { key: "category", header: "Category", sortable: true, cell: (r) => <Badge variant="outline">{r.category}</Badge>, exportValue: (r) => r.category },
    { key: "created_at", header: "Date", sortable: true, cell: (r) => new Date(r.created_at).toLocaleDateString("en-IN"), exportValue: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
    { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="font-mono">{fmt(r.amount)}</span>, exportValue: (r) => r.amount || 0 },
    { key: "gst_amount", header: "GST", align: "right", cell: (r) => <span className="font-mono">{fmt(r.gst_amount)}</span>, exportValue: (r) => r.gst_amount || 0 },
    { key: "total_amount", header: "Total", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{fmt(r.total_amount)}</span>, exportValue: (r) => r.total_amount || 0 },
    { key: "payment_status", header: "Status", sortable: true, cell: (r) => getStatusBadge(r.payment_status), exportValue: (r) => r.payment_status },
  ];

  return (
    <FinanceModuleLayout
      title="Purchase Orders"
      subtitle="Track vendor orders and expenses"
      icon={ShoppingCart}
      data={vendorFiltered}
      loading={loading}
      rowKey={(r) => r.id}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search ID, vendor, category..."
      searchFields={["id", "expense_no", "vendor_name", "category"]}
      statuses={PO_STATUSES}
      statusAccessor={(r) => r.payment_status}
      exportFileName="Purchase_Orders"
      emptyTitle="No purchase orders found"
      emptyDescription="Vendor orders will appear here once expenses are recorded"
      extraFilters={
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {uniqueVendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    />
  );
}
