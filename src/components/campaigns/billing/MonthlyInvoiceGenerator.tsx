import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, Check, FileText, Calendar, Lock, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { format, getDaysInMonth, startOfMonth, endOfMonth, max, min, differenceInDays, parseISO } from "date-fns";

interface CampaignAsset {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  direction?: string | null;
  illumination_type?: string | null;
  dimensions?: string | null;
  card_rate: number;
  negotiated_rate?: number;
  daily_rate?: number;
  billing_mode: string;
  booking_start_date?: string;
  start_date?: string;
  booking_end_date?: string;
  end_date?: string;
  printing_charges?: number;
  mounting_charges?: number;
  invoice_generated_months?: string[];
  printing_billed?: boolean;
  mounting_billed?: boolean;
  media_asset_code?: string;
  total_sqft?: number;
}

interface Campaign {
  id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  company_id?: string;
  gst_percent?: number;
}

interface AssetBillingPreview {
  campaignAsset: CampaignAsset;
  assetCode: string;
  billStartDate: Date;
  billEndDate: Date;
  billableDays: number;
  daysInMonth: number;
  rateType: 'monthly_prorata' | 'daily';
  monthlyRate: number;
  dailyRate: number;
  calculatedAmount: number;
  printingCost: number;
  mountingCost: number;
  alreadyInvoiced: boolean;
  printingAlreadyBilled: boolean;
  mountingAlreadyBilled: boolean;
}

interface ExistingInvoice {
  invoice_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

type GSTMode = 'CGST_SGST' | 'IGST';

interface MonthlyInvoiceGeneratorProps {
  campaign: Campaign;
  campaignAssets: CampaignAsset[];
  assetCodePrefix?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Helper: Round to 2 decimal places consistently
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getAvailableMonths(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  let current = startOfMonth(start);
  const endMonth = startOfMonth(end);
  
  while (current <= endMonth) {
    months.push(format(current, 'yyyy-MM'));
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  return months;
}

function calculateAssetBilling(
  asset: CampaignAsset,
  billingMonth: string,
  assetCodePrefix?: string | null
): AssetBillingPreview | null {
  const [year, month] = billingMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = getDaysInMonth(monthStart);
  
  // Get asset dates (prefer booking dates, fallback to start/end)
  const assetStart = parseISO(asset.booking_start_date || asset.start_date || '');
  const assetEnd = parseISO(asset.booking_end_date || asset.end_date || '');
  
  if (isNaN(assetStart.getTime()) || isNaN(assetEnd.getTime())) {
    return null;
  }
  
  // Calculate overlap
  const billStart = max([assetStart, monthStart]);
  const billEnd = min([assetEnd, monthEnd]);
  
  // If no overlap, skip
  if (billStart > billEnd) {
    return null;
  }
  
  const billableDays = differenceInDays(billEnd, billStart) + 1;
  
  // Check if already invoiced
  const invoicedMonths = asset.invoice_generated_months || [];
  const alreadyInvoiced = invoicedMonths.includes(billingMonth);
  
  // Check if one-time charges already billed
  const printingAlreadyBilled = asset.printing_billed ?? false;
  const mountingAlreadyBilled = asset.mounting_billed ?? false;
  
  // Calculate rates
  const monthlyRate = asset.negotiated_rate || asset.card_rate || 0;
  const dailyRate = asset.daily_rate || (monthlyRate / 30);
  
  // Default to monthly pro-rata
  const rateType = (asset.billing_mode === 'DAILY' ? 'daily' : 'monthly_prorata') as 'monthly_prorata' | 'daily';
  
  // Calculate amount based on billing mode
  let calculatedAmount: number;
  if (rateType === 'daily') {
    calculatedAmount = billableDays * dailyRate;
  } else {
    // Monthly pro-rata: (monthly_rate / days_in_month) * billable_days
    calculatedAmount = (monthlyRate / daysInMonth) * billableDays;
  }
  
  // Round to 2 decimal places
  calculatedAmount = round2(calculatedAmount);
  
  const assetCode = formatAssetDisplayCode({
    mediaAssetCode: asset.media_asset_code,
    fallbackId: asset.asset_id,
    companyPrefix: assetCodePrefix,
  });
  
  return {
    campaignAsset: asset,
    assetCode,
    billStartDate: billStart,
    billEndDate: billEnd,
    billableDays,
    daysInMonth,
    rateType,
    monthlyRate,
    dailyRate,
    calculatedAmount,
    printingCost: round2(asset.printing_charges || 0),
    mountingCost: round2(asset.mounting_charges || 0),
    alreadyInvoiced,
    printingAlreadyBilled,
    mountingAlreadyBilled,
  };
}

export function MonthlyInvoiceGenerator({
  campaign,
  campaignAssets,
  assetCodePrefix,
  open,
  onOpenChange,
  onSuccess,
}: MonthlyInvoiceGeneratorProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [includePrinting, setIncludePrinting] = useState(false);
  const [includeMounting, setIncludeMounting] = useState(false);
  const [oneTimeOnly, setOneTimeOnly] = useState(true);
  const [allowRebill, setAllowRebill] = useState(false);
  const [includeAlreadyInvoiced, setIncludeAlreadyInvoiced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<ExistingInvoice | null>(null);
  const [gstMode, setGstMode] = useState<GSTMode>('CGST_SGST');
  const [clientState, setClientState] = useState<string>('');
  const [companyState, setCompanyState] = useState<string>('');
  
  // Fetch client and company states for GST mode determination
  const fetchGSTInfo = useCallback(async () => {
    try {
      // Fetch client state
      const { data: clientData } = await supabase
        .from('clients')
        .select('billing_state')
        .eq('id', campaign.client_id)
        .single();
      
      // Fetch company state
      if (campaign.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('state')
          .eq('id', campaign.company_id)
          .single();
        
        const clientSt = clientData?.billing_state || '';
        const companySt = companyData?.state || 'Telangana'; // Default company state
        
        setClientState(clientSt);
        setCompanyState(companySt);
        
        // Determine GST mode
        if (clientSt && companySt && 
            clientSt.toLowerCase().trim() === companySt.toLowerCase().trim()) {
          setGstMode('CGST_SGST');
        } else if (clientSt) {
          setGstMode('IGST');
        } else {
          // Default to CGST_SGST if client state unknown
          setGstMode('CGST_SGST');
        }
      }
    } catch (err) {
      console.error('Error fetching GST info:', err);
    }
  }, [campaign.client_id, campaign.company_id]);
  
  // Check for existing invoice when month changes
  const checkExistingInvoice = useCallback(async (month: string) => {
    if (!month || !campaign.company_id) return;
    
    setCheckingExisting(true);
    setExistingInvoice(null);
    
    try {
      const { data, error } = await supabase.rpc('check_existing_monthly_invoice', {
        p_company_id: campaign.company_id,
        p_campaign_id: campaign.id,
        p_billing_month: month,
      });
      
      if (error) {
        console.error('Error checking existing invoice:', error);
      } else if (data && data.length > 0) {
        setExistingInvoice(data[0] as ExistingInvoice);
      }
    } catch (err) {
      console.error('Error checking existing invoice:', err);
    } finally {
      setCheckingExisting(false);
    }
  }, [campaign.company_id, campaign.id]);
  
  // Fetch GST info on open
  useEffect(() => {
    if (open) {
      fetchGSTInfo();
    }
  }, [open, fetchGSTInfo]);
  
  // Check existing invoice when month changes
  useEffect(() => {
    if (selectedMonth) {
      checkExistingInvoice(selectedMonth);
    }
  }, [selectedMonth, checkExistingInvoice]);
  
  // Get available months
  const availableMonths = useMemo(() => {
    return getAvailableMonths(campaign.start_date, campaign.end_date);
  }, [campaign.start_date, campaign.end_date]);
  
  // Calculate billing previews for all assets
  const billingPreviews = useMemo(() => {
    if (!selectedMonth) return [];
    
    return campaignAssets
      .map(asset => calculateAssetBilling(asset, selectedMonth, assetCodePrefix))
      .filter((preview): preview is AssetBillingPreview => preview !== null);
  }, [campaignAssets, selectedMonth, assetCodePrefix]);
  
  // Filter based on already invoiced toggle
  const filteredPreviews = useMemo(() => {
    if (includeAlreadyInvoiced) return billingPreviews;
    return billingPreviews.filter(p => !p.alreadyInvoiced);
  }, [billingPreviews, includeAlreadyInvoiced]);
  
  // Calculate totals with one-time charge logic and GST mode
  const totals = useMemo(() => {
    const baseTotal = filteredPreviews
      .filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced)
      .reduce((sum, p) => sum + p.calculatedAmount, 0);
    
    // Calculate printing charges per asset
    let printingTotal = 0;
    let mountingTotal = 0;
    
    if (includePrinting) {
      filteredPreviews.forEach(p => {
        if (p.billableDays > 0) {
          if (oneTimeOnly) {
            if (!p.printingAlreadyBilled || allowRebill) {
              printingTotal += p.printingCost;
            }
          } else {
            printingTotal += p.printingCost;
          }
        }
      });
    }
    
    if (includeMounting) {
      filteredPreviews.forEach(p => {
        if (p.billableDays > 0) {
          if (oneTimeOnly) {
            if (!p.mountingAlreadyBilled || allowRebill) {
              mountingTotal += p.mountingCost;
            }
          } else {
            mountingTotal += p.mountingCost;
          }
        }
      });
    }
    
    const subtotal = round2(baseTotal + printingTotal + mountingTotal);
    const gstPercent = campaign.gst_percent || 18;
    const gstAmount = round2(subtotal * (gstPercent / 100));
    const grandTotal = round2(subtotal + gstAmount);
    
    // Calculate CGST/SGST or IGST amounts
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (gstMode === 'CGST_SGST') {
      cgstAmount = round2(gstAmount / 2);
      sgstAmount = round2(gstAmount / 2);
    } else {
      igstAmount = round2(gstAmount);
    }
    
    // Count assets with pending one-time charges
    const pendingPrintingCount = filteredPreviews.filter(p => !p.printingAlreadyBilled && p.printingCost > 0).length;
    const pendingMountingCount = filteredPreviews.filter(p => !p.mountingAlreadyBilled && p.mountingCost > 0).length;
    
    return {
      baseTotal: round2(baseTotal),
      printingTotal: round2(printingTotal),
      mountingTotal: round2(mountingTotal),
      subtotal,
      gstPercent,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      pendingPrintingCount,
      pendingMountingCount,
    };
  }, [filteredPreviews, includePrinting, includeMounting, oneTimeOnly, allowRebill, includeAlreadyInvoiced, campaign.gst_percent, gstMode]);
  
  const alreadyInvoicedCount = billingPreviews.filter(p => p.alreadyInvoiced).length;
  const billableCount = billingPreviews.filter(p => !p.alreadyInvoiced).length;
  
  const handleGenerateInvoice = async () => {
    if (!selectedMonth || filteredPreviews.length === 0) return;
    
    // If existing invoice found, don't create new one
    if (existingInvoice && !includeAlreadyInvoiced) {
      toast({
        title: "Invoice Already Exists",
        description: `Invoice ${existingInvoice.invoice_id} already exists for this month. View it in the invoices list.`,
        variant: "destructive",
      });
      return;
    }
    
    setGenerating(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      
      // Generate invoice ID using RPC
      const { data: invoiceIdData, error: idError } = await supabase.rpc('generate_invoice_id');
      if (idError) throw new Error('Failed to generate invoice ID');
      const invoiceId = invoiceIdData as string;
      
      // Build items array for legacy compatibility
      const items = filteredPreviews
        .filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced)
        .map((preview, index) => ({
          sno: index + 1,
          description: `${preview.campaignAsset.media_type} - ${preview.campaignAsset.location}, ${preview.campaignAsset.area}`,
          asset_code: preview.assetCode,
          asset_id: preview.campaignAsset.asset_id,
          // Snapshot fields for stable PDFs
          location: preview.campaignAsset.location ?? null,
          area: preview.campaignAsset.area ?? null,
          direction: preview.campaignAsset.direction ?? null,
          media_type: preview.campaignAsset.media_type ?? null,
          illumination: preview.campaignAsset.illumination_type ?? null,
          dimension_text: preview.campaignAsset.dimensions ?? null,
          hsn_sac: '998361',
          period: `${format(preview.billStartDate, 'dd MMM')} - ${format(preview.billEndDate, 'dd MMM yyyy')}`,
          days: preview.billableDays,
          rate: preview.monthlyRate,
          amount: round2(preview.calculatedAmount),
        }));
      
      // Add printing/mounting if applicable
      if (includePrinting && totals.printingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Printing Charges (${filteredPreviews.filter(p => {
            if (oneTimeOnly && !allowRebill) return !p.printingAlreadyBilled && p.printingCost > 0;
            return p.printingCost > 0;
          }).length} assets)`,
          asset_code: '-',
          asset_id: '-',
          location: null,
          area: null,
          direction: null,
          media_type: null,
          illumination: null,
          dimension_text: null,
          hsn_sac: '998361',
          period: '',
          days: 0,
          rate: totals.printingTotal,
          amount: totals.printingTotal,
        });
      }
      
      if (includeMounting && totals.mountingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Mounting Charges (${filteredPreviews.filter(p => {
            if (oneTimeOnly && !allowRebill) return !p.mountingAlreadyBilled && p.mountingCost > 0;
            return p.mountingCost > 0;
          }).length} assets)`,
          asset_code: '-',
          asset_id: '-',
          location: null,
          area: null,
          direction: null,
          media_type: null,
          illumination: null,
          dimension_text: null,
          hsn_sac: '998361',
          period: '',
          days: 0,
          rate: totals.mountingTotal,
          amount: totals.mountingTotal,
        });
      }
      
      // Calculate period dates
      const [year, month] = selectedMonth.split('-').map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = endOfMonth(periodStart);
      
      // Due date: 30 days from period start
      const dueDate = new Date(periodStart);
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Determine GST split rates
      const gstHalfPercent = round2(totals.gstPercent / 2);
      
      // Create invoice with GST mode fields
      const { error: invoiceError } = await supabase.from('invoices').insert({
        id: invoiceId,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        client_name: campaign.client_name,
        company_id: campaign.company_id,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        invoice_period_start: format(periodStart, 'yyyy-MM-dd'),
        invoice_period_end: format(periodEnd, 'yyyy-MM-dd'),
        billing_month: selectedMonth,
        is_monthly_split: true,
        sub_total: totals.subtotal,
        gst_percent: totals.gstPercent,
        gst_amount: totals.gstAmount,
        gst_mode: gstMode,
        cgst_percent: gstMode === 'CGST_SGST' ? gstHalfPercent : 0,
        sgst_percent: gstMode === 'CGST_SGST' ? gstHalfPercent : 0,
        igst_percent: gstMode === 'IGST' ? totals.gstPercent : 0,
        cgst_amount: totals.cgstAmount,
        sgst_amount: totals.sgstAmount,
        igst_amount: totals.igstAmount,
        total_amount: totals.grandTotal,
        balance_due: totals.grandTotal,
        status: 'Draft',
        items,
        notes: `Monthly billing for ${campaign.campaign_name} - ${format(periodStart, 'MMMM yyyy')}`,
        created_by: userData.user.id,
      });
      
      if (invoiceError) throw invoiceError;
      
      // Create detailed invoice_items
      const invoiceItems = filteredPreviews
        .filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced)
        .map(preview => {
          // Determine if printing/mounting should be billed for this asset
          const shouldBillPrinting = includePrinting && preview.printingCost > 0 && 
            (oneTimeOnly ? (!preview.printingAlreadyBilled || allowRebill) : true);
          const shouldBillMounting = includeMounting && preview.mountingCost > 0 && 
            (oneTimeOnly ? (!preview.mountingAlreadyBilled || allowRebill) : true);
          
          return {
            invoice_id: invoiceId,
            campaign_asset_id: preview.campaignAsset.id,
            asset_id: preview.campaignAsset.asset_id,
            asset_code: preview.assetCode,
            description: `${preview.campaignAsset.media_type} - ${preview.campaignAsset.location}`,

            // Snapshot fields for stable PDFs (do not depend on lookups at render time)
            location: preview.campaignAsset.location ?? null,
            area: preview.campaignAsset.area ?? null,
            direction: preview.campaignAsset.direction ?? null,
            media_type: preview.campaignAsset.media_type ?? null,
            illumination: preview.campaignAsset.illumination_type ?? null,
            dimension_text: preview.campaignAsset.dimensions ?? null,
            hsn_sac: '998361',

            bill_start_date: format(preview.billStartDate, 'yyyy-MM-dd'),
            bill_end_date: format(preview.billEndDate, 'yyyy-MM-dd'),
            billable_days: preview.billableDays,
            rate_type: preview.rateType,
            rate_value: preview.monthlyRate,
            base_amount: round2(preview.calculatedAmount),
            printing_cost: shouldBillPrinting ? preview.printingCost : 0,
            mounting_cost: shouldBillMounting ? preview.mountingCost : 0,
            line_total: round2(preview.calculatedAmount + 
              (shouldBillPrinting ? preview.printingCost : 0) + 
              (shouldBillMounting ? preview.mountingCost : 0)),
          };
        });
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) {
        console.warn('Failed to create invoice_items:', itemsError);
        // Don't fail the whole operation
      }
      
      // Update campaign_assets with invoiced month AND one-time charge flags
      const assetUpdates = filteredPreviews
        .filter(p => !p.alreadyInvoiced)
        .map(async (p) => {
          const asset = campaignAssets.find(a => a.id === p.campaignAsset.id);
          const currentMonths = asset?.invoice_generated_months || [];
          const updatedMonths = [...new Set([...currentMonths, selectedMonth])];
          
          // Determine if printing/mounting was charged for this asset
          const printingCharged = includePrinting && p.printingCost > 0 && 
            (oneTimeOnly ? (!p.printingAlreadyBilled || allowRebill) : true);
          const mountingCharged = includeMounting && p.mountingCost > 0 && 
            (oneTimeOnly ? (!p.mountingAlreadyBilled || allowRebill) : true);
          
          const updateData: Record<string, any> = {
            invoice_generated_months: updatedMonths,
          };
          
          // Mark as billed if charges were included
          if (printingCharged) {
            updateData.printing_billed = true;
          }
          if (mountingCharged) {
            updateData.mounting_billed = true;
          }
          
          return supabase
            .from('campaign_assets')
            .update(updateData)
            .eq('id', p.campaignAsset.id);
        });
      
      await Promise.all(assetUpdates);
      
      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceId} created for ${format(periodStart, 'MMMM yyyy')} with ${filteredPreviews.length} assets`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Generate monthly invoice error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  // Count assets with already-billed one-time charges
  const printingBilledCount = billingPreviews.filter(p => p.printingAlreadyBilled).length;
  const mountingBilledCount = billingPreviews.filter(p => p.mountingAlreadyBilled).length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Monthly Invoice
          </DialogTitle>
          <DialogDescription>
            Create a monthly invoice for {campaign.campaign_name} based on asset overlap billing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Step 1: Select Month */}
          <div className="space-y-2">
            <Label>Select Billing Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select month..." />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => {
                  const [y, m] = month.split('-').map(Number);
                  const date = new Date(y, m - 1, 1);
                  return (
                    <SelectItem key={month} value={month}>
                      {format(date, 'MMMM yyyy')}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Existing Invoice Warning - DB Level Check */}
          {checkingExisting && selectedMonth && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking for existing invoice...</span>
            </div>
          )}
          
          {existingInvoice && !checkingExisting && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Invoice Already Exists for this Month</p>
                  <p className="text-sm">
                    Invoice {existingInvoice.invoice_id} ({existingInvoice.status}) - 
                    {formatCurrency(existingInvoice.total_amount)}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => window.open(`/admin/invoices/${existingInvoice.invoice_id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Invoice
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* GST Mode Indicator */}
          {selectedMonth && !existingInvoice && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">GST Mode:</span>
                <Badge variant={gstMode === 'CGST_SGST' ? 'secondary' : 'outline'}>
                  {gstMode === 'CGST_SGST' ? 'CGST + SGST (Intra-State)' : 'IGST (Inter-State)'}
                </Badge>
              </div>
              {clientState && companyState && (
                <span className="text-xs text-muted-foreground">
                  Company: {companyState} → Client: {clientState}
                </span>
              )}
            </div>
          )}
          
          {selectedMonth && billingPreviews.length > 0 && !existingInvoice && (
            <>
              {/* Already Invoiced Warning */}
              {alreadyInvoicedCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {alreadyInvoicedCount} of {billingPreviews.length} assets have already been invoiced for this month.
                    </span>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeInvoiced"
                        checked={includeAlreadyInvoiced}
                        onCheckedChange={(checked) => setIncludeAlreadyInvoiced(!!checked)}
                      />
                      <Label htmlFor="includeInvoiced" className="text-sm cursor-pointer">
                        Include anyway (admin override)
                      </Label>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Asset Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Billing Period</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingPreviews.map(preview => (
                      <TableRow 
                        key={preview.campaignAsset.id}
                        className={preview.alreadyInvoiced && !includeAlreadyInvoiced ? 'opacity-50' : ''}
                      >
                        <TableCell className="font-mono text-sm">
                          {preview.assetCode}
                        </TableCell>
                        <TableCell className="text-sm">
                          {preview.campaignAsset.area}, {preview.campaignAsset.city}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(preview.billStartDate, 'dd MMM')} - {format(preview.billEndDate, 'dd MMM')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{preview.billableDays}/{preview.daysInMonth}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(preview.monthlyRate)}/mo
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(preview.calculatedAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {preview.alreadyInvoiced ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              Already Invoiced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* One-time Charges Section */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">One-time Charges</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="oneTimeOnly"
                        checked={oneTimeOnly}
                        onCheckedChange={(checked) => setOneTimeOnly(!!checked)}
                      />
                      <Label htmlFor="oneTimeOnly" className="text-sm cursor-pointer">
                        One-time only
                      </Label>
                    </div>
                    {oneTimeOnly && (printingBilledCount > 0 || mountingBilledCount > 0) && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="allowRebill"
                          checked={allowRebill}
                          onCheckedChange={(checked) => setAllowRebill(!!checked)}
                        />
                        <Label htmlFor="allowRebill" className="text-xs cursor-pointer text-muted-foreground">
                          Allow re-bill (admin)
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printing"
                      checked={includePrinting}
                      onCheckedChange={(checked) => setIncludePrinting(!!checked)}
                    />
                    <Label htmlFor="printing" className="text-sm cursor-pointer flex items-center gap-2">
                      Printing
                      {oneTimeOnly && printingBilledCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          {printingBilledCount} already billed
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        ({formatCurrency(filteredPreviews.reduce((s, p) => s + p.printingCost, 0))} total)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mounting"
                      checked={includeMounting}
                      onCheckedChange={(checked) => setIncludeMounting(!!checked)}
                    />
                    <Label htmlFor="mounting" className="text-sm cursor-pointer flex items-center gap-2">
                      Mounting
                      {oneTimeOnly && mountingBilledCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          {mountingBilledCount} already billed
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        ({formatCurrency(filteredPreviews.reduce((s, p) => s + p.mountingCost, 0))} total)
                      </span>
                    </Label>
                  </div>
                </div>
                
                {oneTimeOnly && (totals.pendingPrintingCount > 0 || totals.pendingMountingCount > 0) && (
                  <p className="text-xs text-muted-foreground">
                    {totals.pendingPrintingCount > 0 && `${totals.pendingPrintingCount} assets pending printing. `}
                    {totals.pendingMountingCount > 0 && `${totals.pendingMountingCount} assets pending mounting.`}
                  </p>
                )}
              </div>
              
              {/* Totals */}
              <div className="border rounded-lg p-4 bg-card space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Display Rent ({billableCount} assets)</span>
                  <span>{formatCurrency(totals.baseTotal)}</span>
                </div>
                {totals.printingTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Printing</span>
                    <span>{formatCurrency(totals.printingTotal)}</span>
                  </div>
                )}
                {totals.mountingTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Mounting</span>
                    <span>{formatCurrency(totals.mountingTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {gstMode === 'CGST_SGST' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>CGST ({totals.gstPercent / 2}%)</span>
                      <span>{formatCurrency(totals.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST ({totals.gstPercent / 2}%)</span>
                      <span>{formatCurrency(totals.sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span>IGST ({totals.gstPercent}%)</span>
                    <span>{formatCurrency(totals.igstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </>
          )}
          
          {selectedMonth && billingPreviews.length === 0 && (
            <Alert>
              <AlertDescription>
                No assets have billing overlap with the selected month.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateInvoice}
            disabled={generating || !selectedMonth || !!existingInvoice || filteredPreviews.filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced).length === 0}
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
