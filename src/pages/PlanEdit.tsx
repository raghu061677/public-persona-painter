import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { 
  calculateDurationDays, 
  formatDate 
} from "@/utils/plans";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetSelectionTable } from "@/components/plans/AssetSelectionTable";
import { SelectedAssetsTable } from "@/components/plans/SelectedAssetsTable";
import { PlanSummaryCard } from "@/components/plans/PlanSummaryCard";

export default function PlanEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetPricing, setAssetPricing] = useState<Record<string, any>>({});
  
  const [formData, setFormData] = useState({
    id: "",
    client_id: "",
    client_name: "",
    plan_name: "",
    plan_type: "Quotation" as "Quotation" | "Proposal" | "Estimate",
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    gst_percent: "18",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
    fetchPlan();
  }, [id]);

  const fetchPlan = async () => {
    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (plan) {
      setFormData({
        id: plan.id,
        client_id: plan.client_id,
        client_name: plan.client_name,
        plan_name: plan.plan_name,
        plan_type: plan.plan_type,
        start_date: new Date(plan.start_date),
        end_date: new Date(plan.end_date),
        gst_percent: plan.gst_percent.toString(),
        notes: plan.notes || "",
      });

      // Fetch plan items
      const { data: items } = await supabase
        .from('plan_items')
        .select('*')
        .eq('plan_id', id);

      if (items) {
        const selected = new Set(items.map(i => i.asset_id));
        setSelectedAssets(selected);

        const pricing: Record<string, any> = {};
        items.forEach(item => {
          pricing[item.asset_id] = {
            sales_price: item.sales_price,
            printing_charges: item.printing_charges || 0,
            mounting_charges: item.mounting_charges || 0,
            discount_type: item.discount_type || 'Percent',
            discount_value: item.discount_value || 0,
          };
        });
        setAssetPricing(pricing);
      }
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    setClients(data || []);
  };

  const fetchAvailableAssets = async () => {
    const { data } = await supabase
      .from('media_assets')
      .select('*')
      .eq('status', 'Available')
      .order('city', { ascending: true });
    setAvailableAssets(data || []);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client_name: client.name,
      }));
    }
  };

  const toggleAssetSelection = (assetId: string, asset: any) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      const newPricing = { ...assetPricing };
      delete newPricing[assetId];
      setAssetPricing(newPricing);
    } else {
      newSelected.add(assetId);
      // Calculate prorata based on plan duration from form data
      const monthlyRate = asset.card_rate || 0;
      const durationDays = calculateDurationDays(formData.start_date, formData.end_date);
      
      // If duration is 30 days or more, use monthly rate, otherwise calculate prorata
      const prorataRate = durationDays >= 30 
        ? monthlyRate 
        : Math.round((monthlyRate / 30) * durationDays);
      
      setAssetPricing(prev => ({
        ...prev,
        [assetId]: {
          sales_price: prorataRate,
          printing_charges: asset.printing_charges || 0,
          mounting_charges: asset.mounting_charges || 0,
          discount_type: 'Percent',
          discount_value: 0,
        }
      }));
    }
    setSelectedAssets(newSelected);
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
    let totalDiscount = 0;
    let totalBaseRent = 0;

    selectedAssets.forEach(assetId => {
      const pricing = assetPricing[assetId];
      const asset = availableAssets.find(a => a.id === assetId);
      
      if (pricing && asset) {
        const salesPrice = pricing.sales_price || 0;
        const discountType = pricing.discount_type || 'Percent';
        const discountValue = pricing.discount_value || 0;
        
        const discountAmount = discountType === 'Percent'
          ? (salesPrice * discountValue) / 100
          : discountValue;
        
        const netPrice = salesPrice - discountAmount;
        
        subtotal += salesPrice + (pricing.printing_charges || 0) + (pricing.mounting_charges || 0);
        totalDiscount += discountAmount;
        totalBaseRent += asset.base_rent || 0;
      }
    });

    const netTotal = subtotal - totalDiscount;
    const gstAmount = (netTotal * parseFloat(formData.gst_percent)) / 100;
    const grandTotal = netTotal + gstAmount;

    return {
      subtotal,
      totalDiscount,
      netTotal,
      gstAmount,
      grandTotal,
      totalBaseRent,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAssets.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const durationDays = calculateDurationDays(formData.start_date, formData.end_date);
      const totals = calculateTotals();
      const { netTotal, gstAmount, grandTotal } = totals;

      // Update plan
      const { error: planError } = await supabase
        .from('plans')
        .update({
          client_id: formData.client_id,
          client_name: formData.client_name,
          plan_name: formData.plan_name,
          plan_type: formData.plan_type,
          start_date: formData.start_date.toISOString().split('T')[0],
          end_date: formData.end_date.toISOString().split('T')[0],
          duration_days: durationDays,
          total_amount: netTotal,
          gst_percent: parseFloat(formData.gst_percent),
          gst_amount: gstAmount,
          grand_total: grandTotal,
          notes: formData.notes,
        })
        .eq('id', id);

      if (planError) throw planError;

      // Delete existing plan items
      await supabase
        .from('plan_items')
        .delete()
        .eq('plan_id', id);

      // Create new plan items
      const items = Array.from(selectedAssets).map(assetId => {
        const asset = availableAssets.find(a => a.id === assetId);
        const pricing = assetPricing[assetId];
        
        const salesPrice = pricing.sales_price || 0;
        const discountType = pricing.discount_type || 'Percent';
        const discountValue = pricing.discount_value || 0;
        const printing = pricing.printing_charges || 0;
        const mounting = pricing.mounting_charges || 0;
        
        const discountAmount = discountType === 'Percent'
          ? (salesPrice * discountValue) / 100
          : discountValue;
        
        const netPrice = salesPrice - discountAmount;
        const subtotal = netPrice + printing + mounting;
        const itemGst = (subtotal * parseFloat(formData.gst_percent)) / 100;
        const totalWithGst = subtotal + itemGst;

        return {
          plan_id: id,
          asset_id: assetId,
          location: asset.location,
          city: asset.city,
          area: asset.area,
          media_type: asset.media_type,
          dimensions: asset.dimensions,
          card_rate: asset.card_rate,
          base_rent: asset.base_rent,
          sales_price: salesPrice,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          printing_charges: printing,
          mounting_charges: mounting,
          subtotal,
          gst_amount: itemGst,
          total_with_gst: totalWithGst,
        };
      });

      const { error: itemsError } = await supabase
        .from('plan_items')
        .insert(items as any);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
      navigate(`/admin/plans/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const durationDays = calculateDurationDays(formData.start_date, formData.end_date);
  const totals = calculateTotals();
  const selectedAssetsArray = Array.from(selectedAssets)
    .map(id => availableAssets.find(a => a.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/plans/${id}`)}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plan
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit Plan</h1>
          <p className="text-muted-foreground mt-1">Update plan details and modify asset selection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Plan Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Basic information and classification of the plan</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div>
                <Label>Plan ID</Label>
                <Input value={formData.id} disabled />
              </div>
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Name *</Label>
                <Input
                  required
                  value={formData.plan_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                  placeholder="e.g., Q1 2025 Campaign"
                />
              </div>
              <div>
                <Label>Plan Type</Label>
                <Select value={formData.plan_type} onValueChange={(v: "Quotation" | "Proposal" | "Estimate") => setFormData(prev => ({ ...prev, plan_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Estimate">Estimate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg">Campaign Period</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Define the start and end dates for this campaign</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div>
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(formData.start_date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, start_date: date }))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Duration (Days) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 1;
                    const newEndDate = new Date(formData.start_date);
                    newEndDate.setDate(newEndDate.getDate() + days);
                    setFormData(prev => ({ ...prev, end_date: newEndDate }));
                  }}
                  placeholder="Enter duration in days"
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(formData.end_date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, end_date: date }))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Selected Assets */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Selected Assets ({selectedAssets.size})</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Review and adjust pricing for selected media assets</p>
                </CardHeader>
                <CardContent className="pt-6">
                  <SelectedAssetsTable
                    assets={selectedAssetsArray}
                    assetPricing={assetPricing}
                    onRemove={removeAsset}
                    onPricingUpdate={updateAssetPricing}
                    durationDays={durationDays}
                  />
                </CardContent>
              </Card>

              {/* Asset Selection */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Available Media Assets</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Browse and select additional assets to include in this plan</p>
                </CardHeader>
                <CardContent className="pt-6">
                  <AssetSelectionTable
                    assets={availableAssets}
                    selectedIds={selectedAssets}
                    onSelect={toggleAssetSelection}
                  />
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Additional Details</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Add notes or special terms for this plan</p>
                </CardHeader>
                <CardContent className="pt-6">
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special terms or conditions..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Card */}
            <div>
              <PlanSummaryCard
                selectedCount={selectedAssets.size}
                duration={durationDays}
                subtotal={totals.subtotal}
                discount={totals.totalDiscount}
                netTotal={totals.netTotal}
                gstPercent={parseFloat(formData.gst_percent)}
                gstAmount={totals.gstAmount}
                grandTotal={totals.grandTotal}
                profitMargin={totals.totalBaseRent}
                baseRent={totals.totalBaseRent}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/plans/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Updating..." : "Update Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
