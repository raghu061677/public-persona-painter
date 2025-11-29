import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [status, setStatus] = useState<"Planned" | "Assigned" | "InProgress" | "PhotoUploaded" | "Verified" | "Completed">("Planned");
  const [notes, setNotes] = useState("");
  const [gstPercent, setGstPercent] = useState(18);
  
  // Assets
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, company')
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
    setStartDate(campaign.start_date ? new Date(campaign.start_date) : undefined);
    setEndDate(campaign.end_date ? new Date(campaign.end_date) : undefined);
    setStatus((campaign.status === 'active' ? 'Planned' : campaign.status) || "Planned");
    setNotes(campaign.notes || "");
    setGstPercent(campaign.gst_percent || 18);

    // Fetch campaign assets
    const { data: campaignAssets } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at');

    if (campaignAssets) {
      setAssets(campaignAssets.map(a => ({
        id: a.id,
        asset_id: a.asset_id,
        location: a.location,
        area: a.area,
        city: a.city,
        media_type: a.media_type,
        card_rate: a.card_rate || 0,
        printing_charges: a.printing_charges || 0,
        mounting_charges: a.mounting_charges || 0,
        status: a.status || 'Pending'
      })));
    }

    setLoading(false);
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    const client = clients.find(c => c.id === value);
    if (client) {
      setClientName(client.name || client.company || "");
    }
  };

  const updateAsset = (index: number, field: string, value: any) => {
    const updated = [...assets];
    updated[index] = { ...updated[index], [field]: value };
    setAssets(updated);
  };

  const removeAsset = (index: number) => {
    const updated = assets.filter((_, i) => i !== index);
    setAssets(updated);
  };

  const calculateTotals = () => {
    if (!startDate || !endDate) return { totalAmount: 0, gstAmount: 0, grandTotal: 0 };

    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const totalAmount = assets.reduce((sum, asset) => {
      const monthlyRate = Number(asset.card_rate) || 0;
      const proRatedCost = (monthlyRate / 30) * durationDays;
      const printing = Number(asset.printing_charges) || 0;
      const mounting = Number(asset.mounting_charges) || 0;
      return sum + proRatedCost + printing + mounting;
    }, 0);

    const gstAmount = (totalAmount * gstPercent) / 100;
    const grandTotal = totalAmount + gstAmount;

    return { totalAmount, gstAmount, grandTotal };
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
    if (assets.length === 0) {
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
          total_assets: assets.length,
          total_amount: totalAmount,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (campaignError) throw campaignError;

      // Delete existing assets and insert new ones
      await supabase
        .from('campaign_assets')
        .delete()
        .eq('campaign_id', id);

      const assetsToInsert = assets.map(asset => ({
        campaign_id: id,
        asset_id: asset.asset_id,
        location: asset.location,
        area: asset.area,
        city: asset.city,
        media_type: asset.media_type,
        card_rate: asset.card_rate,
        printing_charges: asset.printing_charges,
        mounting_charges: asset.mounting_charges,
        status: asset.status
      }));

      const { error: assetsError } = await supabase
        .from('campaign_assets')
        .insert(assetsToInsert);

      if (assetsError) throw assetsError;

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

  const { totalAmount, gstAmount, grandTotal } = calculateTotals();

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
                <p className="font-semibold">{assets.length}</p>
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
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="PhotoUploaded">Photo Uploaded</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
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
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST Amount</span>
                <span className="font-medium">{formatCurrency(gstAmount)}</span>
              </div>
              
              <div className="flex justify-between pt-3 border-t-2">
                <span className="font-bold">Grand Total</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(grandTotal)}</span>
              </div>

              <div className="pt-3 border-t text-xs text-muted-foreground">
                <p>Pro-rata calculation based on campaign duration</p>
                <p className="mt-1">
                  {startDate && endDate && (
                    <>Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Assets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Asset ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Card Rate</TableHead>
                    <TableHead className="text-right">Printing</TableHead>
                    <TableHead className="text-right">Mounting</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No assets added. Assets from the original campaign will be preserved.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={asset.asset_id}
                            onChange={(e) => updateAsset(index, 'asset_id', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={asset.location}
                            onChange={(e) => updateAsset(index, 'location', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={asset.area}
                            onChange={(e) => updateAsset(index, 'area', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={asset.city}
                            onChange={(e) => updateAsset(index, 'city', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={asset.media_type}
                            onChange={(e) => updateAsset(index, 'media_type', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.card_rate}
                            onChange={(e) => updateAsset(index, 'card_rate', Number(e.target.value))}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.printing_charges}
                            onChange={(e) => updateAsset(index, 'printing_charges', Number(e.target.value))}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.mounting_charges}
                            onChange={(e) => updateAsset(index, 'mounting_charges', Number(e.target.value))}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={asset.status}
                            onValueChange={(value) => updateAsset(index, 'status', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Assigned">Assigned</SelectItem>
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
                            onClick={() => removeAsset(index)}
                            className="h-8 w-8"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
