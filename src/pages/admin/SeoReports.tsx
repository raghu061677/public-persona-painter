import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type SeoReport = {
  id: string;
  run_at: string;
  target_url: string;
  performance_score: number | null;
  lcp_ms: number | null;
  fcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  sitemap_status: number | null;
  sitemap_url_count: number | null;
  robots_status: number | null;
  gsc_indexed_count: number | null;
  errors: string[] | null;
};

const fmtMs = (n: number | null) => (n == null ? "—" : `${(n / 1000).toFixed(2)}s`);
const fmtScore = (n: number | null) => (n == null ? "—" : `${n}`);
const scoreColor = (n: number | null) =>
  n == null ? "secondary" : n >= 90 ? "default" : n >= 50 ? "secondary" : "destructive";

export default function SeoReports() {
  const [reports, setReports] = useState<SeoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_reports")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setReports((data ?? []) as SeoReport[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runNow = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("weekly-seo-report", { body: {} });
    if (error) {
      toast.error(`Run failed: ${error.message}`);
    } else {
      toast.success("Report generated");
      await load();
    }
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SEO &amp; Performance Reports</h1>
          <p className="text-muted-foreground text-sm">
            Weekly Lighthouse + sitemap health for {`https://app.go-ads.in/`}. Cron runs every Monday 03:00 UTC.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={runNow} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Run now
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No reports yet. Click &ldquo;Run now&rdquo; to generate one.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{new Date(r.run_at).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {r.errors && r.errors.length > 0 ? (
                      <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{r.errors.length} issues</Badge>
                    ) : (
                      <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Healthy</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                  <Metric label="Perf" value={fmtScore(r.performance_score)} variant={scoreColor(r.performance_score) as any} />
                  <Metric label="LCP" value={fmtMs(r.lcp_ms)} />
                  <Metric label="FCP" value={fmtMs(r.fcp_ms)} />
                  <Metric label="CLS" value={r.cls?.toFixed(3) ?? "—"} />
                  <Metric label="TBT" value={fmtMs(r.tbt_ms)} />
                  <Metric label="Sitemap" value={`${r.sitemap_status ?? "—"} · ${r.sitemap_url_count ?? 0} URLs`} />
                  <Metric label="GSC indexed" value={r.gsc_indexed_count?.toString() ?? "not connected"} />
                </div>
                {r.errors && r.errors.length > 0 && (
                  <ul className="mt-3 text-xs text-destructive space-y-1">
                    {r.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, variant }: { label: string; value: string; variant?: "default" | "secondary" | "destructive" }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">
        {variant ? <Badge variant={variant}>{value}</Badge> : value}
      </div>
    </div>
  );
}