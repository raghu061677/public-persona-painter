import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { FileText, CalendarDays, Loader2, Info, Receipt, Calculator, RotateCcw } from "lucide-react";
import { AssetCycleBillingPreview } from "./AssetCycleBillingPreview";
import { BillingSummaryCard } from "./BillingSummaryCard";
import { MonthlyBillingScheduleTable } from "./MonthlyBillingScheduleTable";
import { MonthlyInvoiceGenerator } from "./MonthlyInvoiceGenerator";
import { computeCampaignTotals, calculatePeriodAmountFromTotals, BillingPeriodInfo } from "@/utils/computeCampaignTotals";
import { GenerateMonthlyInvoicesDialog } from "../GenerateMonthlyInvoicesDialog";
import { generateDraftInvoiceId } from "@/utils/finance";
import { buildRegistrationSnapshot } from "@/utils/invoiceRegistrationSnapshot";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { getFYRange } from "@/utils/finance";
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
    tax_type?: string;
  };
  campaignAssets: any[];
  displayCost: number;
  onRefresh?: () => void;
}

interface InvoiceRecord {
  id: string;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  billing_month: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  due_date: string;
  is_monthly_split: boolean | null;
}

type BillingMode = 'monthly' | 'single' | 'asset_cycle';
type GSTMode = 'CGST_SGST' | 'IGST';

export function CampaignBillingTab({
  campaign,
  campaignAssets,
  displayCost,
  onRefresh,
}: CampaignBillingTabProps) {
  const navigate = useNavigate();
  const [existingInvoices, setExistingInvoices] = useState<InvoiceRecord[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<Record<string, { payment_date: string; tds_amount: number; tds_rate: number | null; net_received: number }>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAssetLevelDialog, setShowAssetLevelDialog] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>('monthly');
  const [lockedBillingMode, setLockedBillingMode] = useState<BillingMode | null>(null);
  const [gstMode, setGstMode] = useState<GSTMode>('CGST_SGST');
   
   // Only use actual manual_discount_amount from database - no auto-derivation
   const storedDiscount = Number(campaign.manual_discount_amount) || 0;
   const [localDiscount, setLocalDiscount] = useState(storedDiscount);
   
   // Sync local discount with campaign changes
   useEffect(() => {
     setLocalDiscount(storedDiscount);
   }, [storedDiscount]);

  // Determine GST mode (IGST vs CGST+SGST) using 3-tier priority
  useEffect(() => {
    (async () => {
      // Priority 1: campaign's saved tax_type
      if (campaign.tax_type === 'igst') { setGstMode('IGST'); return; }
      if (campaign.tax_type === 'cgst_sgst') { setGstMode('CGST_SGST'); return; }

      // Priority 2: registration-aware billing state
      let billingState = '';
      const regId = (campaign as any).client_registration_id;
      if (regId) {
        const { data: regData } = await supabase
          .from('client_registrations')
          .select('billing_state')
          .eq('id', regId)
          .maybeSingle();
        billingState = regData?.billing_state || '';
      }

      // Priority 3: fallback to client billing_state
      if (!billingState && campaign.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('billing_state')
          .eq('id', campaign.client_id)
          .maybeSingle();
        billingState = clientData?.billing_state || '';
      }

      // Compare with company state
      if (campaign.company_id && billingState) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('state')
          .eq('id', campaign.company_id)
          .maybeSingle();
        const companyState = companyData?.state || 'Telangana';
        if (billingState.toLowerCase().trim() !== companyState.toLowerCase().trim()) {
          setGstMode('IGST');
        } else {
          setGstMode('CGST_SGST');
        }
      }
    })();
  }, [campaign.tax_type, campaign.client_id, campaign.company_id]);

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
        .select('id, invoice_period_start, invoice_period_end, billing_month, total_amount, balance_due, status, due_date, is_monthly_split, billing_mode')
        .eq('campaign_id', campaign.id)
        .order('invoice_period_start', { ascending: true });

      if (error) throw error;
      setExistingInvoices(data || []);

      // Fetch payment details (date, TDS, net received) for paid invoices
      const paidIds = (data || []).filter(inv => inv.status === 'Paid').map(inv => inv.id);
      if (paidIds.length > 0) {
        const { data: payments } = await supabase
          .from('payment_records')
          .select('invoice_id, payment_date, tds_amount, tds_rate, amount')
          .in('invoice_id', paidIds)
          .order('payment_date', { ascending: false });
        
        const summaryMap: Record<string, { payment_date: string; tds_amount: number; tds_rate: number | null; net_received: number }> = {};
        (payments || []).forEach(p => {
          if (!p.invoice_id) return;
          if (!summaryMap[p.invoice_id]) {
            summaryMap[p.invoice_id] = {
              payment_date: p.payment_date || '',
              tds_amount: 0,
              tds_rate: null,
              net_received: 0,
            };
          }
          summaryMap[p.invoice_id].tds_amount += Number(p.tds_amount || 0);
          summaryMap[p.invoice_id].net_received += Number(p.amount || 0);
          if (p.tds_rate && summaryMap[p.invoice_id].tds_rate === null) {
            summaryMap[p.invoice_id].tds_rate = Number(p.tds_rate);
          }
        });
        setPaymentSummaries(summaryMap);
      } else {
        setPaymentSummaries({});
      }
      
      // Auto-detect and lock billing mode based on existing non-cancelled invoices
      const activeInvoices = (data || []).filter(inv => inv.status !== 'Cancelled');
      if (activeInvoices.length > 0) {
        const hasAssetCycle = activeInvoices.some((inv: any) => inv.billing_mode === 'asset_cycle');
        const hasMonthly = activeInvoices.some((inv: any) => inv.billing_mode === 'calendar_monthly' || inv.is_monthly_split === true);
        const hasSingle = activeInvoices.some((inv: any) => inv.billing_mode === 'single_invoice' || (!inv.billing_mode && inv.is_monthly_split !== true));
        if (hasAssetCycle) {
          setBillingMode('asset_cycle');
          setLockedBillingMode('asset_cycle');
        } else if (hasMonthly) {
          setBillingMode('monthly');
          setLockedBillingMode('monthly');
        } else if (hasSingle) {
          setBillingMode('single');
          setLockedBillingMode('single');
        }
      } else {
        setLockedBillingMode(null);
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

      // Generate draft invoice ID - permanent number assigned on finalization
      const invoiceId = generateDraftInvoiceId();

      // Phase 4A: fetch registration snapshot (empty if none linked)
      const regSnapshot = await buildRegistrationSnapshot(campaign.id);

      // Fetch media_asset_code for all campaign assets
      const assetIds = campaignAssets.map(a => a.asset_id).filter(Boolean);
      const { data: maData } = assetIds.length > 0
        ? await supabase.from('media_assets').select('id, media_asset_code').in('id', assetIds)
        : { data: [] };
      const maCodeMap = new Map((maData || []).map((m: any) => [m.id, m.media_asset_code || null]));

      // Build per-asset detailed items
      const items: any[] = campaignAssets.map((ca: any, idx: number) => {
        // Prioritize pre-calculated rent_amount (prorated for actual booked days) over raw monthly rate
        // CRITICAL: Use nullish coalescing (??) so rent_amount=0 is respected, never fall back to negotiated_rate
        const rentAmt = ca.rent_amount ?? ca.rate ?? ca.amount ?? ca.negotiated_rate ?? ca.card_rate ?? 0;
        const printAmt = ca.printing_charges || ca.printing_cost || 0;
        const mountAmt = ca.mounting_charges || ca.mounting_cost || 0;
        const lineTotal = rentAmt + printAmt + mountAmt;
        const resolvedCode = maCodeMap.get(ca.asset_id) || null;
        return {
          sno: idx + 1,
          asset_id: ca.asset_id,
          asset_code: resolvedCode,
          media_asset_code: resolvedCode,
          campaign_asset_id: ca.id,
          description: `${ca.media_type || 'Display'} - ${ca.location || ''}, ${ca.area || ''}, ${ca.city || ''}`,
          location: ca.location || null,
          area: ca.area || null,
          direction: ca.direction || null,
          media_type: ca.media_type || null,
          illumination_type: ca.illumination_type || null,
          dimensions: ca.dimensions || null,
          total_sqft: ca.total_sqft || 0,
          // Date priority: effective > booking > raw (prevents stale end_date from inflating duration)
          booking_start_date: ca.effective_start_date || ca.booking_start_date || ca.start_date,
          booking_end_date: ca.effective_end_date || ca.booking_end_date || ca.end_date,
          booked_days: ca.booked_days,
          daily_rate: ca.daily_rate,
          quantity: 1,
          rate: rentAmt,
          rent_amount: rentAmt,
          display_rate: ca.negotiated_rate || ca.card_rate || 0, // monthly rate for reference
          printing_charges: printAmt,
          mounting_charges: mountAmt,
          amount: lineTotal,
          total: lineTotal,
          hsn_sac: '998361',
        };
      });

      if (totals.manualDiscountAmount > 0) {
        items.push({
          sno: items.length + 1,
          description: `Discount (Before GST)`,
          quantity: 1,
          rate: -totals.manualDiscountAmount,
          amount: -totals.manualDiscountAmount,
        });
      }

      // Smart date: backdate to previous FY if campaign ended before current FY start
      const currentFY = getFYRange(new Date());
      const campaignEnd = new Date(campaign.end_date);
      const invoiceDate = campaignEnd < currentFY.start
        ? new Date(currentFY.start.getFullYear(), currentFY.start.getMonth() - 1, new Date(currentFY.start.getFullYear(), currentFY.start.getMonth(), 0).getDate())
        : new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // GST mode
      const isIGST = gstMode === 'IGST';
      const gstHalf = totals.gstRate / 2;

      // Create invoice
      const { error } = await supabase.from('invoices').insert({
        id: invoiceId,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        client_name: campaign.client_name,
        company_id: campaign.company_id,
        invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        invoice_period_start: campaign.start_date,
        invoice_period_end: campaign.end_date,
        billing_mode: 'single_invoice',
        billing_window_key: campaign.start_date,
        is_monthly_split: false,
        sub_total: totals.taxableAmount,
        gst_percent: totals.gstRate,
        gst_amount: totals.gstAmount,
        total_amount: totals.grandTotal,
        balance_due: totals.grandTotal,
        tax_type: isIGST ? 'igst' : 'cgst_sgst',
        gst_mode: gstMode,
        cgst_percent: isIGST ? 0 : gstHalf,
        sgst_percent: isIGST ? 0 : gstHalf,
        igst_percent: isIGST ? totals.gstRate : 0,
        cgst_amount: isIGST ? 0 : totals.gstAmount / 2,
        sgst_amount: isIGST ? 0 : totals.gstAmount / 2,
        igst_amount: isIGST ? totals.gstAmount : 0,
        status: 'Draft',
        is_draft: true,
        items,
        notes: `Single invoice for campaign: ${campaign.campaign_name}`,
        created_by: userData.user.id,
        ...regSnapshot,
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

      // Phase 4A: fetch registration snapshot (empty if none linked)
      const regSnapshot = await buildRegistrationSnapshot(campaign.id);

      // Calculate amounts using new calculator
      const amounts = calculatePeriodAmountFromTotals(period, totals, includePrinting, includeMounting);

      // Check if an invoice already exists for this period (match by billing_month key)
      // Search ALL existing invoices (not just monthly), to avoid duplicate key constraint violations
      const existingInvoice = existingInvoices
        .filter(inv => !['Cancelled', 'Void'].includes(inv.status))
        .find(inv => {
          if (inv.billing_month) {
            return inv.billing_month === period.monthKey;
          }
          // Fallback: compare date strings
          const invStart = inv.invoice_period_start;
          const periodStartStr = format(period.periodStart, 'yyyy-MM-dd');
          return invStart === periodStartStr;
        });

      // Fetch media_asset_code for all campaign assets
      const assetIds = campaignAssets.map(a => a.asset_id).filter(Boolean);
      const { data: maData } = assetIds.length > 0
        ? await supabase.from('media_assets').select('id, media_asset_code').in('id', assetIds)
        : { data: [] };
      const maCodeMap = new Map((maData || []).map((m: any) => [m.id, m.media_asset_code || null]));

      // Build per-asset detailed items for this period
      const items: any[] = campaignAssets.map((ca: any, idx: number) => {
        // CRITICAL: Use prorated rent_amount, never raw negotiated_rate
        const rentAmt = ca.rent_amount ?? ca.rate ?? ca.amount ?? ca.negotiated_rate ?? ca.card_rate ?? 0;
        const printAmt = (includePrinting ? (ca.printing_charges || ca.printing_cost || 0) : 0);
        const mountAmt = (includeMounting ? (ca.mounting_charges || ca.mounting_cost || 0) : 0);
        const lineTotal = rentAmt + printAmt + mountAmt;
        const resolvedCode = maCodeMap.get(ca.asset_id) || null;
        return {
          sno: idx + 1,
          asset_id: ca.asset_id,
          asset_code: resolvedCode,
          media_asset_code: resolvedCode,
          campaign_asset_id: ca.id,
          description: `${ca.media_type || 'Display'} - ${ca.location || ''}, ${ca.area || ''}, ${ca.city || ''}`,
          location: ca.location || null,
          area: ca.area || null,
          direction: ca.direction || null,
          media_type: ca.media_type || null,
          illumination_type: ca.illumination_type || null,
          dimensions: ca.dimensions || null,
          total_sqft: ca.total_sqft || 0,
          booking_start_date: format(period.periodStart, 'yyyy-MM-dd'),
          booking_end_date: format(period.periodEnd, 'yyyy-MM-dd'),
          booked_days: ca.booked_days,
          daily_rate: ca.daily_rate,
          quantity: 1,
          rate: rentAmt,
          rent_amount: rentAmt,
          display_rate: ca.negotiated_rate || ca.card_rate || 0,
          printing_charges: printAmt,
          mounting_charges: mountAmt,
          amount: lineTotal,
          total: lineTotal,
          hsn_sac: '998361',
        };
      });

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
        // Generate draft invoice ID - permanent number assigned on finalization
        const invoiceId = generateDraftInvoiceId();

        // Use pre-determined GST mode from state (3-tier priority: campaign.tax_type → registration → client state)
        const isIGST = gstMode === 'IGST';
        const gstHalf = totals.gstRate / 2;

        const { error } = await supabase.from('invoices').insert({
          id: invoiceId,
          invoice_no: invoiceId,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
          client_name: campaign.client_name,
          company_id: campaign.company_id,
          invoice_date: format(period.periodStart, 'yyyy-MM-dd'),
          due_date: format(dueDate, 'yyyy-MM-dd'),
          invoice_period_start: format(period.periodStart, 'yyyy-MM-dd'),
          invoice_period_end: format(period.periodEnd, 'yyyy-MM-dd'),
          billing_month: period.monthKey,
          is_monthly_split: true,
          sub_total: amounts.subtotal,
          gst_percent: totals.gstRate,
          gst_amount: amounts.gstAmount,
          total_amount: amounts.total,
          balance_due: amounts.total,
          tax_type: isIGST ? 'igst' : 'cgst_sgst',
          gst_mode: gstMode,
          cgst_percent: isIGST ? 0 : gstHalf,
          sgst_percent: isIGST ? 0 : gstHalf,
          igst_percent: isIGST ? totals.gstRate : 0,
          cgst_amount: isIGST ? 0 : amounts.gstAmount / 2,
          sgst_amount: isIGST ? 0 : amounts.gstAmount / 2,
          igst_amount: isIGST ? amounts.gstAmount : 0,
          status: 'Draft',
          is_draft: true,
          items,
          notes: `Monthly billing for ${campaign.campaign_name} - ${period.label}`,
          created_by: userData.user.id,
          ...regSnapshot,
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
      {(
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Billing Type
              {lockedBillingMode && (
                <Badge variant="outline" className="text-xs font-normal">
                  🔒 Locked — invoices already generated
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={billingMode} 
              onValueChange={(val) => {
                if (!lockedBillingMode) setBillingMode(val as BillingMode);
              }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className={`flex items-center space-x-2 p-3 border rounded-lg flex-1 ${lockedBillingMode && lockedBillingMode !== 'monthly' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}>
                <RadioGroupItem value="monthly" id="monthly" disabled={!!lockedBillingMode && lockedBillingMode !== 'monthly'} />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div className="font-medium">Calendar Monthly</div>
                  <div className="text-sm text-muted-foreground">
                    Generate separate invoices for each calendar month
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg flex-1 ${lockedBillingMode && lockedBillingMode !== 'single' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}>
                <RadioGroupItem value="single" id="single" disabled={!!lockedBillingMode && lockedBillingMode !== 'single'} />
                <Label htmlFor="single" className="flex-1 cursor-pointer">
                  <div className="font-medium">Single Invoice</div>
                  <div className="text-sm text-muted-foreground">
                    Generate one invoice for the entire campaign
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg border-dashed flex-1 ${lockedBillingMode && lockedBillingMode !== 'asset_cycle' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'}`}>
                <RadioGroupItem value="asset_cycle" id="asset_cycle" disabled={!!lockedBillingMode && lockedBillingMode !== 'asset_cycle'} />
                <Label htmlFor="asset_cycle" className="flex-1 cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    Asset Cycle Billing
                  </div>
                  <div className="text-sm text-muted-foreground">
                    30-day cycles per asset using final negotiated price
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
            {totals.billingPeriods.length > 1 && existingInvoices.filter(inv => !['Cancelled', 'Void'].includes(inv.status)).length === 0 && (
              <Button
                onClick={() => setShowBulkDialog(true)}
                disabled={generating}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate All Invoices
              </Button>
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
            campaignAssets={campaignAssets}
            existingInvoices={existingInvoices}
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
            {/* Show existing invoices list if any exist (including cancelled for audit trail) */}
            {singleInvoices.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Generated Invoices:</div>
                {singleInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      inv.status === 'Cancelled' ? 'bg-muted/50 opacity-60' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{inv.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "N/A"}
                        </div>
                        {inv.status === 'Paid' && paymentSummaries[inv.id] && (
                          <>
                            {paymentSummaries[inv.id].payment_date && (
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Paid on: {format(new Date(paymentSummaries[inv.id].payment_date), "dd MMM yyyy")}
                              </div>
                            )}
                            {paymentSummaries[inv.id].tds_amount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                TDS Deducted: ₹{paymentSummaries[inv.id].tds_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                            {paymentSummaries[inv.id].tds_rate !== null && paymentSummaries[inv.id].tds_rate! > 0 && (
                              <div className="text-xs text-muted-foreground">
                                TDS Rate: {paymentSummaries[inv.id].tds_rate}%
                              </div>
                            )}
                            {paymentSummaries[inv.id].net_received > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Net Received: ₹{paymentSummaries[inv.id].net_received.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Cancelled' ? 'destructive' : inv.status === 'Draft' ? 'secondary' : 'outline'}>
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
            )}
            {/* Show Generate Single Invoice button if no active (non-cancelled) single invoices exist */}
            {singleInvoices.filter(inv => inv.status !== 'Cancelled').length === 0 && (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No invoices generated yet for this campaign.
                </p>
                <Button
                  onClick={handleGenerateSingleInvoice}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Generate Single Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Asset Cycle Billing */}
      {billingMode === 'asset_cycle' && (
        <AssetCycleBillingPreview
          campaignAssets={campaignAssets}
          gstPercent={totals.gstRate}
          campaignEndDate={campaign.end_date}
          campaignId={campaign.id}
          clientId={campaign.client_id}
          clientName={campaign.client_name}
          companyId={campaign.company_id}
          campaignName={campaign.campaign_name}
          taxType={campaign.tax_type}
          gstMode={gstMode}
          onInvoiceGenerated={() => {
            fetchExistingInvoices();
            onRefresh?.();
          }}
        />
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
          ...({
            id: campaign.id,
            campaign_name: campaign.campaign_name,
            client_id: campaign.client_id,
            client_name: campaign.client_name,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            company_id: campaign.company_id,
            gst_percent: totals.gstRate,
          }),
          ...((campaign as any).tax_type ? { tax_type: (campaign as any).tax_type } : {}),
        } as any}
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
