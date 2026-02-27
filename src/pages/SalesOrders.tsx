import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["Draft", "Sent", "Approved", "Rejected"];

export default function SalesOrders() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadOrders();
  }, [company]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("estimations")
      .select("*")
      .eq("company_id", company!.id)
      .order("estimation_date", { ascending: false });
    if (error) toast({ title: "Error", description: "Failed to load sales orders", variant: "destructive" });
    else setOrders(data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { Draft: "secondary", Sent: "outline", Approved: "default", Rejected: "destructive" };
    return <Badge variant={map[status] || "outline"}>{status}</Badge>;
  };

  const kpis: FinanceKpi[] = useMemo(() => [
    { label: "Total Orders", value: orders.length, icon: ShoppingBag },
    { label: "Order Value", value: formatINR(orders.reduce((s, e) => s + (e.total_amount || 0), 0)), icon: IndianRupee },
    { label: "Pending", value: orders.filter(e => e.status === "Draft" || e.status === "Sent").length, icon: Clock, valueClassName: "text-amber-600" },
    { label: "Approved", value: orders.filter(e => e.status === "Approved").length, icon: CheckCircle2, valueClassName: "text-primary" },
  ], [orders]);

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "Order ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium">{r.id}</span>, exportValue: (r) => r.id },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "estimation_date", header: "Date", sortable: true, cell: (r) => new Date(r.estimation_date).toLocaleDateString("en-IN"), exportValue: (r) => r.estimation_date ? new Date(r.estimation_date).toLocaleDateString("en-IN") : "" },
    { key: "status", header: "Status", sortable: true, cell: (r) => getStatusBadge(r.status), exportValue: (r) => r.status },
    { key: "sub_total", header: "Subtotal", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.sub_total)}</span>, exportValue: (r) => r.sub_total || 0 },
    { key: "gst_amount", header: "GST", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.gst_amount)}</span>, exportValue: (r) => r.gst_amount || 0 },
    { key: "total_amount", header: "Total", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{formatINR(r.total_amount)}</span>, exportValue: (r) => r.total_amount || 0 },
  ];

  return (
    <FinanceModuleLayout
      title="Sales Orders"
      subtitle="Approved estimations tracked as sales orders"
      icon={ShoppingBag}
      data={orders}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/finance/estimations/${r.id}`)}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search ID, client..."
      searchFields={["id", "client_name"]}
      statuses={STATUSES}
      statusAccessor={(r) => r.status}
      exportFileName="Sales_Orders"
      emptyTitle="No sales orders found"
      emptyDescription="Sales orders appear once estimations are approved"
    />
  );
}
