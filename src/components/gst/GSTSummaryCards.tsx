import { Card, CardContent } from "@/components/ui/card";
import { fmtINRCompact } from "@/lib/gst-format";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IndianRupee, FileText, CreditCard, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardProps {
  label: string;
  value: number | null | undefined;
  tooltip?: string;
  variant?: "default" | "positive" | "negative" | "muted";
  icon?: React.ReactNode;
}

function SummaryCard({ label, value, tooltip, variant = "default", icon }: SummaryCardProps) {
  const colorMap = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    muted: "text-muted-foreground",
  };

  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={`text-lg font-bold font-mono ${colorMap[variant]}`}>
          {fmtINRCompact(value)}
        </p>
      </CardContent>
    </Card>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent><p className="text-xs max-w-[200px]">{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface GSTSummaryCardsProps {
  summary: any;
  loading: boolean;
}

export function GSTSummaryCards({ summary, loading }: GSTSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-4 pb-3 px-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-6 w-24" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No GST data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <SummaryCard label="Gross Taxable" value={summary.gross_invoice_taxable_value} tooltip="Total taxable value of all invoices" icon={<IndianRupee className="h-3.5 w-3.5" />} />
      <SummaryCard label="CN Reduction" value={summary.credit_note_taxable_reduction} variant="negative" tooltip="Taxable value reduced by credit notes" icon={<TrendingDown className="h-3.5 w-3.5" />} />
      <SummaryCard label="Net Taxable" value={summary.net_taxable_value} variant="positive" tooltip="Gross taxable minus credit note reductions" icon={<ArrowUpRight className="h-3.5 w-3.5" />} />
      <SummaryCard label="CGST" value={summary.net_cgst_amount} tooltip="Central GST after CN adjustments" />
      <SummaryCard label="SGST" value={summary.net_sgst_amount} tooltip="State GST after CN adjustments" />
      <SummaryCard label="IGST" value={summary.net_igst_amount} tooltip="Integrated GST after CN adjustments" />
      <SummaryCard label="Gross Invoice Value" value={summary.gross_total_invoice_value} tooltip="Total value of all invoices incl. tax" icon={<IndianRupee className="h-3.5 w-3.5" />} />
      <SummaryCard label="Net Invoice Value" value={summary.net_total_value} variant="positive" tooltip="After credit note total reductions" />
      <SummaryCard label="B2B Taxable" value={summary.b2b_taxable_value} tooltip="B2B outward supply taxable value" />
      <SummaryCard label="B2C Taxable" value={summary.b2c_taxable_value} tooltip="B2C outward supply taxable value" />
      <SummaryCard label="Invoices" value={null} variant="muted" tooltip="Count of invoices" icon={<FileText className="h-3.5 w-3.5" />}>
        {/* override display */}
      </SummaryCard>
      <SummaryCard label="Credit Notes" value={null} variant="muted" tooltip="Count of issued credit notes" icon={<CreditCard className="h-3.5 w-3.5" />} />
    </div>
  );
}

// Fix: render count cards with number, not currency
export function GSTSummaryCardsFixed({ summary, loading }: GSTSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-4 pb-3 px-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-6 w-24" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No GST data available for the selected period</p>
      </div>
    );
  }

  const cards: { label: string; value: string; variant: "default" | "positive" | "negative" | "muted"; tooltip: string; }[] = [
    { label: "Gross Taxable", value: fmtINRCompact(summary.gross_invoice_taxable_value), variant: "default", tooltip: "Total taxable value of all invoices" },
    { label: "CN Reduction", value: fmtINRCompact(summary.credit_note_taxable_reduction), variant: "negative", tooltip: "Taxable value reduced by credit notes" },
    { label: "Net Taxable", value: fmtINRCompact(summary.net_taxable_value), variant: "positive", tooltip: "Gross taxable minus credit note reductions" },
    { label: "CGST", value: fmtINRCompact(summary.net_cgst_amount), variant: "default", tooltip: "Central GST after CN adjustments" },
    { label: "SGST", value: fmtINRCompact(summary.net_sgst_amount), variant: "default", tooltip: "State GST after CN adjustments" },
    { label: "IGST", value: fmtINRCompact(summary.net_igst_amount), variant: "default", tooltip: "Integrated GST after CN adjustments" },
    { label: "Gross Invoice Value", value: fmtINRCompact(summary.gross_total_invoice_value), variant: "default", tooltip: "Total invoice value incl. tax" },
    { label: "Net Invoice Value", value: fmtINRCompact(summary.net_total_value), variant: "positive", tooltip: "After credit note total reductions" },
    { label: "B2B Taxable", value: fmtINRCompact(summary.b2b_taxable_value), variant: "default", tooltip: "B2B outward supply taxable value" },
    { label: "B2C Taxable", value: fmtINRCompact(summary.b2c_taxable_value), variant: "default", tooltip: "B2C outward supply taxable value" },
    { label: "Invoices", value: String(summary.invoice_count ?? 0), variant: "muted", tooltip: "Count of finalized invoices" },
    { label: "Credit Notes", value: String(summary.credit_note_count ?? 0), variant: "muted", tooltip: "Count of issued credit notes" },
  ];

  const colorMap = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <TooltipProvider key={c.label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow cursor-default">
                <CardContent className="pt-4 pb-3 px-4">
                  <span className="text-xs text-muted-foreground font-medium truncate block mb-1">{c.label}</span>
                  <p className={`text-lg font-bold font-mono ${colorMap[c.variant]}`}>{c.value}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">{c.tooltip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
