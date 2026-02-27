import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, Clock, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { getEstimationStatusColor, formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["Draft", "Sent", "Approved", "Rejected", "Converted", "Cancelled"];

export default function EstimationsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) fetchEstimations();
  }, [company]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchEstimations = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('estimations')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch estimations", variant: "destructive" });
    } else {
      setEstimations(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this estimation?")) return;
    const { error } = await supabase.from('estimations').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchEstimations(); }
  };

  const kpis: FinanceKpi[] = useMemo(() => {
    const total = estimations.length;
    const totalValue = estimations.reduce((s, e) => s + (e.total_amount || 0), 0);
    const pending = estimations.filter(e => e.status === "Draft" || e.status === "Sent").length;
    const converted = estimations.filter(e => e.status === "Approved" || e.status === "Converted").length;
    return [
      { label: "Total", value: total, icon: FileText },
      { label: "Total Value", value: formatINR(totalValue), icon: IndianRupee },
      { label: "Pending", value: pending, icon: Clock, valueClassName: "text-amber-600" },
      { label: "Converted", value: converted, icon: CheckCircle2, valueClassName: "text-primary" },
    ];
  }, [estimations]);

  const columns: FinanceColumn<any>[] = [
    { key: "id", header: "Estimation ID", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium">{r.id}</span>, exportValue: (r) => r.id },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "estimation_date", header: "Date", sortable: true, cell: (r) => formatDate(r.estimation_date), exportValue: (r) => r.estimation_date ? new Date(r.estimation_date).toLocaleDateString("en-IN") : "" },
    { key: "status", header: "Status", sortable: true, cell: (r) => <Badge className={getEstimationStatusColor(r.status)}>{r.status}</Badge>, exportValue: (r) => r.status },
    { key: "total_amount", header: "Amount", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{formatINR(r.total_amount)}</span>, exportValue: (r) => r.total_amount || 0 },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/finance/estimations/${r.id}`)}><Eye className="h-4 w-4" /></Button>
          {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <FinanceModuleLayout
      title="Estimations"
      subtitle="Manage quotations and estimates"
      icon={FileText}
      createLabel={isAdmin ? "New Estimation" : undefined}
      onCreateClick={isAdmin ? () => navigate('/finance/estimations/new') : undefined}
      data={estimations}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/finance/estimations/${r.id}`)}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search ID, client..."
      searchFields={["id", "client_name"]}
      statuses={STATUSES}
      statusAccessor={(r) => r.status}
      exportFileName="Estimations"
      emptyTitle="No estimations found"
      emptyDescription="Create your first estimation to get started"
    />
  );
}
