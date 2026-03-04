import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, Clock, CheckCircle2, Eye, TrendingUp } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate, getPlanStatusColor } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["Approved", "Converted"];

export default function EstimationsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) fetchPlans();
  }, [company]);

  const fetchPlans = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('id, plan_name, client_name, client_id, status, start_date, end_date, grand_total, total_amount, gst_amount, created_at, updated_at, company_id, converted_to_campaign_id')
      .eq('company_id', company.id)
      .in('status', ['Approved', 'Converted'])
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch estimations", variant: "destructive" });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const kpis: FinanceKpi[] = useMemo(() => {
    const total = plans.length;
    const totalValue = plans.reduce((s, e) => s + (e.grand_total || 0), 0);
    const approved = plans.filter(e => e.status === "Approved").length;
    const converted = plans.filter(e => e.status === "Converted").length;
    return [
      { label: "Total Estimations", value: total, icon: FileText },
      { label: "Total Value", value: formatINR(totalValue), icon: IndianRupee },
      { label: "Approved", value: approved, icon: CheckCircle2, valueClassName: "text-emerald-600" },
      { label: "Converted", value: converted, icon: TrendingUp, valueClassName: "text-primary" },
    ];
  }, [plans]);

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "Plan ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium text-primary cursor-pointer hover:underline">{r.id}</span>, exportValue: (r) => r.id },
    { key: "plan_name", header: "Plan Name", sortable: true, cell: (r) => r.plan_name || '-', exportValue: (r) => r.plan_name },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "start_date", header: "Start Date", sortable: true, cell: (r) => r.start_date ? formatDate(r.start_date) : '-', exportValue: (r) => r.start_date ? new Date(r.start_date).toLocaleDateString("en-IN") : "" },
    { key: "end_date", header: "End Date", sortable: true, cell: (r) => r.end_date ? formatDate(r.end_date) : '-', exportValue: (r) => r.end_date ? new Date(r.end_date).toLocaleDateString("en-IN") : "", defaultVisible: false },
    { key: "status", header: "Status", sortable: true, cell: (r) => <Badge className={getPlanStatusColor(r.status)}>{r.status}</Badge>, exportValue: (r) => r.status },
    { key: "total_amount", header: "Subtotal", sortable: true, align: "right", cell: (r) => <span className="font-mono">{formatINR(r.total_amount)}</span>, exportValue: (r) => r.total_amount || 0, defaultVisible: false },
    { key: "gst_amount", header: "GST", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.gst_amount)}</span>, exportValue: (r) => r.gst_amount || 0, defaultVisible: false },
    { key: "grand_total", header: "Total Amount", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{formatINR(r.grand_total)}</span>, exportValue: (r) => r.grand_total || 0 },
    { key: "converted_to_campaign_id", header: "Campaign", cell: (r) => r.converted_to_campaign_id ? <span className="font-mono text-xs text-muted-foreground">{r.converted_to_campaign_id}</span> : '-', exportValue: (r) => r.converted_to_campaign_id || '', defaultVisible: false },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/plans/${r.id}`)}><Eye className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <FinanceModuleLayout
      title="Estimations & Quotations"
      subtitle="Approved plans and converted quotations"
      icon={FileText}
      data={plans}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/plans/${r.id}`)}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search ID, plan name, client..."
      searchFields={["id", "plan_name", "client_name"]}
      statuses={STATUSES}
      statusAccessor={(r) => r.status}
      dateField="start_date"
      exportFileName="Estimations"
      emptyTitle="No estimations found"
      emptyDescription="Estimations appear when plans are approved"
    />
  );
}
