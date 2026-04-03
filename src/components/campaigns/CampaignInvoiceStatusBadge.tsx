import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Check, Clock, FileText, Minus } from "lucide-react";
import {
  type CampaignInvoiceStatusResult,
  invoiceStatusConfig,
  formatBillingMonth,
} from "@/utils/campaignInvoiceStatus";

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  not_billable_yet: Clock,
  not_started: Minus,
  partially_invoiced: FileText,
  fully_invoiced: Check,
  overdue: AlertTriangle,
};

interface Props {
  result: CampaignInvoiceStatusResult;
  compact?: boolean;
}

export function CampaignInvoiceStatusBadge({ result, compact }: Props) {
  const config = invoiceStatusConfig[result.status];
  const Icon = statusIcons[result.status] || Minus;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.badgeClass} gap-1 font-medium cursor-default`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-semibold">{config.label}</p>
            <p>{result.invoicedMonths.length} / {result.billableMonths.length} months invoiced</p>
            {result.pendingMonths.length > 0 && (
              <p className="text-orange-600">
                Pending: {result.pendingMonths.map(formatBillingMonth).join(", ")}
              </p>
            )}
            {result.overdueMonths.length > 0 && (
              <p className="text-red-600">
                Overdue: {result.overdueMonths.map(formatBillingMonth).join(", ")}
              </p>
            )}
            {result.lastInvoiceNo && <p>Last: {result.lastInvoiceNo}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CampaignInvoiceProgress({ result }: { result: CampaignInvoiceStatusResult }) {
  if (result.billableMonths.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress value={result.completionPercent} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {result.invoicedMonths.length}/{result.billableMonths.length}
      </span>
    </div>
  );
}
