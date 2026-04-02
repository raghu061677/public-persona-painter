import { useState, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useGSTReportData } from "@/hooks/useGSTReportData";
import { filingPeriodLabel, MONTH_NAMES } from "@/lib/gst-format";
import { GSTSummaryCardsFixed } from "@/components/gst/GSTSummaryCards";
import { GSTSummaryTab } from "@/components/gst/GSTSummaryTab";
import { GSTB2BTab } from "@/components/gst/GSTB2BTab";
import { GSTB2CTab } from "@/components/gst/GSTB2CTab";
import { GSTCreditNotesTab } from "@/components/gst/GSTCreditNotesTab";
import { GSTHSNTab } from "@/components/gst/GSTHSNTab";
import { GSTStatewiseTab } from "@/components/gst/GSTStatewiseTab";
import { GSTValidationTab } from "@/components/gst/GSTValidationTab";
import { GSTExportsTab } from "@/components/gst/GSTExportsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, ShieldCheck, AlertTriangle, XCircle, Save } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: MONTH_NAMES[i + 1] }));

function currentFYMonths() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return { month: m, year: y };
}

const GSTReports = () => {
  const { company } = useCompanyContext();
  const defaults = currentFYMonths();
  const [filingMonth, setFilingMonth] = useState(defaults.month);
  const [filingYear, setFilingYear] = useState(defaults.year);
  const [activeTab, setActiveTab] = useState("summary");

  const filters = useMemo(() => {
    if (!company?.id) return null;
    return { companyId: company.id, filingMonth, filingYear };
  }, [company?.id, filingMonth, filingYear]);

  const { summary, b2b, b2c, creditNotes, hsn, statewise, validation, loading, error, readiness, refresh } = useGSTReportData(filters);

  if (!company) {
    return <LoadingState message="Loading company context..." />;
  }

  const readinessBadge = () => {
    if (loading) return <Badge variant="outline" className="animate-pulse">Checking...</Badge>;
    switch (readiness) {
      case "ready": return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"><ShieldCheck className="h-3 w-3 mr-1" />Ready</Badge>;
      case "warning": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case "blocked": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
    }
  };

  // Year options: current year and previous 2
  const yearOptions = Array.from({ length: 3 }, (_, i) => {
    const y = defaults.year - i;
    return { value: String(y), label: String(y) };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            GST Reporting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filingPeriodLabel(filingMonth, filingYear)} • Reports based on finalized invoices and issued credit notes only
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {readinessBadge()}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 rounded-lg p-3 border">
        <Select value={String(filingMonth)} onValueChange={(v) => setFilingMonth(Number(v))}>
          <SelectTrigger className="w-[140px] h-9 bg-background">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(filingYear)} onValueChange={(v) => setFilingYear(Number(v))}>
          <SelectTrigger className="w-[100px] h-9 bg-background">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button variant="outline" size="sm" disabled title="Coming in Phase 3">
          <Save className="h-4 w-4 mr-1" />
          Save Snapshot
        </Button>
      </div>

      {/* Summary Cards */}
      <GSTSummaryCardsFixed summary={summary} loading={loading} />

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="b2b">B2B</TabsTrigger>
          <TabsTrigger value="b2c">B2C</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
          <TabsTrigger value="hsn">HSN/SAC</TabsTrigger>
          <TabsTrigger value="statewise">State-wise</TabsTrigger>
          <TabsTrigger value="validation" className="relative">
            Validation
            {validation.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                {validation.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="summary">
            <GSTSummaryTab summary={summary} statewise={statewise} hsn={hsn} loading={loading} />
          </TabsContent>
          <TabsContent value="b2b">
            <GSTB2BTab data={b2b} loading={loading} />
          </TabsContent>
          <TabsContent value="b2c">
            <GSTB2CTab data={b2c} loading={loading} />
          </TabsContent>
          <TabsContent value="credit-notes">
            <GSTCreditNotesTab data={creditNotes} loading={loading} />
          </TabsContent>
          <TabsContent value="hsn">
            <GSTHSNTab data={hsn} loading={loading} />
          </TabsContent>
          <TabsContent value="statewise">
            <GSTStatewiseTab data={statewise} loading={loading} />
          </TabsContent>
          <TabsContent value="validation">
            <GSTValidationTab data={validation} loading={loading} />
          </TabsContent>
          <TabsContent value="exports">
            <GSTExportsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default GSTReports;
