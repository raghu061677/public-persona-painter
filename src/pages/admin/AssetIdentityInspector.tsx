import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertTriangle, CheckCircle2, Info, Copy, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { runFullAudit, generateRepairProposals, applyRepairProposals, type AssetCodeAuditRow, type AuditSummary, type RepairProposal } from "@/lib/admin/assetCodeAudit";

// ============================================================
// TYPES
// ============================================================

interface InspectorAsset {
  // Identity
  id: string;
  media_asset_code: string | null;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string | null;
  total_sqft: number | null;
  illumination_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Booking state
  current_campaign_id: string | null;
  current_plan_id: string | null;
  booked_from: string | null;
  booked_to: string | null;
  next_available_date: string | null;
}

interface BookingRecord {
  id: string;
  source_type: string;
  source_id: string | null;
  campaign_name?: string;
  plan_name?: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface DiagnosticFlag {
  key: string;
  label: string;
  severity: "error" | "warning" | "info" | "ok";
  message: string;
}

// ============================================================
// COMPONENT
// ============================================================

export default function AssetIdentityInspector() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InspectorAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<InspectorAsset | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticFlag[]>([]);

  // Audit state
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [auditIssues, setAuditIssues] = useState<AssetCodeAuditRow[]>([]);
  const [repairProposals, setRepairProposals] = useState<RepairProposal[]>([]);
  const [repairMode, setRepairMode] = useState<"idle" | "preview" | "applying" | "done">("idle");

  // ============================================================
  // SEARCH
  // ============================================================

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSelectedAsset(null);
    setBookings([]);
    setDiagnostics([]);

    try {
      const q = searchQuery.trim();

      // Search by media_asset_code, id, location, area, city
      const { data, error } = await supabase
        .from("media_assets")
        .select("id, media_asset_code, location, area, city, media_type, dimensions, total_sqft, illumination_type, status, created_at, updated_at, current_campaign_id, current_plan_id, booked_from, booked_to, next_available_date")
        .or(`media_asset_code.ilike.%${q}%,id.ilike.%${q}%,location.ilike.%${q}%,area.ilike.%${q}%,city.ilike.%${q}%`)
        .order("media_asset_code")
        .limit(20);

      if (error) throw error;
      setResults((data || []) as InspectorAsset[]);

      if (data && data.length === 1) {
        selectAsset(data[0] as InspectorAsset);
      }
    } catch (err: any) {
      toast({ title: "Search Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SELECT ASSET → LOAD DETAILS
  // ============================================================

  const selectAsset = async (asset: InspectorAsset) => {
    setSelectedAsset(asset);
    setDiagnostics(computeDiagnostics(asset));
    await loadBookingHistory(asset.id);
  };

  const computeDiagnostics = (asset: InspectorAsset): DiagnosticFlag[] => {
    const flags: DiagnosticFlag[] = [];
    const code = asset.media_asset_code;

    // Missing code
    if (!code || code.trim() === "") {
      flags.push({ key: "missing", label: "Missing Code", severity: "error", message: "No business-facing media_asset_code assigned." });
    }

    // UUID-like code
    if (code && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(code)) {
      flags.push({ key: "uuid_code", label: "UUID as Code", severity: "error", message: "media_asset_code contains a UUID, should be MNS-XXX-XXX-0000 format." });
    }

    // Malformed code
    if (code && code.trim() !== "" && !/^[A-Z]+-[A-Z]+-[A-Z]+-\d{4}$/.test(code) && !/^[0-9a-f]{8}-/i.test(code)) {
      flags.push({ key: "malformed", label: "Malformed Code", severity: "warning", message: `Code "${code}" does not match expected MNS-XXX-XXX-0000 pattern.` });
    }

    // ID-code confusion risk
    if (code && asset.id !== code) {
      const idBase = asset.id.replace(/^HYD-BQS-/, "").replace(/^MNS-HYD-BQS-/, "");
      const codeBase = code.replace(/^MNS-HYD-BQS-/, "");
      if (idBase === codeBase && asset.id.startsWith("HYD-")) {
        flags.push({ key: "id_code_confuse", label: "ID-Code Number Match", severity: "info", message: `Internal id "${asset.id}" shares sequence number with code "${code}". May cause confusion.` });
      }
    }

    // UUID internal id
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(asset.id)) {
      flags.push({ key: "uuid_id", label: "UUID Internal ID", severity: "info", message: "Internal id is UUID format (normal for newer assets)." });
    } else {
      flags.push({ key: "legacy_id", label: "Legacy Text ID", severity: "info", message: `Internal id is legacy text format: ${asset.id}` });
    }

    // All good
    if (flags.filter(f => f.severity === "error" || f.severity === "warning").length === 0) {
      flags.push({ key: "ok", label: "All Good", severity: "ok", message: "Asset code is properly assigned and formatted." });
    }

    return flags;
  };

  const loadBookingHistory = async (assetId: string) => {
    try {
      // Campaign bookings
      const { data: campaignData } = await supabase
        .from("campaign_assets")
        .select("id, campaign_id, start_date, end_date, status, campaigns!inner(campaign_name)")
        .eq("asset_id", assetId)
        .order("start_date", { ascending: false })
        .limit(10);

      // Plan holds
      const { data: planData } = await supabase
        .from("plan_items")
        .select("id, plan_id, start_date, end_date, plans!inner(plan_name, status)")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(10);

      const records: BookingRecord[] = [];

      (campaignData || []).forEach((c: any) => {
        records.push({
          id: c.id,
          source_type: "Campaign",
          source_id: c.campaign_id,
          campaign_name: c.campaigns?.campaign_name,
          start_date: c.start_date || "-",
          end_date: c.end_date || "-",
          status: c.status || "unknown",
        });
      });

      (planData || []).forEach((p: any) => {
        records.push({
          id: p.id,
          source_type: "Plan",
          source_id: p.plan_id,
          plan_name: p.plans?.plan_name,
          start_date: p.start_date || "-",
          end_date: p.end_date || "-",
          status: p.plans?.status || "unknown",
        });
      });

      setBookings(records);
    } catch (err) {
      console.error("Error loading booking history:", err);
    }
  };

  // ============================================================
  // AUDIT & REPAIR
  // ============================================================

  const handleRunAudit = async () => {
    setAuditRunning(true);
    setRepairMode("idle");
    setRepairProposals([]);
    try {
      const { rows, summary } = await runFullAudit();
      setAuditSummary(summary);
      setAuditIssues(rows.filter(r => r.issue_type !== "OK"));
      toast({ title: "Audit Complete", description: `${summary.total} assets audited. ${summary.total - summary.ok} issues found.` });
    } catch (err: any) {
      toast({ title: "Audit Error", description: err.message, variant: "destructive" });
    } finally {
      setAuditRunning(false);
    }
  };

  const handleGenerateRepairs = async () => {
    setRepairMode("preview");
    try {
      const proposals = await generateRepairProposals();
      setRepairProposals(proposals);
      if (proposals.length === 0) {
        toast({ title: "No Repairs Needed", description: "All asset codes are valid." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setRepairMode("idle");
    }
  };

  const handleApplyRepairs = async () => {
    if (repairProposals.length === 0) return;
    setRepairMode("applying");
    try {
      const result = await applyRepairProposals(repairProposals);
      toast({
        title: "Repairs Applied",
        description: `${result.updated.length} updated, ${result.failed.length} failed.`,
      });
      setRepairMode("done");
      // Re-run audit
      await handleRunAudit();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setRepairMode("preview");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: text });
  };

  // ============================================================
  // RENDER
  // ============================================================

  const severityColor = (s: DiagnosticFlag["severity"]) => {
    switch (s) {
      case "error": return "destructive";
      case "warning": return "secondary";
      case "ok": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Asset Identity Inspector</h1>
        <p className="text-muted-foreground">Debug asset identity mapping, booking state, and code quality.</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by asset code, internal ID, location, area, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Searching..." : "Inspect"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Results */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {results.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => selectAsset(asset)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedAsset?.id === asset.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-mono text-sm font-semibold">{asset.media_asset_code || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{asset.location}</div>
                    <div className="text-xs text-muted-foreground">{asset.city} • {asset.media_type}</div>
                  </button>
                ))}
                {results.length === 0 && searchQuery && !loading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No results found.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Asset Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedAsset ? `${selectedAsset.media_asset_code || "NO CODE"} — ${selectedAsset.location}` : "Select an asset"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAsset ? (
              <div className="space-y-4">
                {/* A. Identity */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Identity</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Business Code:</span>
                      <span className="ml-2 font-mono font-semibold">{selectedAsset.media_asset_code || "—"}</span>
                      {selectedAsset.media_asset_code && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => copyToClipboard(selectedAsset.media_asset_code!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Internal ID:</span>
                      <span className="ml-2 font-mono text-xs opacity-60">{selectedAsset.id}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => copyToClipboard(selectedAsset.id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div><span className="text-muted-foreground">Location:</span> <span className="ml-2">{selectedAsset.location}</span></div>
                    <div><span className="text-muted-foreground">Area:</span> <span className="ml-2">{selectedAsset.area}</span></div>
                    <div><span className="text-muted-foreground">City:</span> <span className="ml-2">{selectedAsset.city}</span></div>
                    <div><span className="text-muted-foreground">Media Type:</span> <span className="ml-2">{selectedAsset.media_type}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="ml-2">{selectedAsset.status}</Badge></div>
                    <div><span className="text-muted-foreground">Dimensions:</span> <span className="ml-2">{selectedAsset.dimensions || "—"}</span></div>
                    <div><span className="text-muted-foreground">Created:</span> <span className="ml-2 text-xs">{new Date(selectedAsset.created_at).toLocaleDateString("en-IN")}</span></div>
                    <div><span className="text-muted-foreground">Updated:</span> <span className="ml-2 text-xs">{new Date(selectedAsset.updated_at).toLocaleDateString("en-IN")}</span></div>
                  </div>
                </div>

                <Separator />

                {/* B. Availability / Booking State */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Booking State</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Campaign:</span> <span className="ml-2 font-mono text-xs">{selectedAsset.current_campaign_id || "None"}</span></div>
                    <div><span className="text-muted-foreground">Plan Hold:</span> <span className="ml-2 font-mono text-xs">{selectedAsset.current_plan_id || "None"}</span></div>
                    <div><span className="text-muted-foreground">Booked From:</span> <span className="ml-2">{selectedAsset.booked_from || "—"}</span></div>
                    <div><span className="text-muted-foreground">Booked To:</span> <span className="ml-2">{selectedAsset.booked_to || "—"}</span></div>
                    <div><span className="text-muted-foreground">Next Available:</span> <span className="ml-2">{selectedAsset.next_available_date || "Now"}</span></div>
                  </div>
                </div>

                <Separator />

                {/* D. Diagnostics */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Diagnostic Flags</h3>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.map((flag) => (
                      <Badge key={flag.key} variant={severityColor(flag.severity)} className="gap-1">
                        {flag.severity === "error" && <AlertTriangle className="h-3 w-3" />}
                        {flag.severity === "ok" && <CheckCircle2 className="h-3 w-3" />}
                        {flag.severity === "info" && <Info className="h-3 w-3" />}
                        {flag.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    {diagnostics.map((flag) => (
                      <p key={flag.key} className="text-xs text-muted-foreground">{flag.message}</p>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* C. Booking History */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Booking History ({bookings.length})</h3>
                  {bookings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1 pr-2">Type</th>
                            <th className="text-left py-1 pr-2">Name</th>
                            <th className="text-left py-1 pr-2">Start</th>
                            <th className="text-left py-1 pr-2">End</th>
                            <th className="text-left py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((b) => (
                            <tr key={b.id} className="border-b border-muted">
                              <td className="py-1 pr-2"><Badge variant="outline" className="text-[10px]">{b.source_type}</Badge></td>
                              <td className="py-1 pr-2">{b.campaign_name || b.plan_name || b.source_id || "—"}</td>
                              <td className="py-1 pr-2">{b.start_date}</td>
                              <td className="py-1 pr-2">{b.end_date}</td>
                              <td className="py-1">{b.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No booking history found.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Search for an asset to inspect its identity and booking state.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Audit & Repair Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Code Audit & Repair
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleRunAudit} disabled={auditRunning}>
              {auditRunning ? "Auditing..." : "Run Full Audit"}
            </Button>
            {auditSummary && auditIssues.length > 0 && repairMode === "idle" && (
              <Button variant="outline" onClick={handleGenerateRepairs}>
                Generate Repair Proposals (Dry Run)
              </Button>
            )}
            {repairProposals.length > 0 && repairMode === "preview" && (
              <Button variant="destructive" onClick={handleApplyRepairs}>
                Apply {repairProposals.length} Repair(s)
              </Button>
            )}
          </div>

          {/* Audit Summary */}
          {auditSummary && (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {[
                { label: "Total", value: auditSummary.total, color: "" },
                { label: "OK", value: auditSummary.ok, color: "text-green-600" },
                { label: "Missing", value: auditSummary.missing, color: "text-red-600" },
                { label: "UUID", value: auditSummary.uuid_as_code, color: "text-red-600" },
                { label: "Duplicate", value: auditSummary.duplicate, color: "text-orange-600" },
                { label: "Malformed", value: auditSummary.malformed, color: "text-yellow-600" },
                { label: "City ≠", value: auditSummary.city_mismatch, color: "text-yellow-600" },
                { label: "Type ≠", value: auditSummary.type_mismatch, color: "text-yellow-600" },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 border rounded">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Issue List */}
          {auditIssues.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 pr-2">Internal ID</th>
                    <th className="text-left py-1 pr-2">Current Code</th>
                    <th className="text-left py-1 pr-2">Location</th>
                    <th className="text-left py-1 pr-2">City</th>
                    <th className="text-left py-1 pr-2">Type</th>
                    <th className="text-left py-1">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {auditIssues.map((row) => (
                    <tr key={row.id} className="border-b border-muted">
                      <td className="py-1 pr-2 font-mono text-[10px] opacity-60">{row.id}</td>
                      <td className="py-1 pr-2 font-mono">{row.current_asset_code || "—"}</td>
                      <td className="py-1 pr-2">{row.location}</td>
                      <td className="py-1 pr-2">{row.city}</td>
                      <td className="py-1 pr-2">{row.media_type}</td>
                      <td className="py-1"><Badge variant="destructive" className="text-[10px]">{row.issue_type}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repair Proposals */}
          {repairProposals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Repair Proposals (Dry Run Preview)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1 pr-2">Internal ID</th>
                      <th className="text-left py-1 pr-2">Old Code</th>
                      <th className="text-left py-1 pr-2">→ New Code</th>
                      <th className="text-left py-1 pr-2">Location</th>
                      <th className="text-left py-1 pr-2">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairProposals.map((p) => (
                      <tr key={p.id} className="border-b border-muted">
                        <td className="py-1 pr-2 font-mono text-[10px] opacity-60">{p.id}</td>
                        <td className="py-1 pr-2 font-mono line-through text-red-500">{p.old_code || "—"}</td>
                        <td className="py-1 pr-2 font-mono text-green-600 font-semibold">{p.new_code}</td>
                        <td className="py-1 pr-2">{p.location}</td>
                        <td className="py-1"><Badge variant="outline" className="text-[10px]">{p.issue_type}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {repairMode === "done" && (
            <p className="text-sm text-green-600 font-medium">✅ Repairs applied successfully. Audit re-run above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
