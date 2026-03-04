import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, IndianRupee, Clock, CheckCircle2, TrendingUp, XCircle } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["Planned", "Running", "Completed", "Cancelled"];

export default function SalesOrders() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadCampaigns();
  }, [company]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, campaign_code, campaign_name, client_name, client_id, status, start_date, end_date, total_amount, grand_total, plan_id, created_at")
      .eq("company_id", company!.id)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: "Failed to load sales orders", variant: "destructive" });
    else setCampaigns(data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      Planned: "bg-slate-500/10 text-slate-700 border-slate-500/20",
      Running: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      Completed: "bg-green-500/10 text-green-700 border-green-500/20",
      Cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return <Badge className={colorMap[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
  };

  const kpis: FinanceKpi[] = useMemo(() => [
    { label: "Total Orders", value: campaigns.length, icon: ShoppingBag },
    { label: "Order Value", value: formatINR(campaigns.reduce((s, c) => s + (c.total_amount || 0), 0)), icon: IndianRupee },
    { label: "Running", value: campaigns.filter(c => c.status === "Running").length, icon: TrendingUp, valueClassName: "text-blue-600" },
    { label: "Completed", value: campaigns.filter(c => c.status === "Completed").length, icon: CheckCircle2, valueClassName: "text-emerald-600" },
    { label: "Planned", value: campaigns.filter(c => c.status === "Planned").length, icon: Clock, valueClassName: "text-amber-600" },
    { label: "Cancelled", value: campaigns.filter(c => c.status === "Cancelled").length, icon: XCircle, valueClassName: "text-rose-600" },
  ], [campaigns]);

  const getDisplayCode = (r: any) => r.campaign_code || r.id;

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "Campaign ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium text-primary cursor-pointer hover:underline">{getDisplayCode(r)}</span>, exportValue: (r) => getDisplayCode(r) },
    { key: "campaign_name", header: "Campaign", sortable: true, cell: (r) => r.campaign_name || '-', exportValue: (r) => r.campaign_name },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "start_date", header: "Start Date", sortable: true, cell: (r) => r.start_date ? formatDate(r.start_date) : '-', exportValue: (r) => r.start_date ? new Date(r.start_date).toLocaleDateString("en-IN") : "" },
    { key: "end_date", header: "End Date", sortable: true, cell: (r) => r.end_date ? formatDate(r.end_date) : '-', exportValue: (r) => r.end_date ? new Date(r.end_date).toLocaleDateString("en-IN") : "" },
    { key: "status", header: "Status", sortable: true, cell: (r) => getStatusBadge(r.status), exportValue: (r) => r.status },
    { key: "total_amount", header: "Amount", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{formatINR(r.grand_total || r.total_amount)}</span>, exportValue: (r) => r.grand_total || r.total_amount || 0 },
    { key: "plan_id", header: "Source Plan", cell: (r) => r.plan_id ? <span className="font-mono text-xs text-muted-foreground">{r.plan_id}</span> : '-', exportValue: (r) => r.plan_id || '', defaultVisible: false },
    { key: "created_at", header: "Created", sortable: true, cell: (r) => r.created_at ? formatDate(r.created_at) : '-', exportValue: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "", defaultVisible: false },
  ];

  return (
    <FinanceModuleLayout
      title="Sales Orders"
      subtitle="Campaigns created from approved plans"
      icon={ShoppingBag}
      data={campaigns}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/campaigns/${r.campaign_code || r.id}`)}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search ID, campaign, client..."
      searchFields={["id", "campaign_name", "client_name", "plan_id"]}
      statuses={STATUSES}
      statusAccessor={(r) => r.status}
      dateField="start_date"
      exportFileName="Sales_Orders"
      emptyTitle="No sales orders found"
      emptyDescription="Sales orders are created when plans are converted to campaigns"
    />
  );
}
