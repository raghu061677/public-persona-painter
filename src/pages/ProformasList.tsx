import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, Clock, CheckCircle2, Eye, Plus } from "lucide-react";
import { toast as toastFn } from "@/hooks/use-toast";
import { FinanceModuleLayout, type FinanceColumn, type FinanceKpi } from "@/components/finance/FinanceModuleLayout";

const STATUSES = ["draft", "sent", "accepted", "expired", "converted"];

const ProformasList = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProformas(); }, []);

  const fetchProformas = async () => {
    try {
      const { data, error } = await supabase
        .from('proforma_invoices' as any)
        .select('id, proforma_number, proforma_date, client_name, plan_name, grand_total, status')
        .order('proforma_date', { ascending: false });
      if (error) throw error;
      setProformas((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching proformas:', error);
      toastFn({ variant: "destructive", title: "Error", description: "Failed to load proforma invoices." });
    } finally { setLoading(false); }
  };

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary", sent: "outline", accepted: "default", expired: "destructive", converted: "default"
    };
    return <Badge variant={map[status] || "secondary"}>{status?.toUpperCase()}</Badge>;
  };

  const kpis: FinanceKpi[] = useMemo(() => [
    { label: "Total", value: proformas.length, icon: FileText },
    { label: "Total Value", value: fmt(proformas.reduce((s, p) => s + (p.grand_total || 0), 0)), icon: IndianRupee },
    { label: "Pending", value: proformas.filter(p => p.status === "draft" || p.status === "sent").length, icon: Clock, valueClassName: "text-amber-600" },
    { label: "Converted", value: proformas.filter(p => p.status === "accepted" || p.status === "converted").length, icon: CheckCircle2, valueClassName: "text-primary" },
  ], [proformas]);

  const columns: FinanceColumn<any>[] = [
    { key: "proforma_number", header: "Proforma No", sortable: true, cell: (r) => <span className="font-mono text-sm font-medium">{r.proforma_number}</span>, exportValue: (r) => r.proforma_number },
    { key: "client_name", header: "Client", sortable: true, cell: (r) => r.client_name, exportValue: (r) => r.client_name },
    { key: "plan_name", header: "Plan", cell: (r) => <span className="max-w-[160px] truncate block">{r.plan_name || "—"}</span>, exportValue: (r) => r.plan_name || "" },
    { key: "proforma_date", header: "Date", sortable: true, cell: (r) => new Date(r.proforma_date).toLocaleDateString("en-IN"), exportValue: (r) => new Date(r.proforma_date).toLocaleDateString("en-IN") },
    { key: "status", header: "Status", sortable: true, cell: (r) => getStatusBadge(r.status), exportValue: (r) => r.status },
    { key: "grand_total", header: "Amount", sortable: true, align: "right", cell: (r) => <span className="font-mono font-semibold">{fmt(r.grand_total)}</span>, exportValue: (r) => r.grand_total || 0 },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (r) => (
        <div onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/proformas/${r.id}`)}><Eye className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <FinanceModuleLayout
      title="Proforma Invoices"
      subtitle="Manage proforma invoices and convert to tax invoices"
      icon={FileText}
      createLabel="New Proforma"
      onCreateClick={() => navigate('/admin/proformas/new')}
      data={proformas}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/admin/proformas/${r.id}`)}
      kpis={kpis}
      columns={columns}
      searchPlaceholder="Search number, client..."
      searchFields={["proforma_number", "client_name"]}
      statuses={STATUSES}
      statusAccessor={(r) => r.status}
      exportFileName="Proforma_Invoices"
      emptyTitle="No proforma invoices found"
      emptyDescription="Create your first proforma invoice to get started"
    />
  );
};

export default ProformasList;
