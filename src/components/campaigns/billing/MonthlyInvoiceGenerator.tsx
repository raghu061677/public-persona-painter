import { useState, useMemo } from "react";
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
import { Loader2, AlertTriangle, Check, FileText, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { generateInvoiceId } from "@/utils/finance";
import { format, getDaysInMonth, startOfMonth, endOfMonth, max, min, differenceInDays, parseISO } from "date-fns";

interface CampaignAsset {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
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
  alreadyInvoiced: boolean;
}

interface MonthlyInvoiceGeneratorProps {
  campaign: Campaign;
  campaignAssets: CampaignAsset[];
  assetCodePrefix?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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
  calculatedAmount = Math.round(calculatedAmount * 100) / 100;
  
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
    alreadyInvoiced,
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
  const [includeAlreadyInvoiced, setIncludeAlreadyInvoiced] = useState(false);
  const [generating, setGenerating] = useState(false);
  
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
  
  // Calculate totals
  const totals = useMemo(() => {
    const baseTotal = filteredPreviews
      .filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced)
      .reduce((sum, p) => sum + p.calculatedAmount, 0);
    
    // One-time charges: only include if this is the first month being invoiced
    const isFirstInvoice = billingPreviews.every(p => (p.campaignAsset.invoice_generated_months?.length || 0) === 0);
    
    let printingTotal = 0;
    let mountingTotal = 0;
    
    if (includePrinting && isFirstInvoice) {
      printingTotal = filteredPreviews.reduce(
        (sum, p) => sum + (p.campaignAsset.printing_charges || 0), 
        0
      );
    }
    
    if (includeMounting && isFirstInvoice) {
      mountingTotal = filteredPreviews.reduce(
        (sum, p) => sum + (p.campaignAsset.mounting_charges || 0), 
        0
      );
    }
    
    const subtotal = baseTotal + printingTotal + mountingTotal;
    const gstPercent = campaign.gst_percent || 18;
    const gstAmount = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
    const grandTotal = subtotal + gstAmount;
    
    return {
      baseTotal: Math.round(baseTotal * 100) / 100,
      printingTotal,
      mountingTotal,
      subtotal: Math.round(subtotal * 100) / 100,
      gstPercent,
      gstAmount,
      grandTotal: Math.round(grandTotal * 100) / 100,
      isFirstInvoice,
    };
  }, [filteredPreviews, includePrinting, includeMounting, includeAlreadyInvoiced, billingPreviews, campaign.gst_percent]);
  
  const alreadyInvoicedCount = billingPreviews.filter(p => p.alreadyInvoiced).length;
  const billableCount = billingPreviews.filter(p => !p.alreadyInvoiced).length;
  
  const handleGenerateInvoice = async () => {
    if (!selectedMonth || filteredPreviews.length === 0) return;
    
    setGenerating(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      
      // Generate invoice ID
      const invoiceId = await generateInvoiceId(supabase);
      
      // Build items array for legacy compatibility
      const items = filteredPreviews
        .filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced)
        .map((preview, index) => ({
          sno: index + 1,
          description: `${preview.campaignAsset.media_type} - ${preview.campaignAsset.location}, ${preview.campaignAsset.area}`,
          asset_code: preview.assetCode,
          asset_id: preview.campaignAsset.asset_id,
          period: `${format(preview.billStartDate, 'dd MMM')} - ${format(preview.billEndDate, 'dd MMM yyyy')}`,
          days: preview.billableDays,
          rate: preview.monthlyRate,
          amount: preview.calculatedAmount,
        }));
      
      // Add printing/mounting if applicable
      if (includePrinting && totals.printingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Printing Charges (${filteredPreviews.length} assets)`,
          asset_code: '',
          asset_id: '',
          period: '',
          days: 0,
          rate: totals.printingTotal,
          amount: totals.printingTotal,
        });
      }
      
      if (includeMounting && totals.mountingTotal > 0) {
        items.push({
          sno: items.length + 1,
          description: `Mounting Charges (${filteredPreviews.length} assets)`,
          asset_code: '',
          asset_id: '',
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
      
      // Create invoice
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
        .map(preview => ({
          invoice_id: invoiceId,
          campaign_asset_id: preview.campaignAsset.id,
          asset_id: preview.campaignAsset.asset_id,
          asset_code: preview.assetCode,
          description: `${preview.campaignAsset.media_type} - ${preview.campaignAsset.location}`,
          bill_start_date: format(preview.billStartDate, 'yyyy-MM-dd'),
          bill_end_date: format(preview.billEndDate, 'yyyy-MM-dd'),
          billable_days: preview.billableDays,
          rate_type: preview.rateType,
          rate_value: preview.monthlyRate,
          base_amount: preview.calculatedAmount,
          printing_cost: includePrinting && totals.isFirstInvoice ? (preview.campaignAsset.printing_charges || 0) : 0,
          mounting_cost: includeMounting && totals.isFirstInvoice ? (preview.campaignAsset.mounting_charges || 0) : 0,
          line_total: preview.calculatedAmount,
        }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) {
        console.warn('Failed to create invoice_items:', itemsError);
        // Don't fail the whole operation
      }
      
      // Update campaign_assets with invoiced month
      const assetIdsToUpdate = filteredPreviews
        .filter(p => !p.alreadyInvoiced)
        .map(p => p.campaignAsset.id);
      
      if (assetIdsToUpdate.length > 0) {
        // Update each asset's invoice_generated_months array
        for (const assetId of assetIdsToUpdate) {
          const asset = campaignAssets.find(a => a.id === assetId);
          const currentMonths = asset?.invoice_generated_months || [];
          const updatedMonths = [...new Set([...currentMonths, selectedMonth])];
          
          await supabase
            .from('campaign_assets')
            .update({ invoice_generated_months: updatedMonths })
            .eq('id', assetId);
        }
      }
      
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
          
          {selectedMonth && billingPreviews.length > 0 && (
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
              
              {/* One-time Charges */}
              {totals.isFirstInvoice && (
                <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Include One-time Charges:</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="printing"
                      checked={includePrinting}
                      onCheckedChange={(checked) => setIncludePrinting(!!checked)}
                    />
                    <Label htmlFor="printing" className="text-sm cursor-pointer">
                      Printing ({formatCurrency(filteredPreviews.reduce((s, p) => s + (p.campaignAsset.printing_charges || 0), 0))})
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mounting"
                      checked={includeMounting}
                      onCheckedChange={(checked) => setIncludeMounting(!!checked)}
                    />
                    <Label htmlFor="mounting" className="text-sm cursor-pointer">
                      Mounting ({formatCurrency(filteredPreviews.reduce((s, p) => s + (p.campaignAsset.mounting_charges || 0), 0))})
                    </Label>
                  </div>
                </div>
              )}
              
              {!totals.isFirstInvoice && (
                <Alert>
                  <AlertDescription>
                    One-time charges (printing/mounting) are only included in the first month's invoice.
                  </AlertDescription>
                </Alert>
              )}
              
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
                <div className="flex justify-between text-sm">
                  <span>GST ({totals.gstPercent}%)</span>
                  <span>{formatCurrency(totals.gstAmount)}</span>
                </div>
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
            disabled={generating || !selectedMonth || filteredPreviews.filter(p => !p.alreadyInvoiced || includeAlreadyInvoiced).length === 0}
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
