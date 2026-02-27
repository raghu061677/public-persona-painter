import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, FileText, Loader2, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { differenceInMonths, format } from "date-fns";
import { useCampaignProfitability, isProfitLockEnabled, getMinMarginThreshold } from "@/hooks/useCampaignProfitability";
import { ProfitabilityGateDialog } from "@/components/campaigns/ProfitabilityGateDialog";

interface GenerateMonthlyInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    gst_amount: number;
    company_id?: string;
  };
  onGenerated?: () => void;
}

export function GenerateMonthlyInvoicesDialog({
  open,
  onOpenChange,
  campaign,
  onGenerated,
}: GenerateMonthlyInvoicesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showProfitGate, setShowProfitGate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const companyId = campaign.company_id;
  const { data: profitability } = useCampaignProfitability(campaign.id, companyId, campaign.total_amount);

  // Check admin status
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        setIsAdmin(data?.some(r => r.role === "admin") || false);
      }
    })();
  }, []);

  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const totalMonths = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const monthlyAmount = campaign.total_amount / totalMonths;
  const monthlyGst = campaign.gst_amount / totalMonths;

  const handleGenerateWithProfitCheck = () => {
    if (isProfitLockEnabled(companyId) && profitability) {
      const minMargin = getMinMarginThreshold(companyId);
      if (profitability.marginPercent < minMargin || profitability.calcFailed) {
        setShowProfitGate(true);
        return;
      }
    }
    handleGenerate();
  };

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("generate_monthly_invoices", {
        p_campaign_id: campaign.id,
        p_created_by: userData.user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; invoices_created?: number };

      if (!result.success) {
        throw new Error(result.error || "Failed to generate invoices");
      }

      toast({
        title: "Invoices Generated",
        description: `${result.invoices_created} monthly invoices created successfully.`,
      });

      onOpenChange(false);
      onGenerated?.();
    } catch (err: any) {
      console.error("Generate invoices error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showMarginWarning = profitability && isProfitLockEnabled(companyId) &&
    (profitability.marginPercent < getMinMarginThreshold(companyId) || profitability.calcFailed);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Generate Monthly Invoices
            </DialogTitle>
            <DialogDescription>
              Split the campaign billing into monthly invoices for easier payment tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign:</span>
                <span className="font-medium">{campaign.campaign_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client:</span>
                <span>{campaign.client_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Period:</span>
                <span>
                  {format(startDate, "dd MMM yyyy")} - {format(endDate, "dd MMM yyyy")}
                </span>
              </div>
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Months:</span>
                  <span className="font-medium">{totalMonths}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Amount:</span>
                  <span className="font-medium">{formatCurrency(monthlyAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly GST:</span>
                  <span>{formatCurrency(monthlyGst)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Monthly Total:</span>
                  <span>{formatCurrency(monthlyAmount + monthlyGst)}</span>
                </div>
              </div>
            </div>

            {/* Margin warning badge */}
            {showMarginWarning && (
              <div className="flex items-center gap-2 text-xs text-destructive p-2 bg-destructive/5 rounded-md">
                <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {profitability?.calcFailed
                    ? "Profit summary unavailable — admin override required"
                    : `Margin (${profitability?.marginPercent.toFixed(1)}%) below threshold (${getMinMarginThreshold(companyId)}%)`}
                </span>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 p-3 rounded-md text-sm">
              <p className="font-medium text-primary mb-1">What will happen:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{totalMonths} separate invoices will be created</li>
                <li>Each invoice will cover one month's billing</li>
                <li>Invoices will be created in "Draft" status</li>
                <li>Pro-rata amounts will be calculated automatically</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGenerateWithProfitCheck} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate {totalMonths} Invoices
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profitability Gate Dialog */}
      {profitability && (
        <ProfitabilityGateDialog
          open={showProfitGate}
          onOpenChange={setShowProfitGate}
          profitability={profitability}
          campaignId={campaign.id}
          campaignName={campaign.campaign_name}
          isAdmin={isAdmin}
          companyId={companyId}
          onApproved={handleGenerate}
        />
      )}
    </>
  );
}
