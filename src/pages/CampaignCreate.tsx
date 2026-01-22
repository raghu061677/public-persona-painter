import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, Save, Send, History, ShieldAlert, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AssetSelectionTable } from '@/components/plans/AssetSelectionTable';
import { formatCurrency } from '@/utils/mediaAssets';
import { useAssetConflictCheck } from '@/hooks/useAssetConflictCheck';
import { ConflictWarning } from '@/components/campaigns/ConflictWarning';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const { isAdmin } = useAuth();
  const { checkConflict, checking } = useAssetConflictCheck();
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetPricing, setAssetPricing] = useState<Record<string, any>>({});
  const [assetConflicts, setAssetConflicts] = useState<Record<string, any>>({});
  const [isHistoricalEntry, setIsHistoricalEntry] = useState(false);
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    notes: '',
    status: 'Planned' as string,
  });

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
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

  const fetchAvailableAssets = async () => {
    const { data } = await supabase
      .from('media_assets')
      .select('*')
      .order('city', { ascending: true });
    setAvailableAssets(data || []);
  };

  const toggleAssetSelection = async (assetId: string, asset: any) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      const newPricing = { ...assetPricing };
      delete newPricing[assetId];
      setAssetPricing(newPricing);
      const newConflicts = { ...assetConflicts };
      delete newConflicts[assetId];
      setAssetConflicts(newConflicts);
    } else {
      newSelected.add(assetId);
      const monthlyCardRate = asset.card_rate || 0;
      
      setAssetPricing(prev => ({
        ...prev,
        [assetId]: {
          negotiated_price: monthlyCardRate,
          printing_charges: asset.printing_charge || 0,
          mounting_charges: asset.mounting_charge || 0,
        }
      }));

      // Check for conflicts when dates are set
      if (formData.start_date && formData.end_date) {
        const conflictResult = await checkConflict(
          assetId,
          formData.start_date,
          formData.end_date
        );
        if (conflictResult.has_conflict) {
          setAssetConflicts(prev => ({
            ...prev,
            [assetId]: conflictResult.conflicting_campaigns,
          }));
        }
      }
    }
    setSelectedAssets(newSelected);
  };

  const handleMultiSelect = (assetIds: string[], assets: any[]) => {
    const newSelected = new Set(selectedAssets);
    const newPricing = { ...assetPricing };

    assets.forEach(asset => {
      newSelected.add(asset.id);
      const monthlyCardRate = asset.card_rate || 0;
      
      newPricing[asset.id] = {
        negotiated_price: monthlyCardRate,
        printing_charges: asset.printing_charge || 0,
        mounting_charges: asset.mounting_charge || 0,
      };
    });

    setSelectedAssets(newSelected);
    setAssetPricing(newPricing);

    toast({
      title: "Success",
      description: `Added ${assets.length} asset${assets.length > 1 ? 's' : ''} to campaign`,
    });
  };

  const removeAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    newSelected.delete(assetId);
    const newPricing = { ...assetPricing };
    delete newPricing[assetId];
    setSelectedAssets(newSelected);
    setAssetPricing(newPricing);
  };

  const updateAssetPricing = (assetId: string, field: string, value: number) => {
    setAssetPricing(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value,
      }
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let printingTotal = 0;
    let mountingTotal = 0;

    selectedAssets.forEach(assetId => {
      const pricing = assetPricing[assetId];
      if (pricing) {
        subtotal += pricing.negotiated_price || 0;
        printingTotal += pricing.printing_charges || 0;
        mountingTotal += pricing.mounting_charges || 0;
      }
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

    if (selectedAssets.size === 0) {
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
          status: isHistoricalEntry ? formData.status : 'Planned',
          is_historical_entry: isHistoricalEntry,
          assets: Array.from(selectedAssets).map(assetId => {
            const pricing = assetPricing[assetId];
            return {
              asset_id: assetId,
              display_from: formData.start_date,
              display_to: formData.end_date,
              sales_price: pricing.negotiated_price || 0,
              printing_cost: pricing.printing_charges || 0,
              mounting_cost: pricing.mounting_charges || 0,
              negotiated_price: pricing.negotiated_price || 0,
            };
          }),
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

  // Admin-only check
  if (!isAdmin) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-4">
            Direct campaign creation is only available to administrators.
            <br />
            Please use the Plan → Campaign workflow instead.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
            <Button onClick={() => navigate('/admin/plans/new')}>
              Create Plan Instead
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={isHistoricalEntry ? "Enter Historical Campaign" : "Create Direct Campaign"}
        description={isHistoricalEntry 
          ? "Record a past campaign for FY 2025-26 (Admin Only)" 
          : "Create a new campaign without a plan (Admin Only)"
        }
        actions={
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Admin Only
            </Badge>
            <Button variant="outline" onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
          </div>
        }
      />
      
      {/* Historical Entry Toggle */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base font-medium">Historical Campaign Entry</Label>
                <p className="text-sm text-muted-foreground">
                  Enable to record past campaigns (FY 2025-26) for backfilling revenue and expenses
                </p>
              </div>
            </div>
            <Switch
              checked={isHistoricalEntry}
              onCheckedChange={(checked) => {
                setIsHistoricalEntry(checked);
                if (checked) {
                  setFormData(prev => ({ ...prev, status: 'Completed' }));
                } else {
                  setFormData(prev => ({ ...prev, status: 'Planned' }));
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isHistoricalEntry && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <Calendar className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Historical Entry Mode:</strong> Asset conflict checks are bypassed for past dates. 
            Make sure dates are correct before saving. This entry will be flagged as historical in reports.
          </AlertDescription>
        </Alert>
      )}
      
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

              {/* Status selector for historical entries */}
              {isHistoricalEntry && (
                <div>
                  <Label htmlFor="status">Campaign Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isHistoricalEntry 
                    ? "Add notes about this historical entry (e.g., invoice references, actual revenue)"
                    : "Add any additional notes"
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {selectedAssets.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Assets ({selectedAssets.size})</CardTitle>
                <CardDescription>Configure pricing for each asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(selectedAssets).map(assetId => {
                    const asset = availableAssets.find(a => a.id === assetId);
                    const pricing = assetPricing[assetId];
                    const conflicts = assetConflicts[assetId];
                    if (!asset || !pricing) return null;

                    return (
                      <Card key={assetId}>
                        <CardContent className="pt-6">
                          {conflicts && conflicts.length > 0 && (
                            <ConflictWarning conflicts={conflicts} />
                          )}
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium">{asset.location}</p>
                              <p className="text-sm text-muted-foreground">
                                {asset.city}, {asset.area} • {asset.media_type}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAsset(assetId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs">Negotiated Price</Label>
                              <Input
                                type="number"
                                value={pricing.negotiated_price}
                                onChange={(e) => updateAssetPricing(assetId, 'negotiated_price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Printing Charges</Label>
                              <Input
                                type="number"
                                value={pricing.printing_charges}
                                onChange={(e) => updateAssetPricing(assetId, 'printing_charges', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Mounting Charges</Label>
                              <Input
                                type="number"
                                value={pricing.mounting_charges}
                                onChange={(e) => updateAssetPricing(assetId, 'mounting_charges', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Assets:</span>
                <span className="font-medium">{selectedAssets.size}</span>
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

      {/* Full Width Asset Selection Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Select Assets</CardTitle>
          <CardDescription>Choose media assets for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetSelectionTable
            assets={availableAssets}
            selectedIds={selectedAssets}
            onSelect={toggleAssetSelection}
            onMultiSelect={handleMultiSelect}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
