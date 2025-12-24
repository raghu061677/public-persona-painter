import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR } from "@/utils/finance";
import { useCompany } from "@/contexts/CompanyContext";

interface Campaign {
  id: string;
  campaign_name: string;
  client_id: string;
  client_name: string;
  grand_total: number;
  gst_amount: number;
  subtotal: number;
  start_date: string;
  end_date: string;
  status: string;
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const companyId = company?.id;
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

  useEffect(() => {
    if (companyId) {
      fetchEligibleCampaigns();
    }
  }, [companyId]);

  const fetchEligibleCampaigns = async () => {
    setLoading(true);
    try {
      // Fetch campaigns that are completed or running and don't have invoices yet
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, campaign_name, client_id, client_name, grand_total, gst_amount, subtotal, start_date, end_date, status')
        .eq('company_id', companyId)
        .in('status', ['Running', 'Completed', 'Planned'])
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out campaigns that already have invoices
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
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const generateInvoiceId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleCreateInvoice = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Error",
        description: "Please select a campaign",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch campaign items to create invoice line items
      const { data: campaignItems } = await supabase
        .from('campaign_items')
        .select('*, media_assets(location, area, city, media_type, dimensions)')
        .eq('campaign_id', selectedCampaignId);

      // Build line items from campaign items with all required data
      const items = (campaignItems || []).map((item, index) => ({
        sno: index + 1,
        asset_id: item.asset_id,
        description: item.media_assets 
          ? `${item.media_assets.media_type} - ${item.media_assets.location}, ${item.media_assets.area}, ${item.media_assets.city}`
          : `Media Display - ${item.asset_id}`,
        dimensions: item.media_assets?.dimensions || 'N/A',
        quantity: item.quantity || 1,
        rate: item.negotiated_rate || item.card_rate,
        display_rate: item.negotiated_rate || item.card_rate,
        mounting_cost: item.mounting_charge || 0,
        printing_cost: item.printing_charge || 0,
        start_date: item.start_date,
        end_date: item.end_date,
        booking_period: item.start_date && item.end_date 
          ? `${new Date(item.start_date).toLocaleDateString('en-IN')} - ${new Date(item.end_date).toLocaleDateString('en-IN')}`
          : '',
        amount: item.final_price || (item.negotiated_rate || item.card_rate) * (item.quantity || 1),
      }));

      const invoiceId = generateInvoiceId();
      const subTotal = selectedCampaign.subtotal || selectedCampaign.grand_total / 1.18;
      const gstAmount = selectedCampaign.gst_amount || subTotal * 0.18;
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
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      navigate(`/finance/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/finance/invoices')}>
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
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
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

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={handleCreateInvoice}
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
    </div>
  );
}
