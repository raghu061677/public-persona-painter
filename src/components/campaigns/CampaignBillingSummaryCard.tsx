import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  type CampaignInvoiceStatusResult,
  invoiceStatusConfig,
  formatBillingMonth,
} from "@/utils/campaignInvoiceStatus";
import { CampaignInvoiceStatusBadge } from "./CampaignInvoiceStatusBadge";

interface Props {
  campaignId: string;
  result: CampaignInvoiceStatusResult;
}

export function CampaignBillingSummaryCard({ campaignId, result }: Props) {
  const navigate = useNavigate();
  const config = invoiceStatusConfig[result.status];

  return (
    <Card className="border-l-4 border-l-indigo-500 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Billing Summary
          </CardTitle>
          <CampaignInvoiceStatusBadge result={result} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Invoice Progress</span>
              <span>{result.invoicedMonths.length} / {result.billableMonths.length} months</span>
            </div>
            <Progress value={result.completionPercent} className="h-2" />
          </div>

          {/* Pending Months */}
          {result.pendingMonths.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pending Months</p>
              <div className="flex flex-wrap gap-1">
                {result.pendingMonths.map((m) => (
                  <Badge
                    key={m}
                    variant="outline"
                    className={`text-xs ${
                      result.overdueMonths.includes(m)
                        ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400"
                    }`}
                  >
                    {formatBillingMonth(m)}
                    {result.overdueMonths.includes(m) && " ⚠"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Last Invoice */}
          {result.lastInvoiceNo && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Invoice</span>
              <span className="font-medium">{result.lastInvoiceNo}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {result.pendingMonths.length > 0 ? (
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  // Scroll to billing tab
                  const billingTab = document.querySelector('[value="billing"]') as HTMLElement;
                  billingTab?.click();
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Raise Invoice ({result.pendingMonths.length} pending)
              </Button>
            ) : result.invoicedMonths.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/admin/invoices?campaign_id=${campaignId}`)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Invoices
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
