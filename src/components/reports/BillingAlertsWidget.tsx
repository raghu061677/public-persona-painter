import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, Eye, FilePlus, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface BillingAlert {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  billing_cycle: string | null;
  finalized_count: number;
  draft_count: number;
  alert_type: "no_invoice" | "draft_only" | "partially_invoiced";
}

export function BillingAlertsWidget() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadAlerts();
  }, [company?.id]);

  const loadAlerts = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);

      // Get running campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name, start_date, end_date, billing_cycle")
        .eq("company_id", company.id)
        .eq("status", "Running");

      if (!campaigns?.length) {
        setAlerts([]);
        return;
      }

      const campaignIds = campaigns.map((c) => c.id);

      // Get invoices for these campaigns
      const { data: invoices } = await supabase
        .from("invoices")
        .select("campaign_id, is_draft, status")
        .in("campaign_id", campaignIds);

      const invoiceMap = new Map<string, { finalized: number; drafts: number }>();
      (invoices || []).forEach((inv) => {
        if (!inv.campaign_id) return;
        const entry = invoiceMap.get(inv.campaign_id) || { finalized: 0, drafts: 0 };
        if (inv.is_draft) {
          entry.drafts++;
        } else if (inv.status !== "Cancelled") {
          entry.finalized++;
        }
        invoiceMap.set(inv.campaign_id, entry);
      });

      // Determine which campaigns need billing action
      const result: BillingAlert[] = [];
      for (const c of campaigns) {
        const inv = invoiceMap.get(c.id) || { finalized: 0, drafts: 0 };

        // Calculate expected billing months
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        const now = new Date();
        const billableEnd = now < end ? now : end;

        let expectedMonths = 0;
        if (c.billing_cycle === "one_time" || c.billing_cycle === "single") {
          expectedMonths = 1;
        } else {
          // Monthly: count months from start to billableEnd
          const sy = start.getFullYear(), sm = start.getMonth();
          const ey = billableEnd.getFullYear(), em = billableEnd.getMonth();
          expectedMonths = Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
        }

        let alert_type: BillingAlert["alert_type"] | null = null;
        if (inv.finalized === 0 && inv.drafts === 0) {
          alert_type = "no_invoice";
        } else if (inv.finalized === 0 && inv.drafts > 0) {
          alert_type = "draft_only";
        } else if (inv.finalized < expectedMonths) {
          alert_type = "partially_invoiced";
        }

        if (alert_type) {
          result.push({
            campaign_id: c.id,
            campaign_name: c.campaign_name || c.id,
            client_name: c.client_name || "Unknown",
            start_date: c.start_date,
            end_date: c.end_date,
            billing_cycle: c.billing_cycle,
            finalized_count: inv.finalized,
            draft_count: inv.drafts,
            alert_type,
          });
        }
      }

      // Sort: no_invoice first, then draft_only, then partially_invoiced
      const priority = { no_invoice: 0, draft_only: 1, partially_invoiced: 2 };
      result.sort((a, b) => priority[a.alert_type] - priority[b.alert_type]);
      setAlerts(result);
    } catch (err) {
      console.error("Error loading billing alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const noInvoice = alerts.filter((a) => a.alert_type === "no_invoice").length;
  const draftOnly = alerts.filter((a) => a.alert_type === "draft_only").length;
  const partial = alerts.filter((a) => a.alert_type === "partially_invoiced").length;

  const alertBadge = (type: BillingAlert["alert_type"]) => {
    switch (type) {
      case "no_invoice":
        return <Badge variant="destructive" className="text-xs">No Invoice</Badge>;
      case "draft_only":
        return <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400">Draft Only</Badge>;
      case "partially_invoiced":
        return <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 dark:text-blue-400">Partial</Badge>;
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Billing Alerts — Running Campaigns
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{alerts.length} action{alerts.length !== 1 ? "s" : ""} needed</Badge>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground pt-1">
          {noInvoice > 0 && <span className="text-red-600 dark:text-red-400">● {noInvoice} no invoice</span>}
          {draftOnly > 0 && <span className="text-amber-600 dark:text-amber-400">● {draftOnly} draft pending</span>}
          {partial > 0 && <span className="text-blue-600 dark:text-blue-400">● {partial} partially invoiced</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {alerts.map((a) => (
            <div key={a.campaign_id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{a.campaign_name}</span>
                  {alertBadge(a.alert_type)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {a.client_name} • {format(new Date(a.start_date), "dd MMM")} – {format(new Date(a.end_date), "dd MMM yyyy")}
                  {a.billing_cycle && <span className="ml-1">• {a.billing_cycle === "one_time" || a.billing_cycle === "single" ? "Single" : "Monthly"}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate(`/admin/campaigns/${a.campaign_id}`)}
                >
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                {a.alert_type === "draft_only" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => navigate(`/admin/invoices?campaign_id=${a.campaign_id}&status=Draft`)}
                  >
                    <FileWarning className="h-3 w-3 mr-1" /> Open Draft
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      // Navigate to campaign billing tab
                      navigate(`/admin/campaigns/${a.campaign_id}?tab=billing`);
                    }}
                  >
                    <FilePlus className="h-3 w-3 mr-1" /> Invoice
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
