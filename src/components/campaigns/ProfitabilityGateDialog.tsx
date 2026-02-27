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
import { supabase } from "@/integrations/supabase/client";
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

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide an override reason");
      return;
    }
    setSubmitting(true);
    try {
      // Log the override in activity_logs
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_logs").insert({
        action: "profitability_override",
        resource_type: "campaign",
        resource_id: campaignId,
        resource_name: campaignName,
        user_id: user?.id,
        details: {
          margin_percent: p.marginPercent,
          min_threshold: minMargin,
          revenue: p.revenue,
          direct_costs: p.directCosts,
          net_profit: p.netProfit,
          override_reason: overrideReason,
        },
      });

      toast.success("Profitability override approved");
      onOpenChange(false);
      onApproved();
    } catch {
      toast.error("Failed to log override");
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
            Profitability Warning
          </DialogTitle>
          <DialogDescription>
            Campaign margin is below the minimum threshold
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Margin Alert</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <p>Campaign margin is <strong>{p.marginPercent.toFixed(1)}%</strong> — below the <strong>{minMargin}%</strong> threshold.</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <span>Revenue:</span>
              <span className="font-medium">{formatCurrency(p.revenue)}</span>
              <span>Direct Costs:</span>
              <span className="font-medium">{formatCurrency(p.directCosts)}</span>
              <span>Net Profit:</span>
              <span className={`font-bold ${p.netProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                {formatCurrency(p.netProfit)}
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {isAdmin ? (
          <div className="space-y-3">
            <Label htmlFor="override-reason">Override Reason (required)</Label>
            <Textarea
              id="override-reason"
              placeholder="Explain why this invoice should be generated despite low margin..."
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleOverride}
                disabled={submitting || !overrideReason.trim()}
              >
                {submitting ? "Logging..." : "Override & Proceed"}
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
