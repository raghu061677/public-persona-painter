import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
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
import { ArrowLeft, Calendar as CalendarIcon, FileText, CalendarDays, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetSelectionTable } from "@/components/plans/AssetSelectionTable";
import { SelectedAssetsTable } from "@/components/plans/SelectedAssetsTable";
import { PlanSummaryCard } from "@/components/plans/PlanSummaryCard";
import { calcProRata, calcDiscount, calcProfit } from "@/utils/pricing";

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
            negotiated_price: item.sales_price,
            printing_charges: item.printing_charges || 0,
            mounting_charges: item.mounting_charges || 0,
            discount_value: item.discount_value || 0,
            discount_amount: item.discount_amount || 0,
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
      // Default negotiated price to card_rate
      const cardRate = asset.card_rate || 0;
      const baseRate = asset.base_rent || 0;
      const days = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
      
      // Calculate initial values
      const proRata = calcProRata(cardRate, days);
      const discount = calcDiscount(cardRate, cardRate);
      const profit = calcProfit(baseRate, cardRate);
      
      setAssetPricing(prev => ({
        ...prev,
        [assetId]: {
          negotiated_price: cardRate,
          pro_rata: proRata,
          discount_value: discount.value,
          discount_percent: discount.percent,
          profit_value: profit.value,
          profit_percent: profit.percent,
          printing_charges: asset.printing_charges || 0,
          mounting_charges: asset.mounting_charges || 0,
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
    let displayCost = 0;
    let printingCost = 0;
    let mountingCost = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    let totalBaseRent = 0;

    const days = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));

    selectedAssets.forEach(assetId => {
      const pricing = assetPricing[assetId];
      const asset = availableAssets.find(a => a.id === assetId);
      
      if (pricing && asset) {
        const cardRate = asset.card_rate || 0;
        const baseRate = asset.base_rent || 0;
        const negotiatedPrice = pricing.negotiated_price || cardRate;
        const printing = pricing.printing_charges || 0;
        const mounting = pricing.mounting_charges || 0;
        
        // Calculate pro-rata based on negotiated price
        const proRata = calcProRata(negotiatedPrice, days);
        
        // Calculate discount: (Card Rate - Negotiated Price) pro-rated
        const discountMonthly = cardRate - negotiatedPrice;
        const discountProRata = calcProRata(discountMonthly, days);
        
        // Calculate profit: (Negotiated Price - Base Rate) pro-rated
        const profitMonthly = negotiatedPrice - baseRate;
        const profitProRata = calcProRata(profitMonthly, days);
        
        displayCost += proRata;
        printingCost += printing;
        mountingCost += mounting;
        totalDiscount += discountProRata;
        totalProfit += profitProRata;
        totalBaseRent += baseRate;
      }
    });

    const subtotal = displayCost + printingCost + mountingCost;
    const netTotal = subtotal;
    const gstAmount = (netTotal * parseFloat(formData.gst_percent)) / 100;
    const grandTotal = netTotal + gstAmount;

    return {
      displayCost,
      printingCost,
      mountingCost,
      subtotal,
      totalDiscount,
      netTotal,
      totalProfit,
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
        
        const cardRate = asset.card_rate || 0;
        const baseRate = asset.base_rent || 0;
        const negotiatedPrice = pricing.negotiated_price || cardRate;
        const printing = pricing.printing_charges || 0;
        const mounting = pricing.mounting_charges || 0;
        
        // Calculate pro-rata
        const proRata = calcProRata(negotiatedPrice, durationDays);
        
        // Calculate discount (monthly and pro-rated)
        const discountMonthly = cardRate - negotiatedPrice;
        const discountAmount = calcProRata(discountMonthly, durationDays);
        
        // Calculate subtotal
        const subtotal = proRata + printing + mounting;
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
          card_rate: cardRate,
          base_rent: baseRate,
          sales_price: negotiatedPrice,
          discount_type: 'Amount',
          discount_value: discountMonthly,
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

  const durationDays = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
  const totals = calculateTotals();
  const selectedAssetsArray = Array.from(selectedAssets)
    .map(id => availableAssets.find(a => a.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/plans/${id}`)}
          className="mb-6 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plan
        </Button>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Edit Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Update plan details and modify asset selection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Top 3-Column Grid: Plan Details | Campaign Period | Plan Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Details */}
            <SectionCard
              title="Plan Details"
              icon={FileText}
              variant="blue"
              description="Basic plan information"
            >
              <div className="space-y-4">
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
                  <Select value={formData.plan_type} onValueChange={(v: "Quotation" | "Proposal" | "Estimate") => setFormData(prev => ({ ...prev, plan_type: v }))}>
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
              </div>
            </SectionCard>

            {/* Campaign Period */}
            <SectionCard
              title="Campaign Period"
              icon={CalendarDays}
              variant="green"
              description="Duration and dates"
            >
              <div className="space-y-4">
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
              </div>
            </SectionCard>

            {/* Plan Summary - Now with Orange Border */}
            <div className="lg:col-span-1">
              <SectionCard
                title="Financial Summary"
                icon={DollarSign}
                variant="orange"
                description="Cost breakdown"
                className="h-full"
              >
                <PlanSummaryCard
                selectedCount={selectedAssets.size}
                duration={durationDays}
                displayCost={totals.displayCost}
                printingCost={totals.printingCost}
                mountingCost={totals.mountingCost}
                subtotal={totals.subtotal}
                discount={totals.totalDiscount}
                netTotal={totals.netTotal}
                profit={totals.totalProfit}
                gstPercent={parseFloat(formData.gst_percent)}
                gstAmount={totals.gstAmount}
                grandTotal={totals.grandTotal}
                baseRent={totals.totalBaseRent}
                withCard={false}
              />
              </SectionCard>
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
          <div className="flex justify-end gap-4 pt-4 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/plans/${id}`)}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px] bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
              {loading ? "Updating..." : "Update Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
