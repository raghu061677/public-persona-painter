import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { FileText, CalendarDays, Loader2, Info } from "lucide-react";
import { BillingSummaryCard } from "./BillingSummaryCard";
import { MonthlyBillingScheduleTable } from "./MonthlyBillingScheduleTable";
import { 
  useCampaignBillingPeriods, 
  BillingPeriod,
  calculatePeriodAmount 
} from "./useCampaignBillingPeriods";
import { GenerateMonthlyInvoicesDialog } from "../GenerateMonthlyInvoicesDialog";
import { generateInvoiceId } from "@/utils/finance";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";

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
  };
  campaignAssets: any[];
  displayCost: number;
  onRefresh?: () => void;
}

interface InvoiceRecord {
  id: string;
  invoice_period_start: string;
  invoice_period_end: string;
  total_amount: number;
  balance_due: number;
  status: string;
  due_date: string;
}

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

  const printingTotal = campaign.printing_total || 0;
  const mountingTotal = campaign.mounting_total || 0;

  // Calculate billing periods
  const billingSummary = useCampaignBillingPeriods({
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    totalAmount: displayCost,
    printingTotal,
    mountingTotal,
    gstPercent: campaign.gst_percent || 18,
  });

  // Fetch existing invoices for this campaign
  useEffect(() => {
    fetchExistingInvoices();
  }, [campaign.id]);

  const fetchExistingInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_period_start, invoice_period_end, total_amount, balance_due, status, due_date')
        .eq('campaign_id', campaign.id)
        .eq('is_monthly_split', true)
        .order('invoice_period_start', { ascending: true });

      if (error) throw error;
      setExistingInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = existingInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Generate invoice for a single period
  const handleGenerateInvoice = async (
    period: BillingPeriod, 
    includePrinting: boolean, 
    includeMounting: boolean
  ) => {
    setGenerating(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Calculate amounts
      const amounts = calculatePeriodAmount(
        period,
        billingSummary.monthlyBaseRent,
        billingSummary.gstPercent,
        includePrinting,
        includeMounting,
        printingTotal,
        mountingTotal
      );

      // Generate invoice ID
      const invoiceId = await generateInvoiceId(supabase);

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

      if (includePrinting && printingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Printing Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: printingTotal,
          amount: printingTotal,
        });
      }

      if (includeMounting && mountingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Mounting Charges (${campaignAssets.length} assets)`,
          quantity: 1,
          rate: mountingTotal,
          amount: mountingTotal,
        });
      }

      // Calculate due date (30 days from period start)
      const dueDate = new Date(period.periodStart);
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
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
        gst_percent: billingSummary.gstPercent,
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
    navigate(`/admin/invoices/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (billingSummary.periods.length === 0) {
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
      {/* Billing Summary */}
      <BillingSummaryCard
        campaign={campaign}
        totalMonths={billingSummary.totalMonths}
        monthlyBaseRent={billingSummary.monthlyBaseRent}
        printingTotal={printingTotal}
        mountingTotal={mountingTotal}
        gstPercent={billingSummary.gstPercent}
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
      />

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Monthly Billing Schedule
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate invoices for each billing period individually or all at once.
          </p>
        </div>
        <Button onClick={() => setShowBulkDialog(true)} variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Generate All Invoices
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select which months should include one-time charges (printing & mounting) before generating invoices.
          These charges are typically applied to the first invoice.
        </AlertDescription>
      </Alert>

      {/* Monthly Schedule Table */}
      <MonthlyBillingScheduleTable
        periods={billingSummary.periods}
        monthlyBaseRent={billingSummary.monthlyBaseRent}
        gstPercent={billingSummary.gstPercent}
        printingTotal={printingTotal}
        mountingTotal={mountingTotal}
        existingInvoices={existingInvoices}
        onGenerateInvoice={handleGenerateInvoice}
        onViewInvoice={handleViewInvoice}
        isGenerating={generating}
      />

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
    </div>
  );
}
