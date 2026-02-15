import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { FileText, CalendarDays, Loader2, Info, Receipt, Calculator } from "lucide-react";
import { BillingSummaryCard } from "./BillingSummaryCard";
import { MonthlyBillingScheduleTable } from "./MonthlyBillingScheduleTable";
import { MonthlyInvoiceGenerator } from "./MonthlyInvoiceGenerator";
import { computeCampaignTotals, calculatePeriodAmountFromTotals, BillingPeriodInfo } from "@/utils/computeCampaignTotals";
import { GenerateMonthlyInvoicesDialog } from "../GenerateMonthlyInvoicesDialog";
import { generateInvoiceId } from "@/utils/finance";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CampaignBillingTabProps {
  campaign: {
    id: string;
    campaign_name: string;
    client_id: string;
    client_name: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    gst_amount: number;
    gst_percent: number;
    printing_total?: number;
    mounting_total?: number;
    subtotal?: number;
    billing_cycle?: string;
    company_id?: string;
    manual_discount_amount?: number;
    manual_discount_reason?: string;
  };
  campaignAssets: any[];
  displayCost: number;
  onRefresh?: () => void;
}

interface InvoiceRecord {
  id: string;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  due_date: string;
  is_monthly_split: boolean | null;
}

type BillingMode = 'monthly' | 'single';

export function CampaignBillingTab({
  campaign,
  campaignAssets,
  displayCost,
  onRefresh,
}: CampaignBillingTabProps) {
  const navigate = useNavigate();
  const [existingInvoices, setExistingInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAssetLevelDialog, setShowAssetLevelDialog] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>('monthly');
   
   // Only use actual manual_discount_amount from database - no auto-derivation
   const storedDiscount = Number(campaign.manual_discount_amount) || 0;
   const [localDiscount, setLocalDiscount] = useState(storedDiscount);
   
   // Sync local discount with campaign changes
   useEffect(() => {
     setLocalDiscount(storedDiscount);
   }, [storedDiscount]);

  // Use single source of truth calculator
  const totals = computeCampaignTotals({
    campaign: {
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      gst_percent: campaign.gst_percent,
      billing_cycle: campaign.billing_cycle,
      manual_discount_amount: localDiscount,
    },
    campaignAssets,
    manualDiscountAmount: localDiscount,
  });

  // Fetch existing invoices for this campaign (both monthly split and single)
  useEffect(() => {
    fetchExistingInvoices();
  }, [campaign.id]);

  const fetchExistingInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_period_start, invoice_period_end, total_amount, balance_due, status, due_date, is_monthly_split')
        .eq('campaign_id', campaign.id)
        .order('invoice_period_start', { ascending: true });

      if (error) throw error;
      setExistingInvoices(data || []);
      
      // Auto-detect billing mode based on existing invoices
      if (data && data.length > 0) {
        const hasSingleInvoice = data.some(inv => inv.is_monthly_split === false || inv.is_monthly_split === null);
        const hasMonthlyInvoices = data.some(inv => inv.is_monthly_split === true);
        if (hasSingleInvoice && !hasMonthlyInvoices) {
          setBillingMode('single');
        }
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle discount change
  const handleDiscountChange = async (amount: number, reason?: string) => {
    setLocalDiscount(amount);
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          manual_discount_amount: amount,
          manual_discount_reason: reason || null,
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Discount Updated",
        description: `Manual discount of ${formatCurrency(amount)} saved.`,
      });
      
      // Refresh invoices and parent campaign data
      await fetchExistingInvoices();
      onRefresh?.();
    } catch (err: any) {
      console.error('Error saving discount:', err);
      toast({
        title: "Error",
        description: "Failed to save discount",
        variant: "destructive",
      });
    }
  };

  // Separate invoices by type
  const monthlyInvoices = existingInvoices.filter(inv => inv.is_monthly_split === true);
  const singleInvoices = existingInvoices.filter(inv => inv.is_monthly_split === false || inv.is_monthly_split === null);

  // Calculate totals
  const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = existingInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Generate single invoice for entire campaign
  const handleGenerateSingleInvoice = async () => {
    setGenerating(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Generate invoice ID
      const invoiceId = await generateInvoiceId(supabase);

      // Build items array
      const items: any[] = [];
      
      items.push({
        sno: 1,
        description: `Display Rent - ${format(totals.campaignPeriodStart, "dd MMM yyyy")} to ${format(totals.campaignPeriodEnd, "dd MMM yyyy")} (${totals.durationDays} days)`,
        quantity: 1,
        rate: totals.displayCost,
        amount: totals.displayCost,
      });

      if (totals.printingCost > 0) {
        items.push({
          sno: items.length + 1,
          description: `Printing Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: totals.printingCost,
          amount: totals.printingCost,
        });
      }

      if (totals.mountingCost > 0) {
        items.push({
          sno: items.length + 1,
          description: `Mounting Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: totals.mountingCost,
          amount: totals.mountingCost,
        });
      }

      if (totals.manualDiscountAmount > 0) {
        items.push({
          sno: items.length + 1,
          description: `Discount (Before GST)`,
          quantity: 1,
          rate: -totals.manualDiscountAmount,
          amount: -totals.manualDiscountAmount,
        });
      }

      // Calculate due date (30 days from invoice date)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
      const { error } = await supabase.from('invoices').insert({
        id: invoiceId,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        client_name: campaign.client_name,
        company_id: campaign.company_id,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        invoice_period_start: campaign.start_date,
        invoice_period_end: campaign.end_date,
        is_monthly_split: false,
        sub_total: totals.taxableAmount,
        gst_percent: totals.gstRate,
        gst_amount: totals.gstAmount,
        total_amount: totals.grandTotal,
        balance_due: totals.grandTotal,
        status: 'Draft',
        items,
        notes: `Single invoice for campaign: ${campaign.campaign_name}`,
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceId} created for entire campaign`,
      });

      // Refresh data
      await fetchExistingInvoices();
      onRefresh?.();
    } catch (err: any) {
      console.error('Generate single invoice error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate invoice for a single period
  const handleGenerateInvoice = async (
    period: BillingPeriodInfo, 
    includePrinting: boolean, 
    includeMounting: boolean
  ) => {
    setGenerating(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Calculate amounts using new calculator
      const amounts = calculatePeriodAmountFromTotals(period, totals, includePrinting, includeMounting);

      // Check if an invoice already exists for this period
      const existingInvoice = monthlyInvoices.find(inv => {
        const invStart = new Date(inv.invoice_period_start);
        const invEnd = new Date(inv.invoice_period_end);
        return (
          invStart.getTime() === period.periodStart.getTime() &&
          invEnd.getTime() === period.periodEnd.getTime()
        );
      });

      // Build items array
      const items: any[] = [
        {
          sno: 1,
          description: `Display Rent - ${period.label} (${format(period.periodStart, "dd MMM")} to ${format(period.periodEnd, "dd MMM yyyy")})`,
          quantity: 1,
          rate: amounts.baseRent,
          amount: amounts.baseRent,
        },
      ];

      if (includePrinting && totals.printingCost > 0) {
        items.push({
          sno: items.length + 1,
          description: `Printing Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: totals.printingCost,
          amount: totals.printingCost,
        });
      }

      if (includeMounting && totals.mountingCost > 0) {
        items.push({
          sno: items.length + 1,
          description: `Mounting Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: totals.mountingCost,
          amount: totals.mountingCost,
        });
      }

      if (amounts.discount > 0) {
        items.push({
          sno: items.length + 1,
          description: `Discount (Before GST)`,
          quantity: 1,
          rate: -amounts.discount,
          amount: -amounts.discount,
        });
      }

      // Calculate due date (30 days from period start)
      const dueDate = new Date(period.periodStart);
      dueDate.setDate(dueDate.getDate() + 30);

      if (existingInvoice) {
        // UPDATE existing invoice - keep same ID and status
        const { error } = await supabase.from('invoices').update({
          sub_total: amounts.subtotal,
          gst_percent: totals.gstRate,
          gst_amount: amounts.gstAmount,
          total_amount: amounts.total,
          balance_due: amounts.total,
          items,
          notes: `Monthly billing for ${campaign.campaign_name} - ${period.label}`,
          updated_at: new Date().toISOString(),
        }).eq('id', existingInvoice.id);

        if (error) throw error;

        toast({
          title: "Invoice Updated",
          description: `Invoice ${existingInvoice.id} updated for ${period.label}`,
        });
      } else {
        // Generate new invoice ID and INSERT
        const invoiceId = await generateInvoiceId(supabase);

        const { error } = await supabase.from('invoices').insert({
          id: invoiceId,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
          client_name: campaign.client_name,
          company_id: campaign.company_id,
          invoice_date: format(period.periodStart, 'yyyy-MM-dd'),
          due_date: format(dueDate, 'yyyy-MM-dd'),
          invoice_period_start: format(period.periodStart, 'yyyy-MM-dd'),
          invoice_period_end: format(period.periodEnd, 'yyyy-MM-dd'),
          is_monthly_split: true,
          sub_total: amounts.subtotal,
          gst_percent: totals.gstRate,
          gst_amount: amounts.gstAmount,
          total_amount: amounts.total,
          balance_due: amounts.total,
          status: 'Draft',
          items,
          notes: `Monthly billing for ${campaign.campaign_name} - ${period.label}`,
          created_by: userData.user.id,
        });

        if (error) throw error;

        toast({
          title: "Invoice Generated",
          description: `Invoice ${invoiceId} created for ${period.label}`,
        });
      }

      // Refresh data
      await fetchExistingInvoices();
      onRefresh?.();
    } catch (err: any) {
      console.error('Generate invoice error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/admin/invoices/view/${encodeURIComponent(invoiceId)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (totals.billingPeriods.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Billing Periods</h3>
            <p className="text-muted-foreground mb-4">
              Unable to calculate billing periods for this campaign.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Summary - Now uses single source of truth */}
      <BillingSummaryCard
        campaign={campaign}
        totals={totals}
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
        onDiscountChange={handleDiscountChange}
        isEditable={true}
      />

      {/* Billing Mode Selector */}
      {totals.billingPeriods.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Generation Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={billingMode} 
              onValueChange={(val) => setBillingMode(val as BillingMode)}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 flex-1">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div className="font-medium">Monthly Invoices</div>
                  <div className="text-sm text-muted-foreground">
                    Generate separate invoices for each billing period
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 flex-1">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex-1 cursor-pointer">
                  <div className="font-medium">Single Invoice</div>
                  <div className="text-sm text-muted-foreground">
                    Generate one invoice for the entire campaign
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Monthly Billing Mode */}
      {billingMode === 'monthly' && (
        <>
          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {totals.billingPeriods.length > 1 ? 'Monthly Billing Schedule' : 'Billing Schedule'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {totals.billingPeriods.length > 1
                  ? 'Generate invoices for each billing period individually or all at once.'
                  : 'Generate a single pro-rata invoice for this short campaign.'}
              </p>
            </div>
            {totals.billingPeriods.length > 1 && (
              <div className="flex gap-2">
                <Button onClick={() => setShowAssetLevelDialog(true)} variant="default">
                  <Calculator className="mr-2 h-4 w-4" />
                  Asset-Level Monthly Invoice
                </Button>
                <Button onClick={() => setShowBulkDialog(true)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate All Invoices
                </Button>
              </div>
            )}
          </div>

          {/* Info Alert */}
          {totals.oneTimeCharges > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select which billing period should include one-time charges (printing & mounting) before generating invoices.
              </AlertDescription>
            </Alert>
          )}

          {/* Monthly Schedule Table */}
          <MonthlyBillingScheduleTable
            periods={totals.billingPeriods}
             totals={totals}
            existingInvoices={monthlyInvoices}
            onGenerateInvoice={handleGenerateInvoice}
            onViewInvoice={handleViewInvoice}
            isGenerating={generating}
            printingBilled={campaignAssets.some(a => a.printing_billed)}
            mountingBilled={campaignAssets.some(a => a.mounting_billed)}
          />
        </>
      )}

      {/* Single Invoice Mode */}
      {billingMode === 'single' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Single Campaign Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invoice Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Campaign Period</div>
                <div className="font-medium text-sm">
                  {format(totals.campaignPeriodStart, "dd MMM yyyy")} - {format(totals.campaignPeriodEnd, "dd MMM yyyy")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Display Rent</div>
                <div className="font-medium">{formatCurrency(totals.displayCost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Printing + Mounting</div>
                <div className="font-medium">{formatCurrency(totals.oneTimeCharges)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">GST ({totals.gstRate}%)</div>
                <div className="font-medium">{formatCurrency(totals.gstAmount)}</div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Total Invoice Amount</div>
                <div className="text-sm text-muted-foreground">
                  Includes all rent, printing, mounting, and GST
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totals.grandTotal)}
              </div>
            </div>

            <Separator />

            {/* Existing Single Invoices */}
            {singleInvoices.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Generated Invoices:</div>
                {singleInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{inv.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Draft' ? 'secondary' : 'outline'}>
                        {inv.status}
                      </Badge>
                      <div className="font-medium">{formatCurrency(inv.total_amount)}</div>
                      <Button size="sm" variant="outline" onClick={() => handleViewInvoice(inv.id)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Button 
                onClick={handleGenerateSingleInvoice} 
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Single Invoice for Entire Campaign
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Generate Dialog */}
      <GenerateMonthlyInvoicesDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        campaign={{
          id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_name: campaign.client_name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          total_amount: campaign.total_amount,
          gst_amount: campaign.gst_amount,
        }}
        onGenerated={() => {
          fetchExistingInvoices();
          onRefresh?.();
        }}
      />

      {/* Asset-Level Monthly Invoice Generator */}
      <MonthlyInvoiceGenerator
        campaign={{
          id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_id: campaign.client_id,
          client_name: campaign.client_name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          company_id: campaign.company_id,
          gst_percent: totals.gstRate,
        }}
        campaignAssets={campaignAssets}
        open={showAssetLevelDialog}
        onOpenChange={setShowAssetLevelDialog}
        onSuccess={() => {
          fetchExistingInvoices();
          onRefresh?.();
        }}
      />
    </div>
  );
}
