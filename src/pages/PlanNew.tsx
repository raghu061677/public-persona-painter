import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  calculateProRata,
  formatDate 
} from "@/utils/plans";
import { generatePlanCode } from "@/lib/codeGenerator";
import { ArrowLeft, Calendar as CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetSelectionTable } from "@/components/plans/AssetSelectionTable";
import { SelectedAssetsTable } from "@/components/plans/SelectedAssetsTable";
import { PlanSummaryCard } from "@/components/plans/PlanSummaryCard";

export default function PlanNew() {
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
    plan_type: "Quotation",
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    gst_percent: "18",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
    generateNewPlanId();
    loadTemplateFromSession();
  }, []);

  const generateNewPlanId = async () => {
    try {
      const planId = await generatePlanCode();
      setFormData(prev => ({ ...prev, id: planId }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate plan ID",
        variant: "destructive",
      });
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

  const loadTemplateFromSession = () => {
    const templateData = sessionStorage.getItem('planTemplate');
    if (templateData) {
      try {
        const template = JSON.parse(templateData);
        
        // Load template configuration
        setFormData(prev => ({
          ...prev,
          plan_type: template.plan_type,
          gst_percent: template.gst_percent.toString(),
          notes: template.notes || "",
        }));

        // Calculate dates based on template duration
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + (template.duration_days || 30) * 24 * 60 * 60 * 1000);
        setFormData(prev => ({
          ...prev,
          start_date: startDate,
          end_date: endDate,
        }));

        // Load template assets
        if (Array.isArray(template.template_items)) {
          const assetIds = new Set<string>(template.template_items.map((item: any) => item.asset_id));
          setSelectedAssets(assetIds);

          // Load pricing for each asset
          const pricing: Record<string, any> = {};
          template.template_items.forEach((item: any) => {
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

        toast({
          title: "Template Loaded",
          description: `Template "${template.template_name}" loaded successfully`,
        });

        // Clear from session storage
        sessionStorage.removeItem('planTemplate');
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }
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
      // Calculate pro-rata: (monthly_rate / 30) × number_of_days
      const monthlyRate = asset.card_rate || 0;
      const days = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
      const prorataRate = calculateProRata(monthlyRate, days);
      
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
        const itemTotal = netPrice + (pricing.printing_charges || 0) + (pricing.mounting_charges || 0);
        
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

      const durationDays = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
      const totals = calculateTotals();
      const { netTotal, gstAmount, grandTotal } = totals;

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({
          id: formData.id,
          client_id: formData.client_id,
          client_name: formData.client_name,
          plan_name: formData.plan_name,
          plan_type: formData.plan_type,
          start_date: formData.start_date.toISOString().split('T')[0],
          end_date: formData.end_date.toISOString().split('T')[0],
          duration_days: durationDays,
          status: 'Draft',
          total_amount: netTotal,
          gst_percent: parseFloat(formData.gst_percent),
          gst_amount: gstAmount,
          grand_total: grandTotal,
          notes: formData.notes,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (planError) throw planError;

      // Create plan items
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
          plan_id: formData.id,
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
        description: "Plan created successfully",
      });
      navigate(`/admin/plans/${formData.id}`);
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

  const durationDays = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
  const totals = calculateTotals();
  const selectedAssetsArray = Array.from(selectedAssets)
    .map(id => availableAssets.find(a => a.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/plans')}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create New Plan</h1>
          <p className="text-muted-foreground mt-1">Fill in the details below to create a new quotation for your client</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Top 3-Column Grid: Plan Details | Campaign Period | Plan Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Details */}
            <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Plan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan ID</Label>
                  <Input value={formData.id} disabled className="h-10 bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client *</Label>
                  <Select value={formData.client_id} onValueChange={handleClientSelect}>
                    <SelectTrigger className="h-10">
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan Name *</Label>
                  <Input
                    required
                    value={formData.plan_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                    placeholder="e.g., Q1 2025 Campaign"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan Type</Label>
                  <Select value={formData.plan_type} onValueChange={(v) => setFormData(prev => ({ ...prev, plan_type: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quotation">Quotation</SelectItem>
                      <SelectItem value="Proposal">Proposal</SelectItem>
                      <SelectItem value="Estimate">Estimate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Period */}
            <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Campaign Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-10 hover:bg-muted/50">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(formData.start_date)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, start_date: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-10 hover:bg-muted/50">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(formData.end_date)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, end_date: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Duration (Days)</Label>
                  <Input
                    type="number"
                    value={durationDays}
                    disabled
                    className="h-10 bg-muted/30 font-semibold text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated (inclusive)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GST %</Label>
                  <Select value={formData.gst_percent} onValueChange={(v) => setFormData(prev => ({ ...prev, gst_percent: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Plan Summary */}
            <div className="lg:col-span-1">
              <PlanSummaryCard
                selectedCount={selectedAssets.size}
                duration={durationDays}
                subtotal={totals.subtotal}
                discount={totals.totalDiscount}
                netTotal={totals.netTotal}
                gstPercent={parseFloat(formData.gst_percent)}
                gstAmount={totals.gstAmount}
                grandTotal={totals.grandTotal}
                baseRent={totals.totalBaseRent}
              />
            </div>
          </div>

          {/* Selected Assets - Full Width */}
          <Card className="rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary-glow/5">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700 dark:text-slate-200">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                Selected Media Assets ({selectedAssets.size})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1.5">Review and adjust pricing for selected assets</p>
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

          {/* Available Assets - Full Width */}
          <Card className="rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700 dark:text-slate-200">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                Available Media Assets
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1.5">Browse and add assets to your plan</p>
            </CardHeader>
            <CardContent className="pt-6">
              <AssetSelectionTable
                assets={availableAssets}
                selectedIds={selectedAssets}
                onSelect={toggleAssetSelection}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/plans')}
              size="lg"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
              disabled={loading}
              size="lg"
            >
              {loading ? "Creating Plan..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
