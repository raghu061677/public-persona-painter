import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { Calendar, Receipt, CreditCard, Percent, Edit2, Check, X, Tag } from "lucide-react";
import { CampaignTotalsResult } from "@/utils/computeCampaignTotals";
import { Separator } from "@/components/ui/separator";

interface BillingSummaryCardProps {
  campaign: {
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    billing_cycle?: string;
  };
  totals: CampaignTotalsResult;
  totalInvoiced: number;
  totalPaid: number;
  onDiscountChange?: (amount: number, reason?: string) => void;
  isEditable?: boolean;
}

export function BillingSummaryCard({
  campaign,
  totals,
  totalInvoiced,
  totalPaid,
  onDiscountChange,
  isEditable = true,
}: BillingSummaryCardProps) {
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState(String(totals.manualDiscountAmount || 0));
  const [discountReason, setDiscountReason] = useState("");

  // Sync with external changes
  useEffect(() => {
    setDiscountInput(String(totals.manualDiscountAmount || 0));
  }, [totals.manualDiscountAmount]);

  const periodLabel = `${format(totals.campaignPeriodStart, "dd MMM yyyy")} – ${format(totals.campaignPeriodEnd, "dd MMM yyyy")}`;
  const isMonthlyBilling = (campaign.billing_cycle || '').toLowerCase() === 'monthly';
  
  const handleSaveDiscount = () => {
    const amount = parseFloat(discountInput) || 0;
    if (amount < 0) {
      setDiscountInput("0");
      return;
    }
    if (amount > totals.grossAmount) {
      setDiscountInput(String(totals.grossAmount));
      return;
    }
    onDiscountChange?.(amount, discountReason || undefined);
    setIsEditingDiscount(false);
  };

  const handleCancelEdit = () => {
    setDiscountInput(String(totals.manualDiscountAmount || 0));
    setIsEditingDiscount(false);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Billing Summary
          </div>
          {isMonthlyBilling && totals.totalMonths > 1 && (
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
              Monthly Billing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Campaign Period & Duration */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {/* Campaign Period */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Campaign Period
            </div>
            <p className="font-medium text-sm">{periodLabel}</p>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Duration</div>
            <p className="font-semibold">{totals.durationDays} days</p>
          </div>

          {/* Total Assets */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Assets</div>
            <p className="font-semibold">{totals.totalAssets}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Financial Breakdown - Matches Financial Summary exactly */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Display Cost</span>
            <span className="font-medium">{formatCurrency(totals.displayCost)}</span>
          </div>
          
          {totals.printingCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Printing Cost</span>
              <span>{formatCurrency(totals.printingCost)}</span>
            </div>
          )}
          
          {totals.mountingCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mounting Cost</span>
              <span>{formatCurrency(totals.mountingCost)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-medium pt-1 border-t">
            <span>Gross Amount</span>
            <span>{formatCurrency(totals.grossAmount)}</span>
          </div>

          {/* Manual Discount (Editable) */}
          <div className="flex justify-between text-sm items-center py-2 bg-muted/30 rounded px-2 -mx-2">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 font-medium">Discount (Before GST)</span>
            </div>
            {isEditingDiscount ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="text-sm mr-1">₹</span>
                  <Input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-24 h-7 text-sm"
                    min={0}
                    max={totals.grossAmount}
                    autoFocus
                  />
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveDiscount}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">
                  {totals.manualDiscountAmount > 0 ? `- ${formatCurrency(totals.manualDiscountAmount)}` : '₹0'}
                </span>
                {isEditable && onDiscountChange && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setIsEditingDiscount(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="font-medium">Taxable Amount</span>
            <span className="font-medium">{formatCurrency(totals.taxableAmount)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              GST ({totals.gstRate}%)
            </span>
            <span>{formatCurrency(totals.gstAmount)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-primary/30">
            <span className="font-bold text-base">Grand Total</span>
            <span className="font-bold text-base text-primary">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* Monthly Billing Info (only if monthly mode and multiple months) */}
        {isMonthlyBilling && totals.totalMonths > 1 && (
          <div className="mt-4 pt-4 border-t bg-muted/20 rounded-lg p-3 -mx-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">Monthly Breakdown</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Months:</span>
                <span className="font-medium ml-2">{totals.totalMonths}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Rent:</span>
                <span className="font-medium ml-2">{formatCurrency(totals.monthlyDisplayRent)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Progress */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Payment Progress:</span>
            </div>
            <div className="flex gap-3">
              <span>
                <span className="text-muted-foreground">Invoiced:</span>{" "}
                <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Paid:</span>{" "}
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
