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
import { AddCampaignAssetsDialog } from "@/components/campaigns/AddCampaignAssetsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Campaign asset interface
interface CampaignAsset {
  id: string;
  asset_id: string;
  media_asset_code: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  card_rate: number;
  negotiated_rate: number;
  printing_charges: number;
  mounting_charges: number;
  total_price: number;
  status: string;
  isNew?: boolean;
}

export default function CampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [showAddAssetsDialog, setShowAddAssetsDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<CampaignAsset | null>(null);
  
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
  
  // Campaign assets (from campaign_assets table - primary source)
  const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>([]);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);

  useEffect(() => {
    fetchClients();
    if (id) {
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
      .maybeSingle();
    
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
    setGstPercent(gstApplicable ? (campaign.gst_percent || 18) : 0);

    // Fetch campaign_assets (primary source for both direct campaigns and plan-converted)
    const { data: assets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at');

    if (assetsError) {
      console.error('Error fetching campaign assets:', assetsError);
    }

    if (assets && assets.length > 0) {
      setCampaignAssets(assets.map(asset => ({
        id: asset.id,
        asset_id: asset.asset_id,
        media_asset_code: asset.asset_id, // Will be same as asset_id for display
        location: asset.location || '',
        area: asset.area || '',
        city: asset.city || '',
        media_type: asset.media_type || '',
        card_rate: Number(asset.card_rate) || 0,
        negotiated_rate: Number(asset.negotiated_rate) || Number(asset.card_rate) || 0,
        printing_charges: Number(asset.printing_charges) || 0,
        mounting_charges: Number(asset.mounting_charges) || 0,
        total_price: Number(asset.total_price) || 0,
        status: asset.status || 'Pending'
      })));
    } else {
      // Fallback: try to fetch from campaign_items for plan-converted campaigns
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
            media_asset_code,
            location,
            area,
            city,
            media_type
          )
        `)
        .eq('campaign_id', id)
        .order('created_at');

      if (items && items.length > 0) {
        setCampaignAssets(items.map(item => {
          const asset = item.media_assets as any;
          const finalPrice = Number(item.final_price) || Number(item.negotiated_rate) || 0;
          const printingCharge = Number(item.printing_charge) || 0;
          const mountingCharge = Number(item.mounting_charge) || 0;
          
          return {
            id: item.id,
            asset_id: item.asset_id,
            media_asset_code: asset?.media_asset_code || item.asset_id,
            location: asset?.location || '',
            area: asset?.area || '',
            city: asset?.city || '',
            media_type: asset?.media_type || '',
            card_rate: Number(item.card_rate) || 0,
            negotiated_rate: finalPrice,
            printing_charges: printingCharge,
            mounting_charges: mountingCharge,
            total_price: finalPrice + printingCharge + mountingCharge,
            status: 'Pending'
          };
        }));
      }
    }

    setLoading(false);
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    const client = clients.find(c => c.id === value);
    if (client) {
      setClientName(client.name || client.company || "");
      const gstApplicable = client.is_gst_applicable !== false;
      setIsGstApplicable(gstApplicable);
      setGstPercent(gstApplicable ? 18 : 0);
    }
  };

  const updateCampaignAsset = (index: number, field: keyof CampaignAsset, value: any) => {
    const updated = [...campaignAssets];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total_price when price fields change
    if (field === 'negotiated_rate' || field === 'printing_charges' || field === 'mounting_charges') {
      const negotiated = field === 'negotiated_rate' ? Number(value) : Number(updated[index].negotiated_rate);
      const printing = field === 'printing_charges' ? Number(value) : Number(updated[index].printing_charges);
      const mounting = field === 'mounting_charges' ? Number(value) : Number(updated[index].mounting_charges);
      updated[index].total_price = negotiated + printing + mounting;
    }
    
    setCampaignAssets(updated);
  };

  const confirmDeleteAsset = (asset: CampaignAsset) => {
    setAssetToDelete(asset);
  };

  const handleDeleteAsset = () => {
    if (!assetToDelete) return;
    
    // Remove from local state
    setCampaignAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
    
    // Track for database deletion (if not a new asset)
    if (!assetToDelete.isNew) {
      setDeletedAssetIds(prev => [...prev, assetToDelete.id]);
    }
    
    setAssetToDelete(null);
    toast({
      title: "Asset removed",
      description: "Asset will be removed when you save changes",
    });
  };

  const handleAddAssets = (assets: any[]) => {
    const newAssets: CampaignAsset[] = assets.map(asset => ({
      id: `new-${Date.now()}-${asset.id}`,
      asset_id: asset.id,
      media_asset_code: asset.media_asset_code || asset.id,
      location: asset.location || '',
      area: asset.area || '',
      city: asset.city || '',
      media_type: asset.media_type || '',
      card_rate: Number(asset.card_rate) || 0,
      negotiated_rate: Number(asset.card_rate) || 0,
      printing_charges: 0,
      mounting_charges: 0,
      total_price: Number(asset.card_rate) || 0,
      status: 'Pending',
      isNew: true
    }));
    
    setCampaignAssets(prev => [...prev, ...newAssets]);
    toast({
      title: "Assets added",
      description: `${assets.length} asset(s) added to campaign`,
    });
  };

  const calculateTotals = () => {
    const totalAmount = campaignAssets.reduce((sum, asset) => sum + asset.total_price, 0);
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
    if (campaignAssets.length === 0) {
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
          total_assets: campaignAssets.length,
          total_amount: totalAmount,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (campaignError) throw campaignError;

      // Delete removed assets from campaign_assets
      if (deletedAssetIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('campaign_assets')
          .delete()
          .in('id', deletedAssetIds);
        
        if (deleteError) {
          console.error('Error deleting assets:', deleteError);
        }
      }

      // Update existing and insert new assets
      for (const asset of campaignAssets) {
        if (asset.isNew) {
          // Insert new campaign_asset
          const { error: insertError } = await supabase
            .from('campaign_assets')
            .insert({
              campaign_id: id!,
              asset_id: asset.asset_id,
              location: asset.location,
              area: asset.area,
              city: asset.city,
              media_type: asset.media_type,
              card_rate: asset.card_rate,
              negotiated_rate: asset.negotiated_rate,
              printing_charges: asset.printing_charges,
              mounting_charges: asset.mounting_charges,
              total_price: asset.total_price,
              status: asset.status as Database['public']['Enums']['asset_installation_status'],
              booking_start_date: format(startDate, 'yyyy-MM-dd'),
              booking_end_date: format(endDate, 'yyyy-MM-dd'),
            });

          if (insertError) {
            console.error('Error inserting asset:', insertError);
          }
        } else {
          // Update existing campaign_asset
          const { error: updateError } = await supabase
            .from('campaign_assets')
            .update({
              negotiated_rate: asset.negotiated_rate,
              printing_charges: asset.printing_charges,
              mounting_charges: asset.mounting_charges,
              total_price: asset.total_price,
              status: asset.status as Database['public']['Enums']['asset_installation_status'],
            })
            .eq('id', asset.id);

          if (updateError) {
            console.error('Error updating asset:', updateError);
          }
        }
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
  const existingAssetIds = campaignAssets.map(a => a.asset_id);

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
                <p className="font-semibold">{campaignAssets.length}</p>
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
                    <SelectItem value="Planned">Planned</SelectItem>
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
                {!isGstApplicable && (
                  <p className="text-amber-600">Client is not GST applicable</p>
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

        {/* Campaign Assets Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Assets ({campaignAssets.length})</CardTitle>
              <Button onClick={() => setShowAddAssetsDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assets
              </Button>
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
                    <TableHead className="text-right">Negotiated</TableHead>
                    <TableHead className="text-right">Printing</TableHead>
                    <TableHead className="text-right">Mounting</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No assets in this campaign. Click "Add Assets" to add media assets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignAssets.map((asset, index) => (
                      <TableRow key={asset.id} className={asset.isNew ? "bg-green-50/50" : ""}>
                        <TableCell className="font-mono text-sm">
                          {asset.media_asset_code || asset.asset_id}
                          {asset.isNew && <span className="ml-1 text-xs text-green-600">(new)</span>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={asset.location}>
                          {asset.location}
                        </TableCell>
                        <TableCell className="text-sm">
                          {asset.area}{asset.city ? `, ${asset.city}` : ''}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(asset.card_rate)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.negotiated_rate}
                            onChange={(e) => updateCampaignAsset(index, 'negotiated_rate', Number(e.target.value))}
                            className="h-8 w-24 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.printing_charges}
                            onChange={(e) => updateCampaignAsset(index, 'printing_charges', Number(e.target.value))}
                            className="h-8 w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.mounting_charges}
                            onChange={(e) => updateCampaignAsset(index, 'mounting_charges', Number(e.target.value))}
                            className="h-8 w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(asset.total_price)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={asset.status}
                            onValueChange={(value) => updateCampaignAsset(index, 'status', value)}
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
                            onClick={() => confirmDeleteAsset(asset)}
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
            {campaignAssets.length > 0 && (
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

      {/* Add Assets Dialog */}
      <AddCampaignAssetsDialog
        open={showAddAssetsDialog}
        onClose={() => setShowAddAssetsDialog(false)}
        existingAssetIds={existingAssetIds}
        onAddAssets={handleAddAssets}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!assetToDelete} onOpenChange={() => setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{assetToDelete?.media_asset_code || assetToDelete?.asset_id}" from this campaign?
              This action will be applied when you save changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
