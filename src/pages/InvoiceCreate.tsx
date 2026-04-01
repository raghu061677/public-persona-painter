import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, generateDraftInvoiceId } from "@/utils/finance";
import { useCompany } from "@/contexts/CompanyContext";
import { ProfitabilityGateDialog } from "@/components/campaigns/ProfitabilityGateDialog";
import { useCampaignProfitability, isProfitLockEnabled, getMinMarginThreshold } from "@/hooks/useCampaignProfitability";
import { useEmailTrigger, buildInvoicePayload } from "@/hooks/useEmailTrigger";
import { useFormValidation } from "@/hooks/useFormValidation";
import { invoiceCreateSchema } from "@/lib/validation/schemas";
import { FieldError } from "@/components/ui/field-error";

interface Campaign {
  id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  grand_total: number;
  gst_amount: number;
  gst_percent: number;
  subtotal: number;
  start_date: string;
  end_date: string;
  status: string;
  company_id?: string;
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const companyId = company?.id;
  const { trigger: triggerEmail, ConfirmDialog: EmailConfirmDialog } = useEmailTrigger();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [showProfitGate, setShowProfitGate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Profitability check for selected campaign
  const { data: profitability } = useCampaignProfitability(
    selectedCampaignId || undefined,
    companyId,
    selectedCampaign?.grand_total || 0
  );

  useEffect(() => {
    if (companyId) fetchEligibleCampaigns();
  }, [companyId]);

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

  const fetchEligibleCampaigns = async () => {
    setLoading(true);
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, campaign_name, client_id, client_name, grand_total, gst_amount, gst_percent, subtotal, start_date, end_date, status, company_id, client_po_number, client_po_date')
        .eq('company_id', companyId)
        .in('status', ['Running', 'Completed', 'Planned'])
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('campaign_id')
        .eq('company_id', companyId)
        .not('campaign_id', 'is', null);

      const invoicedCampaignIds = new Set(existingInvoices?.map(inv => inv.campaign_id) || []);
      const eligibleCampaigns = (campaignsData || []).filter(
        campaign => !invoicedCampaignIds.has(campaign.id)
      );

      setCampaigns(eligibleCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    }
    setLoading(false);
  };

  const { fieldErrors, validate, clearError } = useFormValidation(invoiceCreateSchema);

  const handleCreateWithProfitCheck = () => {
    // Schema validation first
    const parsed = validate({
      campaign_id: selectedCampaignId,
      invoice_date: invoiceDate,
      due_date: dueDate,
    });
    if (!parsed) return;

    if (!selectedCampaign) {
      toast({ title: "Error", description: "Please select a campaign", variant: "destructive" });
      return;
    }

    // Check profitability gate
    if (isProfitLockEnabled(companyId) && profitability) {
      const minMargin = getMinMarginThreshold(companyId);
      if (profitability.marginPercent < minMargin || profitability.calcFailed) {
        setShowProfitGate(true);
        return;
      }
    }

    handleCreateInvoice();
  };

  const handleCreateInvoice = async () => {
    if (!selectedCampaign) return;

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: campaignItems } = await supabase
        .from('campaign_items')
        .select('*, media_assets(id, media_asset_code, location, area, city, media_type, dimensions, direction, illumination_type, total_sqft)')
        .eq('campaign_id', selectedCampaignId);

      const items = (campaignItems || []).map((item, index) => {
        const displayAssetCode = item.media_assets?.media_asset_code || null;
        return {
          sno: index + 1,
          asset_id: item.asset_id,
          asset_code: displayAssetCode,
          media_asset_code: displayAssetCode,
          location: item.media_assets?.location || `Asset ${displayAssetCode}`,
          description: item.media_assets 
            ? `${item.media_assets.media_type} - ${item.media_assets.location}, ${item.media_assets.area}, ${item.media_assets.city}`
            : `Media Display - ${displayAssetCode}`,
          area: item.media_assets?.area || '',
          zone: item.media_assets?.area || '',
          media_type: item.media_assets?.media_type || 'Bus Shelter',
          direction: item.media_assets?.direction || '',
          illumination_type: item.media_assets?.illumination_type || 'NonLit',
          dimensions: item.media_assets?.dimensions || 'N/A',
          total_sqft: item.media_assets?.total_sqft || '',
          start_date: item.start_date,
          end_date: item.end_date,
          booking_period: item.start_date && item.end_date 
            ? `${new Date(item.start_date).toLocaleDateString('en-IN')} - ${new Date(item.end_date).toLocaleDateString('en-IN')}`
            : '',
          quantity: item.quantity || 1,
          rate: item.negotiated_rate || item.card_rate,
          unit_price: item.negotiated_rate || item.card_rate,
          display_rate: item.negotiated_rate || item.card_rate,
          mounting_cost: item.mounting_charge || 0,
          printing_cost: item.printing_charge || 0,
          amount: item.final_price || (item.negotiated_rate || item.card_rate) * (item.quantity || 1),
        };
      });

      const gstRate = selectedCampaign.gst_percent || 0;
      const invoiceId = await generateInvoiceId(supabase, gstRate);
      const subTotal = selectedCampaign.subtotal || selectedCampaign.grand_total / (1 + gstRate / 100);
      const gstAmount = selectedCampaign.gst_amount || subTotal * (gstRate / 100);
      const totalAmount = selectedCampaign.grand_total;

      const { error } = await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          client_id: selectedCampaign.client_id,
          client_name: selectedCampaign.client_name,
          campaign_id: selectedCampaign.id,
          company_id: companyId,
          invoice_date: invoiceDate,
          due_date: dueDate,
          status: 'Draft',
          items: items,
          sub_total: subTotal,
          gst_percent: 18,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          balance_due: totalAmount,
          notes: `Invoice for campaign: ${selectedCampaign.campaign_name}`,
          client_po_number: (selectedCampaign as any).client_po_number || null,
          client_po_date: (selectedCampaign as any).client_po_date || null,
          created_by: user.id,
        });

      if (error) throw error;

      // Trigger invoice email notifications
      try {
        const invoiceData = { id: invoiceId, invoice_no: invoiceId, invoice_date: invoiceDate, due_date: dueDate, total_amount: totalAmount, balance_due: totalAmount, client_name: selectedCampaign.client_name };
        const emailPayload = buildInvoicePayload(invoiceData, { name: selectedCampaign.client_name }, company);
        triggerEmail('invoice_generated_internal', emailPayload, [{ to: company?.email || '' }], invoiceId);
        // Client notification (confirm mode)
        const { data: client } = await supabase.from('clients').select('email, name').eq('id', selectedCampaign.client_id).single();
        if (client?.email) {
          triggerEmail('invoice_generated_client', emailPayload, [{ to: client.email, name: client.name }], invoiceId);
        }
      } catch (emailErr) {
        console.warn('[InvoiceCreate] Email trigger failed (non-blocking):', emailErr);
      }

      toast({ title: "Success", description: "Invoice created successfully" });
      navigate(`/admin/invoices/view/${encodeURIComponent(invoiceId)}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({ title: "Error", description: error.message || "Failed to create invoice", variant: "destructive" });
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showMarginWarning = selectedCampaign && profitability && isProfitLockEnabled(companyId) &&
    (profitability.marginPercent < getMinMarginThreshold(companyId) || profitability.calcFailed);

  return (
    <ModuleGuard module="finance">
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Invoice</h1>
            <p className="text-muted-foreground mt-1">
              Generate an invoice from a campaign
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Campaign Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Campaign</CardTitle>
              <CardDescription>
                Choose a campaign to generate an invoice from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign</Label>
                <Select value={selectedCampaignId} onValueChange={(v) => { setSelectedCampaignId(v); clearError("campaign_id"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No eligible campaigns found
                      </div>
                    ) : (
                      campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{campaign.campaign_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {campaign.client_name} • {formatINR(campaign.grand_total)}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FieldError error={fieldErrors.campaign_id} />
              </div>

              {selectedCampaign && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{selectedCampaign.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">
                      {selectedCampaign.start_date} to {selectedCampaign.end_date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{selectedCampaign.status}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-lg">{formatINR(selectedCampaign.grand_total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Set invoice dates and other information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => { setInvoiceDate(e.target.value); clearError("invoice_date"); }}
                />
                <FieldError error={fieldErrors.invoice_date} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); clearError("due_date"); }}
                />
                <FieldError error={fieldErrors.due_date} />
              </div>

              {selectedCampaign && (
                <div className="p-4 bg-muted rounded-lg space-y-2 mt-4">
                  <h4 className="font-medium">Invoice Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatINR(selectedCampaign.subtotal || selectedCampaign.grand_total / 1.18)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span>{formatINR(selectedCampaign.gst_amount || (selectedCampaign.grand_total / 1.18) * 0.18)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatINR(selectedCampaign.grand_total)}</span>
                  </div>
                </div>
              )}

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

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={handleCreateWithProfitCheck}
                disabled={!selectedCampaign || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profitability Gate Dialog */}
      {profitability && selectedCampaign && (
        <ProfitabilityGateDialog
          open={showProfitGate}
          onOpenChange={setShowProfitGate}
          profitability={profitability}
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.campaign_name}
          isAdmin={isAdmin}
          companyId={companyId}
          onApproved={handleCreateInvoice}
        />
      )}
    </div>
    </ModuleGuard>
  );
}
