import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateInvoiceId } from "@/utils/finance";

interface GenerateInvoiceDialogProps {
  campaign: any;
  campaignAssets: any[];
  displayCost: number;
  printingTotal: number;
  mountingTotal: number;
  discount: number;
}

export function GenerateInvoiceDialog({
  campaign,
  campaignAssets,
  displayCost,
  printingTotal,
  mountingTotal,
  discount,
}: GenerateInvoiceDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default 30 days from today
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState("");

  // Fetch client GST applicability
  useEffect(() => {
    if (open && campaign.client_id) {
      fetchClientGstStatus();
    }
  }, [open, campaign.client_id]);

  const fetchClientGstStatus = async () => {
    const { data: client } = await supabase
      .from('clients')
      .select('is_gst_applicable')
      .eq('id', campaign.client_id)
      .single();
    
    setIsGstApplicable(client?.is_gst_applicable !== false);
  };

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);

      // Get terms & conditions
      const { data: termsData } = await supabase
        .from('plan_terms_settings')
        .select('terms')
        .single();

      // Generate invoice ID - pass effective GST rate for correct prefix (INV vs INV-Z)
      const gstRateForId = isGstApplicable ? (campaign.gst_percent || 18) : 0;
      const invoiceId = await generateInvoiceId(supabase, gstRateForId);

      // Prepare invoice items - use campaign_assets pricing (locked from Plan)
      const items = campaignAssets.map((asset, index) => {
        // Use negotiated_rate (final price) from campaign_assets, not card_rate
        const assetDisplayCost = asset.negotiated_rate || asset.card_rate || 0;
        const assetPrintingCost = asset.printing_charges || 0;
        const assetMountingCost = asset.mounting_charges || 0;
        const assetSubtotal = assetDisplayCost + assetPrintingCost + assetMountingCost;
        
        return {
          sno: index + 1,
          description: `${asset.media_type} - ${asset.location}, ${asset.area}, ${asset.city}`,
          asset_id: asset.asset_id,
          campaign_asset_id: asset.id,
          dimensions: asset.dimensions || 'N/A',
          location: asset.location || '',
          area: asset.area || '',
          direction: asset.direction || '',
          media_type: asset.media_type || '',
          illumination_type: asset.illumination_type || '',
          total_sqft: asset.total_sqft || 0,
          quantity: 1,
          rate: assetDisplayCost,
          rent_amount: assetDisplayCost,
          display_rate: assetDisplayCost,
          printing_charges: assetPrintingCost,
          mounting_charges: assetMountingCost,
          printing_cost: assetPrintingCost,
          mounting_cost: assetMountingCost,
          amount: assetSubtotal,
          total: assetSubtotal,
          subtotal: assetSubtotal,
          booking_start_date: asset.booking_start_date || asset.start_date,
          booking_end_date: asset.booking_end_date || asset.end_date,
          hsn_sac: '998361',
        };
      });

      // Calculate totals using campaign_assets pricing
      const sub_total = displayCost + printingTotal + mountingTotal - discount;
      // Use correct GST based on client setting
      const effectiveGstPercent = isGstApplicable ? (campaign.gst_percent || 18) : 0;
      const gst_amount = isGstApplicable ? campaign.gst_amount : 0;
      const total_amount = sub_total + gst_amount;
      const balance_due = total_amount;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create invoice - include company_id for RLS
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          client_id: campaign.client_id,
          client_name: campaign.client_name,
          campaign_id: campaign.id,
          company_id: campaign.company_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          sub_total,
          gst_percent: effectiveGstPercent,
          gst_amount,
          total_amount,
          balance_due,
          status: 'Draft' as const,
          items,
          notes: notes || `Tax Invoice for campaign: ${campaign.campaign_name}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice ${invoiceId} created successfully`,
      });

      setOpen(false);
      
      // Navigate to invoice detail page
      navigate(`/admin/invoices/view/${encodeURIComponent(invoiceId)}`);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Invoice from Campaign</DialogTitle>
          <DialogDescription>
            Create an invoice for {campaign.campaign_name} with {campaignAssets.length} assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm">Invoice Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{campaign.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign:</span>
                <span className="font-medium">{campaign.campaign_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Display Cost:</span>
                <span className="font-medium">₹{displayCost.toLocaleString('en-IN')}</span>
              </div>
              {printingTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Printing:</span>
                  <span className="font-medium">₹{printingTotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mounting:</span>
                <span className="font-medium">₹{mountingTotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span className="font-medium">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between col-span-2 pt-2 border-t">
                <span className="text-muted-foreground">Taxable:</span>
                <span className="font-semibold">₹{campaign.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({campaign.gst_percent}%):</span>
                <span className="font-medium">₹{campaign.gst_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between col-span-2 pt-2 border-t-2 font-bold">
                <span>Grand Total:</span>
                <span className="text-primary">₹{campaign.grand_total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes for the invoice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Terms Info */}
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="font-medium mb-1">Invoice will include:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Detailed line items for each asset with breakdown</li>
              <li>Pro-rata display cost calculation ({campaign.duration_days} days)</li>
              <li>Printing costs (₹15 per sqft) and mounting charges (₹1,500 per asset)</li>
              <li>GST breakdown ({campaign.gst_percent}%)</li>
              <li>Standard terms & conditions</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateInvoice} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
