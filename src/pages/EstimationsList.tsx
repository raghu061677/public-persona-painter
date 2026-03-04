import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, Clock, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { formatDate, getPlanStatusColor } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["Draft", "Pending", "Sent", "Approved", "Rejected", "Converted", "Cancelled"];

export default function EstimationsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) fetchPlans();
  }, [company]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchPlans = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('id, plan_name, client_name, client_id, status, start_date, end_date, grand_total, sub_total, gst_amount, discount_amount, created_at, updated_at, company_id')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch estimations", variant: "destructive" });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this estimation?")) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchPlans(); }
  };

  const kpis: FinanceKpi[] = useMemo(() => {
    const total = plans.length;
    const totalValue = plans.reduce((s, e) => s + (e.grand_total || 0), 0);
    const pending = plans.filter(e => ["Draft", "Pending", "Sent"].includes(e.status)).length;
    const converted = plans.filter(e => e.status === "Approved" || e.status === "Converted").length;
    return [
      { label: "Total", value: total, icon: FileText },
      { label: "Total Value", value: formatINR(totalValue), icon: IndianRupee },
      { label: "Pending", value: pending, icon: Clock, valueClassName: "text-amber-600" },
      { label: "Converted", value: converted, icon: CheckCircle2, valueClassName: "text-primary" },
    ];
  }, [plans]);

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "Plan ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium">{r.id}</span>, exportValue: (r) => r.id },
    { key: "plan_name", header: "Plan Name", sortable: true, cell: (r) => r.plan_name, exportValue: (r) => r.plan_name },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "start_date", header: "Date", sortable: true, cell: (r) => r.start_date ? formatDate(r.start_date) : '-', exportValue: (r) => r.start_date ? new Date(r.start_date).toLocaleDateString("en-IN") : "" },
    { key: "status", header: "Status", sortable: true, cell: (r) => <Badge className={getPlanStatusColor(r.status)}>{r.status}</Badge>, exportValue: (r) => r.status },
    { key: "grand_total", header: "Amount", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{formatINR(r.grand_total)}</span>, exportValue: (r) => r.grand_total || 0 },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/plans/${r.id}`)}><Eye className="h-4 w-4" /></Button>
          {isAdmin && r.status === 'Draft' && <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <FinanceModuleLayout
      title="Estimations & Quotations"
      subtitle="Plans and quotations sent to clients"
      icon={FileText}
      createLabel={isAdmin ? "New Plan" : undefined}
      onCreateClick={isAdmin ? () => navigate('/plans/new') : undefined}
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
      exportFileName="Estimations"
      emptyTitle="No estimations found"
      emptyDescription="Create a plan to generate estimations"
    />
  );
}
