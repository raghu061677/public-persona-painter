import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CalendarIcon, Plus, Trash2, Save, X } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  
  // Campaign fields
  const [campaignName, setCampaignName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [status, setStatus] = useState<Database['public']['Enums']['campaign_status']>("Draft");
  const [notes, setNotes] = useState("");
  const [gstPercent, setGstPercent] = useState(18);
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  
  // Campaign Items (source of truth for pricing)
  interface CampaignItem {
    id: string;
    asset_id: string;
    location: string;
    area: string;
    city: string;
    media_type: string;
    card_rate: number;
    negotiated_rate: number;
    final_price: number;
    printing_charge: number;
    mounting_charge: number;
    total_amount: number;
    status: string;
  }
  
  const [campaignItems, setCampaignItems] = useState<CampaignItem[]>([]);

  useEffect(() => {
    fetchClients();
    if (id) {
      // Trigger status update first, then fetch
      updateCampaignStatuses().then(() => {
        fetchCampaign();
      });
    }
  }, [id]);

  const updateCampaignStatuses = async () => {
    try {
      await supabase.rpc('auto_update_campaign_status');
    } catch (error) {
      console.error('Error updating campaign statuses:', error);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, company, is_gst_applicable')
      .order('name');
    setClients(data || []);
  };

  const fetchCampaign = async () => {
    setLoading(true);
    
    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError) {
      toast({
        title: "Error",
        description: "Failed to fetch campaign",
        variant: "destructive",
      });
      navigate('/admin/campaigns');
      return;
    }

    // Set campaign data
    setCampaignName(campaign.campaign_name || "");
    setClientId(campaign.client_id || "");
    setClientName(campaign.client_name || "");
    
    // Fetch client to get GST applicability
    const { data: clientData } = await supabase
      .from('clients')
      .select('is_gst_applicable')
      .eq('id', campaign.client_id)
      .single();
    
    const gstApplicable = clientData?.is_gst_applicable !== false;
    setIsGstApplicable(gstApplicable);
    
    const campaignStartDate = campaign.start_date ? new Date(campaign.start_date) : undefined;
    const campaignEndDate = campaign.end_date ? new Date(campaign.end_date) : undefined;
    setStartDate(campaignStartDate);
    setEndDate(campaignEndDate);
    
    // Auto-detect correct status based on dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let correctStatus = campaign.status || "Draft";
    
    if (campaignStartDate && campaignEndDate) {
      const start = new Date(campaignStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(campaignEndDate);
      end.setHours(0, 0, 0, 0);
      
      if (end < today) {
        correctStatus = "Completed";
      } else if (start <= today && end >= today) {
        correctStatus = "Running";
      } else if (start > today) {
        correctStatus = "Upcoming";
      }
    }
    
    setStatus(correctStatus);
    setNotes(campaign.notes || "");
    // Use stored GST percent if client is GST applicable, otherwise 0
    setGstPercent(gstApplicable ? (campaign.gst_percent || 18) : 0);

    // Fetch campaign_items (source of truth for pricing) with media_assets for display info
    const { data: items } = await supabase
      .from('campaign_items')
      .select(`
        id,
        asset_id,
        card_rate,
        negotiated_rate,
        final_price,
        printing_charge,
        mounting_charge,
        media_assets (
          id,
          location,
          area,
          city,
          media_type
        )
      `)
      .eq('campaign_id', id)
      .order('created_at');

    // Also fetch campaign_assets for status info
    const { data: assetStatuses } = await supabase
      .from('campaign_assets')
      .select('asset_id, status')
      .eq('campaign_id', id);

    const statusMap = new Map((assetStatuses || []).map(a => [a.asset_id, a.status]));

    if (items) {
      setCampaignItems(items.map(item => {
        const asset = item.media_assets as any;
        const finalPrice = Number(item.final_price) || Number(item.negotiated_rate) || 0;
        const printingCharge = Number(item.printing_charge) || 0;
        const mountingCharge = Number(item.mounting_charge) || 0;
        
        return {
          id: item.id,
          asset_id: item.asset_id,
          location: asset?.location || '',
          area: asset?.area || '',
          city: asset?.city || '',
          media_type: asset?.media_type || '',
          card_rate: Number(item.card_rate) || 0,
          negotiated_rate: Number(item.negotiated_rate) || 0,
          final_price: finalPrice,
          printing_charge: printingCharge,
          mounting_charge: mountingCharge,
          total_amount: finalPrice + printingCharge + mountingCharge,
          status: statusMap.get(item.asset_id) || 'Pending'
        };
      }));
    }

    setLoading(false);
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    const client = clients.find(c => c.id === value);
    if (client) {
      setClientName(client.name || client.company || "");
      // Update GST applicability based on client setting
      const gstApplicable = client.is_gst_applicable !== false;
      setIsGstApplicable(gstApplicable);
      setGstPercent(gstApplicable ? 18 : 0);
    }
  };

  const updateCampaignItem = (index: number, field: keyof CampaignItem, value: any) => {
    const updated = [...campaignItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total_amount when price fields change
    if (field === 'final_price' || field === 'printing_charge' || field === 'mounting_charge') {
      const finalPrice = field === 'final_price' ? Number(value) : Number(updated[index].final_price);
      const printing = field === 'printing_charge' ? Number(value) : Number(updated[index].printing_charge);
      const mounting = field === 'mounting_charge' ? Number(value) : Number(updated[index].mounting_charge);
      updated[index].total_amount = finalPrice + printing + mounting;
    }
    
    setCampaignItems(updated);
  };

  const removeCampaignItem = (index: number) => {
    const updated = campaignItems.filter((_, i) => i !== index);
    setCampaignItems(updated);
  };

  const calculateTotals = () => {
    // Use final_price from campaign_items - no pro-rata recalculation
    // Prices are locked at Plan conversion time
    const totalAmount = campaignItems.reduce((sum, item) => {
      return sum + item.total_amount;
    }, 0);

    // GST calculation based on client's is_gst_applicable flag
    const effectiveGstPercent = isGstApplicable ? gstPercent : 0;
    const gstAmount = (totalAmount * effectiveGstPercent) / 100;
    const grandTotal = totalAmount + gstAmount;

    return { totalAmount, gstAmount, grandTotal, effectiveGstPercent };
  };

  const handleSave = async () => {
    // Validation
    if (!campaignName.trim()) {
      toast({ title: "Error", description: "Campaign name is required", variant: "destructive" });
      return;
    }
    if (!clientId) {
      toast({ title: "Error", description: "Client is required", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Start and end dates are required", variant: "destructive" });
      return;
    }
    if (campaignItems.length === 0) {
      toast({ title: "Error", description: "At least one asset is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const { totalAmount, gstAmount, grandTotal } = calculateTotals();

      // Update campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          campaign_name: campaignName,
          client_id: clientId,
          client_name: clientName,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status,
          notes,
          total_assets: campaignItems.length,
          total_amount: totalAmount,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (campaignError) throw campaignError;

      // Update campaign_items with new prices
      for (const item of campaignItems) {
        await supabase
          .from('campaign_items')
          .update({
            final_price: item.final_price,
            printing_charge: item.printing_charge,
            mounting_charge: item.mounting_charge,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }

      // Update campaign_assets status
      for (const item of campaignItems) {
        await supabase
          .from('campaign_assets')
          .update({
            status: item.status as Database['public']['Enums']['asset_installation_status'],
            negotiated_rate: item.final_price,
            printing_charges: item.printing_charge,
            mounting_charges: item.mounting_charge,
            total_price: item.total_amount
          })
          .eq('campaign_id', id)
          .eq('asset_id', item.asset_id);
      }

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });

      navigate(`/admin/campaigns/${id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  const { totalAmount, gstAmount, grandTotal, effectiveGstPercent } = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/campaigns/${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaign
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Edit Campaign</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/campaigns/${id}`)}
              disabled={saving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-primary hover:shadow-glow transition-smooth"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client</p>
                <p className="font-semibold">{clientName || "Not selected"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Period</p>
                <p className="font-semibold">
                  {startDate && endDate
                    ? `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM yyyy')}`
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assets</p>
                <p className="font-semibold">{campaignItems.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Grand Total</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Campaign Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., KKRC Nov-25 Hyderabad"
                />
              </div>

              <div>
                <Label htmlFor="client">Client *</Label>
                <Select value={clientId} onValueChange={handleClientChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || client.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Running">Running</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional campaign notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              
              {!isGstApplicable ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span className="text-amber-600 font-medium">Not Applicable</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={gstPercent}
                      onChange={(e) => setGstPercent(Number(e.target.value))}
                      className="w-16 h-8 text-right"
                      min="0"
                      max="100"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST Amount</span>
                <span className="font-medium">{formatCurrency(gstAmount)}</span>
              </div>
              
              <div className="flex justify-between pt-3 border-t-2">
                <span className="font-bold">Grand Total</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(grandTotal)}</span>
              </div>

              <div className="pt-3 border-t text-xs text-muted-foreground">
                <p>Prices locked from approved Plan</p>
                {!isGstApplicable && (
                  <p className="mt-1 text-amber-600">Client is not GST applicable</p>
                )}
                <p className="mt-1">
                  {startDate && endDate && (
                    <>Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Items Table - Source of truth from Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Assets</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prices are locked from the approved Plan
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Asset ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Area / City</TableHead>
                    <TableHead className="text-right text-muted-foreground">Card Rate</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead className="text-right">Printing</TableHead>
                    <TableHead className="text-right">Mounting</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No assets in this campaign. Campaign items are created from an approved Plan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.asset_id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.location}>
                          {item.location}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.area}{item.city ? `, ${item.city}` : ''}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.card_rate)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.final_price}
                            onChange={(e) => updateCampaignItem(index, 'final_price', Number(e.target.value))}
                            className="h-8 w-24 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.printing_charge}
                            onChange={(e) => updateCampaignItem(index, 'printing_charge', Number(e.target.value))}
                            className="h-8 w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.mounting_charge}
                            onChange={(e) => updateCampaignItem(index, 'mounting_charge', Number(e.target.value))}
                            className="h-8 w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(item.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(value) => updateCampaignItem(index, 'status', value)}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Assigned">Assigned</SelectItem>
                              <SelectItem value="Installed">Installed</SelectItem>
                              <SelectItem value="Mounted">Mounted</SelectItem>
                              <SelectItem value="PhotoUploaded">Photo Uploaded</SelectItem>
                              <SelectItem value="Verified">Verified</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCampaignItem(index)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Totals Row */}
            {campaignItems.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="text-right">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="ml-2 font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">
                      GST ({isGstApplicable ? `${effectiveGstPercent}%` : 'N/A'}):
                    </span>
                    <span className="ml-2 font-medium">{formatCurrency(gstAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="ml-2 font-bold text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
