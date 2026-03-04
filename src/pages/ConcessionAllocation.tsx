import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Play, Eye, Loader2, FileText, IndianRupee, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { format, subMonths } from "date-fns";

export default function ConcessionAllocation() {
  const { company } = useCompany();
  const companyId = company?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [runMonth, setRunMonth] = useState(() => {
    const d = subMonths(new Date(), 1);
    return format(d, "yyyy-MM");
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Fetch active contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["concession-contracts-active", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concession_contracts" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("contract_name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
  });

  // Fetch recent postings
  const { data: recentPostings, isLoading: postingsLoading } = useQuery({
    queryKey: ["concession-postings-recent", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concession_postings" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
  });

  const runAllocation = async (dryRun: boolean) => {
    const [y, m] = runMonth.split("-").map(Number);
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "run-concession-allocation",
        {
          body: {
            company_id: companyId,
            period_year: y,
            period_month: m,
            dry_run: dryRun,
          },
        }
      );
      if (error) throw error;
      if (dryRun) {
        setPreviewData(data);
        setShowPreview(true);
      } else {
        toast.success(
          `Allocation complete: ${data.results?.length || 0} contracts processed`
        );
        qc.invalidateQueries({ queryKey: ["concession-postings-recent"] });
      }
    } catch (e: any) {
      toast.error(e.message || "Allocation failed");
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);

  // Group postings by period
  const postingsByPeriod = useMemo(() => {
    if (!recentPostings) return {};
    const groups: Record<string, any[]> = {};
    recentPostings.forEach((p: any) => {
      const key = `${p.period_year}-${String(p.period_month).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [recentPostings]);

  const totalActiveContracts = contracts?.length || 0;
  const totalMonthlyFee = contracts?.reduce((s: number, c: any) => s + (c.total_fee || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Concession Allocation</h1>
          <p className="text-sm text-muted-foreground">
            Allocate concession fees to assets based on contracts. Preview before executing.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/company-settings/concession-contracts")}>
          <FileText className="h-4 w-4 mr-1" /> Manage Contracts
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <FileText className="h-3.5 w-3.5" /> Active Contracts
            </div>
            <p className="text-2xl font-bold">{totalActiveContracts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <IndianRupee className="h-3.5 w-3.5" /> Total Monthly Fee
            </div>
            <p className="text-2xl font-bold">{fmt(totalMonthlyFee)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <CheckCircle className="h-3.5 w-3.5" /> Recent Postings
            </div>
            <p className="text-2xl font-bold">{recentPostings?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Run Allocation Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run Allocation</CardTitle>
          <CardDescription className="text-xs">
            Select a period and preview allocations before executing. Locked periods are automatically skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Period (YYYY-MM)</Label>
              <Input
                type="month"
                value={runMonth}
                onChange={(e) => setRunMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button
              variant="outline"
              disabled={processing || !companyId}
              onClick={() => runAllocation(true)}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Preview (Dry Run)
            </Button>
            <Button
              disabled={processing || !companyId}
              onClick={() => runAllocation(false)}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Execute Allocation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Active Contracts + Posting History */}
      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">Active Contracts ({totalActiveContracts})</TabsTrigger>
          <TabsTrigger value="history">Posting History</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : !contracts?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No active contracts.{" "}
                        <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/admin/company-settings/concession-contracts")}>
                          Create one <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.contract_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{c.authority_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{c.billing_cycle}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.total_fee)}</TableCell>
                        <TableCell className="text-xs">{c.allocation_method?.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs">{c.applies_to?.replace(/_/g, " ")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {postingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : Object.keys(postingsByPeriod).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No postings yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Basis</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(postingsByPeriod).map(([period, postings]) =>
                      (postings as any[]).map((p: any, idx: number) => (
                        <TableRow key={p.id}>
                          {idx === 0 && (
                            <TableCell rowSpan={(postings as any[]).length} className="font-medium align-top">
                              {period}
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-xs">{p.asset_id}</TableCell>
                          <TableCell className="text-xs">{p.allocation_method?.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-right text-xs">{p.basis_value}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.allocated_amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.created_at ? format(new Date(p.created_at), "dd MMM yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocation Preview (Dry Run)</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Period: <strong>{previewData.period}</strong>
              </p>
              {previewData.errors?.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {previewData.errors.map((e: string, i: number) => (
                    <p key={i} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {e}
                    </p>
                  ))}
                </div>
              )}
              {previewData.results?.map((r: any) => (
                <Card key={r.contract_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{r.contract_name}</CardTitle>
                    <CardDescription className="text-xs">
                      Method: {r.method} · Total Fee: {fmt(r.total_fee)} · Assets: {r.asset_count}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Asset ID</TableHead>
                          <TableHead className="text-xs text-right">Basis</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.postings_preview?.slice(0, 30).map((p: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-mono">{p.asset_id}</TableCell>
                            <TableCell className="text-xs text-right">{p.basis_value}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{fmt(p.allocated_amount)}</TableCell>
                          </TableRow>
                        ))}
                        {r.postings_preview?.length > 30 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-xs text-muted-foreground text-center">
                              +{r.postings_preview.length - 30} more…
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
            <Button
              onClick={() => {
                setShowPreview(false);
                runAllocation(false);
              }}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Execute Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
