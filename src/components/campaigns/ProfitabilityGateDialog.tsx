import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, Lock } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { CampaignProfitability, getMinMarginThreshold } from "@/hooks/useCampaignProfitability";
import { logProfitabilityOverride } from "@/utils/profitability";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profitability: CampaignProfitability;
  campaignId: string;
  campaignName: string;
  isAdmin: boolean;
  companyId?: string;
  /** Called if override is approved or margin is acceptable */
  onApproved: () => void;
}

export function ProfitabilityGateDialog({
  open,
  onOpenChange,
  profitability: p,
  campaignId,
  campaignName,
  isAdmin,
  companyId,
  onApproved,
}: Props) {
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const minMargin = getMinMarginThreshold(companyId);

  const isCalcFailed = !!(p as any).calcFailed;
  const marginDisplay = p.revenue > 0 && !isCalcFailed
    ? `${p.marginPercent.toFixed(1)}%`
    : "—";

  const handleOverride = async () => {
    if (overrideReason.trim().length < 10) {
      toast.error("Override reason must be at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const logged = await logProfitabilityOverride({
        campaignId,
        campaignName,
        invoiceContext: "campaign_generate_invoice",
        snapshot: p,
        minMargin,
        overrideReason: overrideReason.trim(),
      });

      if (!logged) {
        toast.warning("Warning: could not write audit log — proceeding anyway");
      } else {
        toast.success("Profitability override approved and logged");
      }

      onOpenChange(false);
      onApproved();
    } catch {
      // Do NOT block invoice generation for admin even if logging fails
      toast.warning("Warning: audit log failed — proceeding with invoice generation");
      onOpenChange(false);
      onApproved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            {isAdmin ? "Override Profitability Lock?" : "Profitability Lock"}
          </DialogTitle>
          <DialogDescription>
            {isCalcFailed
              ? "Profit summary is unavailable due to missing data"
              : `Campaign margin is below the minimum threshold (${minMargin}%)`}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{isCalcFailed ? "Calculation Unavailable" : "Low Margin Alert"}</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            {isCalcFailed ? (
              <p>Profitability data could not be computed. Admin override required to proceed.</p>
            ) : (
              <p>Margin ({marginDisplay}) is below minimum ({minMargin}%).
                {!isAdmin && " Contact your admin to proceed."}</p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <span>Revenue:</span>
              <span className="font-medium">{p.revenue > 0 ? formatCurrency(p.revenue) : "—"}</span>
              <span>Direct Costs:</span>
              <span className="font-medium">{formatCurrency(p.directCosts)}</span>
              <span>Net Profit:</span>
              <span className={`font-bold ${p.netProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                {p.revenue > 0 ? formatCurrency(p.netProfit) : "—"}
              </span>
              <span>Margin:</span>
              <span className="font-bold">{marginDisplay}</span>
              <span>Min Threshold:</span>
              <span className="font-medium">{minMargin}%</span>
            </div>
          </AlertDescription>
        </Alert>

        {isAdmin ? (
          <div className="space-y-3">
            <Label htmlFor="override-reason">Override Reason (min 10 characters)</Label>
            <Textarea
              id="override-reason"
              placeholder="Explain why this invoice should be generated despite low margin..."
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              rows={3}
            />
            {overrideReason.length > 0 && overrideReason.length < 10 && (
              <p className="text-xs text-destructive">{10 - overrideReason.length} more characters required</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleOverride}
                disabled={submitting || overrideReason.trim().length < 10}
              >
                {submitting ? "Logging..." : "Proceed Anyway"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Action Blocked</AlertTitle>
              <AlertDescription>
                Only administrators can override profitability checks. Contact your admin to proceed with invoice generation.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
