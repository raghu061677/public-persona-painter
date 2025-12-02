import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AssetItem {
  asset_id: string;
  asset_name: string;
  city: string;
  area: string;
  media_type: string;
  display_from: string;
  display_to: string;
  sales_price: number;
  printing_cost: number;
  mounting_cost: number;
  negotiated_price: number;
}

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { company } = useCompany();
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetItem[]>([]);
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
    fetchAssets();
  }, [company]);

  const fetchClients = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: companyUserData } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!companyUserData) return;

    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', companyUserData.company_id)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      });
      return;
    }

    setClients(data || []);
  };

  const fetchAssets = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('No authenticated user');
        return;
      }

      const { data: companyUserData, error: companyError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company user:', companyError);
        toast({
          title: 'Error',
          description: 'Failed to fetch company information',
          variant: 'destructive',
        });
        return;
      }

      if (!companyUserData) {
        console.error('No company association found');
        toast({
          title: 'Error',
          description: 'No company association found',
          variant: 'destructive',
        });
        return;
      }

      console.log('Fetching assets for company:', companyUserData.company_id);

      const { data, error } = await supabase
        .from('media_assets')
        .select(`
          id, 
          location, 
          city, 
          area, 
          media_type, 
          card_rate, 
          printing_charge, 
          mounting_charge,
          status,
          dimensions,
          total_sqft
        `)
        .eq('company_id', companyUserData.company_id)
        .eq('status', 'Available')
        .order('city', { ascending: true });

      if (error) {
        console.error('Error fetching assets:', error);
        toast({
          title: 'Error',
          description: `Failed to fetch assets: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('Fetched assets:', data?.length || 0);
      setAssets(data || []);

      if (!data || data.length === 0) {
        toast({
          title: 'No Assets Available',
          description: 'No available assets found. Please add assets or check their status.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching assets:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while fetching assets',
        variant: 'destructive',
      });
    }
  };

  const handleAddAsset = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    // Check if asset is already added
    if (selectedAssets.find(sa => sa.asset_id === assetId)) {
      toast({
        title: 'Asset Already Added',
        description: 'This asset is already in your campaign',
        variant: 'destructive',
      });
      return;
    }

    const newAsset: AssetItem = {
      asset_id: asset.id,
      asset_name: asset.location,
      city: asset.city,
      area: asset.area,
      media_type: asset.media_type,
      display_from: formData.start_date || '',
      display_to: formData.end_date || '',
      sales_price: asset.card_rate || 0,
      printing_cost: asset.printing_charge || 0,
      mounting_cost: asset.mounting_charge || 0,
      negotiated_price: asset.card_rate || 0,
    };

    setSelectedAssets([...selectedAssets, newAsset]);
    
    toast({
      title: 'Asset Added',
      description: `${asset.location} added to campaign`,
    });
  };

  const handleRemoveAsset = (index: number) => {
    setSelectedAssets(selectedAssets.filter((_, i) => i !== index));
  };

  const handleAssetChange = (index: number, field: keyof AssetItem, value: any) => {
    const updated = [...selectedAssets];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedAssets(updated);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let printingTotal = 0;
    let mountingTotal = 0;

    selectedAssets.forEach(asset => {
      subtotal += asset.negotiated_price;
      printingTotal += asset.printing_cost;
      mountingTotal += asset.mounting_cost;
    });

    const totalAmount = subtotal + printingTotal + mountingTotal;
    const gstAmount = totalAmount * 0.18;
    const grandTotal = totalAmount + gstAmount;

    return { subtotal, printingTotal, mountingTotal, totalAmount, gstAmount, grandTotal };
  };

  const handleSubmit = async (autoAssign: boolean = false) => {
    if (!formData.campaign_name || !formData.client_id || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAssets.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one asset to the campaign',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: companyUserData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .single();

      if (!companyUserData) throw new Error('No company association');

      const { data, error } = await supabase.functions.invoke('create-direct-campaign', {
        body: {
          company_id: companyUserData.company_id,
          client_id: formData.client_id,
          campaign_name: formData.campaign_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          notes: formData.notes,
          assets: selectedAssets.map(asset => ({
            asset_id: asset.asset_id,
            display_from: asset.display_from,
            display_to: asset.display_to,
            sales_price: asset.sales_price,
            printing_cost: asset.printing_cost,
            mounting_cost: asset.mounting_cost,
            negotiated_price: asset.negotiated_price,
          })),
          created_by: userData.user.id,
          auto_assign: autoAssign,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Campaign created successfully${autoAssign ? ' and operations auto-assigned' : ''}`,
      });

      navigate(`/admin/campaigns/${data.campaign_id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <PageContainer>
      <PageHeader
        title="Create Direct Campaign"
        description="Create a new campaign without a plan"
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        }
      />
      
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
              <CardDescription>Basic details about the campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign_name">Campaign Name *</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>

              <div>
                <Label htmlFor="client">Client *</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Assets</CardTitle>
              <CardDescription>Add media assets to this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Add Asset to Campaign</Label>
                <Select 
                  onValueChange={handleAddAsset}
                  disabled={!formData.start_date || !formData.end_date}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.start_date || !formData.end_date 
                        ? "Set campaign dates first" 
                        : `Select from ${assets.filter(a => !selectedAssets.find(sa => sa.asset_id === a.id)).length} available assets`
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {assets
                      .filter(a => !selectedAssets.find(sa => sa.asset_id === a.id))
                      .length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        {assets.length === 0 
                          ? "No available assets found" 
                          : "All available assets have been added"}
                      </div>
                    ) : (
                      assets
                        .filter(a => !selectedAssets.find(sa => sa.asset_id === a.id))
                        .map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{asset.location}</span>
                              <span className="text-xs text-muted-foreground">
                                {asset.city}, {asset.area} • {asset.media_type} • ₹{asset.card_rate?.toLocaleString('en-IN') || 0}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                {!formData.start_date || !formData.end_date ? (
                  <p className="text-xs text-muted-foreground">
                    Please set campaign start and end dates before adding assets
                  </p>
                ) : null}
              </div>

              <Separator />

              {selectedAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets added yet. Select assets from the dropdown above.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedAssets.map((asset, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-medium">{asset.asset_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {asset.city}, {asset.area} • {asset.media_type}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAsset(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">Sales Price</Label>
                            <Input
                              type="number"
                              value={asset.sales_price}
                              onChange={(e) => handleAssetChange(index, 'sales_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Negotiated Price</Label>
                            <Input
                              type="number"
                              value={asset.negotiated_price}
                              onChange={(e) => handleAssetChange(index, 'negotiated_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Printing Cost</Label>
                            <Input
                              type="number"
                              value={asset.printing_cost}
                              onChange={(e) => handleAssetChange(index, 'printing_cost', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Mounting Cost</Label>
                            <Input
                              type="number"
                              value={asset.mounting_cost}
                              onChange={(e) => handleAssetChange(index, 'mounting_cost', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Assets:</span>
                <span className="font-medium">{selectedAssets.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Printing Total:</span>
                <span className="font-medium">₹{totals.printingTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mounting Total:</span>
                <span className="font-medium">₹{totals.mountingTotal.toLocaleString('en-IN')}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total (Before GST):</span>
                <span className="font-medium">₹{totals.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (18%):</span>
                <span className="font-medium">₹{totals.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                <Send className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create & Auto Assign'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
