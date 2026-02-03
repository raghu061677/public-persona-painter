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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { 
  calculateDurationDays, 
  calculateProRata,
  formatDate 
} from "@/utils/plans";
import {
  DurationMode,
  calculateDurationFactor,
  calculateMonthsFromDays,
  toDateOnly,
  formatForSupabase,
  BILLING_CYCLE_DAYS,
} from "@/utils/billingEngine";
import { LineItemDurationControl } from "@/components/plans/LineItemDurationControl";
import { ArrowLeft, Calendar as CalendarIcon, FileText, CalendarDays, DollarSign, Info, FileSpreadsheet, Loader2 } from "lucide-react";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { cn } from "@/lib/utils";
import { AssetSelectionTable } from "@/components/plans/AssetSelectionTable";
import { SelectedAssetsTable } from "@/components/plans/SelectedAssetsTable";
import { PlanSummaryCard } from "@/components/plans/PlanSummaryCard";
import { calcProRata, calcDiscount, calcProfit } from "@/utils/pricing";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateProposalExcel } from "@/lib/exports/proposalExcelExport";

type TaxType = 'CGST_SGST' | 'IGST';

export default function PlanEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportingProposal, setExportingProposal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetPricing, setAssetPricing] = useState<Record<string, any>>({});
  const [companyState, setCompanyState] = useState<string>("");
  const [manualTaxOverride, setManualTaxOverride] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    client_id: "",
    client_name: "",
    plan_name: "",
    plan_type: "Quotation" as "Quotation" | "Proposal" | "Estimate",
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    duration_days: 30,
    duration_mode: 'MONTH' as DurationMode,
    months_count: 1,
    gst_percent: "18",
    tax_type: "CGST_SGST" as TaxType,
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
    fetchPlan();
    fetchCompanyState();
  }, [id]);

  // Auto-detect tax type when client changes
  useEffect(() => {
    if (!manualTaxOverride && formData.client_id && companyState) {
      const client = clients.find(c => c.id === formData.client_id);
      const clientState = client?.billing_state || "";
      
      // Normalize state names for comparison (case-insensitive, trimmed)
      const normalizedCompanyState = companyState.toLowerCase().trim();
      const normalizedClientState = clientState.toLowerCase().trim();
      
      const isSameState = normalizedCompanyState === normalizedClientState && normalizedClientState !== "";
      const detectedTaxType: TaxType = isSameState ? 'CGST_SGST' : 'IGST';
      
      if (formData.tax_type !== detectedTaxType) {
        setFormData(prev => ({ ...prev, tax_type: detectedTaxType }));
      }
    }
  }, [formData.client_id, companyState, clients, manualTaxOverride]);

  const fetchCompanyState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (companyUser?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('state')
          .eq('id', companyUser.company_id)
          .single();

        if (company?.state) {
          setCompanyState(company.state);
        }
      }
    } catch (error) {
      console.error('Error fetching company state:', error);
    }
  };

  const fetchPlan = async () => {
    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (plan) {
      const days = calculateDurationDays(new Date(plan.start_date), new Date(plan.end_date));
      const months = plan.months_count || calculateMonthsFromDays(days);
      
      // If plan has manual tax override saved, set it
      if ((plan as any).tax_type) {
        setManualTaxOverride(true);
      }
      
      setFormData({
        id: plan.id,
        client_id: plan.client_id,
        client_name: plan.client_name,
        plan_name: plan.plan_name,
        plan_type: plan.plan_type,
        start_date: new Date(plan.start_date),
        end_date: new Date(plan.end_date),
        duration_days: days,
        duration_mode: (plan.duration_mode as DurationMode) || 'MONTH',
        months_count: months,
        gst_percent: plan.gst_percent.toString(),
        tax_type: ((plan as any).tax_type as TaxType) || 'CGST_SGST',
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
          // Load sales_price from DB; if it's 0 or null, fallback to card_rate
          const cardRate = item.card_rate || 0;
          const effectivePrice = (item.sales_price && item.sales_price > 0) 
            ? item.sales_price 
            : cardRate;
          
          pricing[item.asset_id] = {
            negotiated_price: effectivePrice, // Primary UI field
            sales_price: effectivePrice,      // Keep in sync for compatibility
            printing_charges: item.printing_charges || 0,
            mounting_charges: item.mounting_charges || 0,
            printing_rate: item.printing_rate || 0,
            mounting_rate: item.installation_rate || 0,
            discount_value: item.discount_value || 0,
            discount_amount: item.discount_amount || 0,
            // Per-asset duration fields
            start_date: item.start_date || null,
            end_date: item.end_date || null,
            booked_days: item.booked_days || null,
            billing_mode: item.billing_mode || 'PRORATA_30',
            daily_rate: item.daily_rate || null,
            rent_amount: item.rent_amount || null,
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
      const baseRate = asset.base_rate || 0;
      const days = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));
      
      // Calculate initial values
      const proRata = calcProRata(cardRate, days);
      const discount = calcDiscount(cardRate, cardRate);
      const profit = calcProfit(baseRate, cardRate);
      
      // Initialize with plan-level dates for per-asset duration
      const planStart = formatForSupabase(toDateOnly(formData.start_date));
      const planEnd = formatForSupabase(toDateOnly(formData.end_date));
      const dailyRate = cardRate / BILLING_CYCLE_DAYS;
      const rentAmount = dailyRate * days;
      
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
          // Per-asset duration fields initialized from plan
          start_date: planStart,
          end_date: planEnd,
          booked_days: days,
          billing_mode: 'PRORATA_30',
          daily_rate: dailyRate,
          rent_amount: rentAmount,
        }
      }));
    }
    setSelectedAssets(newSelected);
  };

  const handleMultiSelect = (assetIds: string[], assets: any[]) => {
    const newSelected = new Set(selectedAssets);
    const newPricing = { ...assetPricing };
    const days = calculateDurationDays(new Date(formData.start_date), new Date(formData.end_date));

    // Plan-level dates for initialization
    const planStart = formatForSupabase(toDateOnly(formData.start_date));
    const planEnd = formatForSupabase(toDateOnly(formData.end_date));

    assets.forEach(asset => {
      newSelected.add(asset.id);
      const cardRate = asset.card_rate || 0;
      const baseRate = asset.base_rate || 0;
      
      const proRata = calcProRata(cardRate, days);
      const discount = calcDiscount(cardRate, cardRate);
      const profit = calcProfit(baseRate, cardRate);
      const dailyRate = cardRate / BILLING_CYCLE_DAYS;
      const rentAmount = dailyRate * days;
      
      newPricing[asset.id] = {
        negotiated_price: cardRate,
        pro_rata: proRata,
        discount_value: discount.value,
        discount_percent: discount.percent,
        profit_value: profit.value,
        profit_percent: profit.percent,
        printing_charges: asset.printing_charges || 0,
        mounting_charges: asset.mounting_charges || 0,
        // Per-asset duration fields initialized from plan
        start_date: planStart,
        end_date: planEnd,
        booked_days: days,
        billing_mode: 'PRORATA_30',
        daily_rate: dailyRate,
        rent_amount: rentAmount,
      };
    });

    setSelectedAssets(newSelected);
    setAssetPricing(newPricing);

    toast({
      title: "Success",
      description: `Added ${assets.length} asset${assets.length > 1 ? 's' : ''} to plan`,
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
    let displayCost = 0;
    let printingCost = 0;
    let mountingCost = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    let totalBaseRent = 0;

    selectedAssets.forEach(assetId => {
      const pricing = assetPricing[assetId];
      const asset = availableAssets.find(a => a.id === assetId);
      
      if (pricing && asset) {
        // Use per-asset booked_days if available, fallback to plan duration
        const assetDays = pricing.booked_days || formData.duration_days;
        
        const cardRate = asset.card_rate || 0;
        const baseRate = asset.base_rate || 0;
        const negotiatedPrice = pricing.negotiated_price || cardRate;
        const printing = pricing.printing_charges || 0;
        const mounting = pricing.mounting_charges || 0;
        
        // Calculate pro-rata based on negotiated price using per-asset days
        const proRata = calcProRata(negotiatedPrice, assetDays);
        
        // Calculate discount: (Card Rate - Negotiated Price) pro-rated
        const discountMonthly = cardRate - negotiatedPrice;
        const discountProRata = calcProRata(discountMonthly, assetDays);
        
        // Calculate profit: (Negotiated Price - Base Rate) pro-rated
        const profitMonthly = negotiatedPrice - baseRate;
        const profitProRata = calcProRata(profitMonthly, assetDays);
        
        displayCost += proRata;
        printingCost += printing;
        mountingCost += mounting;
        totalDiscount += discountProRata;
        totalProfit += profitProRata;
        totalBaseRent += calcProRata(baseRate, assetDays);  // Pro-rate the base rate
      }
    });

    const subtotal = displayCost + printingCost + mountingCost;
    const netTotal = subtotal;
    const gstPercent = parseFloat(formData.gst_percent);
    const totalGst = (netTotal * gstPercent) / 100;
    
    // Calculate CGST, SGST, IGST based on tax type
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (formData.tax_type === 'IGST') {
      igstAmount = totalGst;
    } else {
      cgstAmount = totalGst / 2;
      sgstAmount = totalGst / 2;
    }
    
    const grandTotal = netTotal + totalGst;

    return {
      displayCost,
      printingCost,
      mountingCost,
      subtotal,
      totalDiscount,
      netTotal,
      totalProfit,
      gstAmount: totalGst,
      cgstAmount,
      sgstAmount,
      igstAmount,
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

      const durationDays = formData.duration_days;
      const totals = calculateTotals();
      const { netTotal, gstAmount, grandTotal } = totals;

      // Update plan with duration mode, months, and tax breakdown
      const gstPercent = parseFloat(formData.gst_percent);
      const { error: planError } = await supabase
        .from('plans')
        .update({
          client_id: formData.client_id,
          client_name: formData.client_name,
          plan_name: formData.plan_name,
          plan_type: formData.plan_type,
          start_date: formatForSupabase(toDateOnly(formData.start_date)),
          end_date: formatForSupabase(toDateOnly(formData.end_date)),
          duration_days: durationDays,
          duration_mode: formData.duration_mode,
          months_count: formData.months_count,
          total_amount: netTotal,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          // Tax type fields
          tax_type: formData.tax_type,
          cgst_percent: formData.tax_type === 'CGST_SGST' ? gstPercent / 2 : 0,
          sgst_percent: formData.tax_type === 'CGST_SGST' ? gstPercent / 2 : 0,
          igst_percent: formData.tax_type === 'IGST' ? gstPercent : 0,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          igst_amount: totals.igstAmount,
          notes: formData.notes,
        } as any)
        .eq('id', id);

      if (planError) throw planError;

      // Delete existing plan items
      await supabase
        .from('plan_items')
        .delete()
        .eq('plan_id', id);

      // Create new plan items with FULL media asset snapshot
      const items = Array.from(selectedAssets).map(assetId => {
        const asset = availableAssets.find(a => a.id === assetId);
        const pricing = assetPricing[assetId] || {};
        
        const cardRate = asset?.card_rate || 0;
        const baseRate = asset?.base_rate || 0;
        // Priority: negotiated_price > sales_price > cardRate (consistent with PlanNew.tsx)
        const negotiatedPrice = pricing?.negotiated_price || pricing?.sales_price || cardRate;
        const printingRate = pricing?.printing_rate || 0;
        const mountingRate = pricing?.mounting_rate || 0;
        const printing = pricing?.printing_charges || 0;
        const mounting = pricing?.mounting_charges || 0;
        
        // Per-asset dates: use asset-level dates if set, otherwise fallback to plan dates
        const assetStartDate = pricing.start_date 
          ? (typeof pricing.start_date === 'string' ? pricing.start_date : new Date(pricing.start_date).toISOString().split('T')[0])
          : formatForSupabase(toDateOnly(formData.start_date));
        const assetEndDate = pricing.end_date 
          ? (typeof pricing.end_date === 'string' ? pricing.end_date : new Date(pricing.end_date).toISOString().split('T')[0])
          : formatForSupabase(toDateOnly(formData.end_date));
        
        // Calculate booked days for this asset
        const startD = new Date(assetStartDate);
        const endD = new Date(assetEndDate);
        const assetBookedDays = pricing.booked_days || Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        
        // Per-asset billing mode
        const billingMode = pricing.billing_mode || 'PRORATA_30';
        
        // Calculate daily rate and rent amount
        const dailyRate = pricing.daily_rate || (negotiatedPrice / BILLING_CYCLE_DAYS);
        const rentAmount = pricing.rent_amount || (dailyRate * assetBookedDays);
        
        // Calculate pro-rata using asset-specific days
        const proRata = calcProRata(negotiatedPrice, assetBookedDays);
        
        // Calculate discount (monthly and pro-rated)
        const discountMonthly = cardRate - negotiatedPrice;
        const discountAmount = calcProRata(discountMonthly, assetBookedDays);
        
        // Calculate subtotal
        const subtotal = proRata + printing + mounting;
        const itemGst = (subtotal * parseFloat(formData.gst_percent)) / 100;
        const totalWithGst = subtotal + itemGst;

        return {
          plan_id: id,
          asset_id: assetId,
          // Complete media asset snapshot for exports and campaign conversion
          media_type: asset.media_type,
          state: asset.state,
          district: asset.district,
          city: asset.city,
          area: asset.area,
          location: asset.location,
          direction: asset.direction,
          dimensions: asset.dimensions,
          total_sqft: asset.total_sqft,
          illumination_type: asset.illumination_type || asset.illumination,
          latitude: asset.latitude,
          longitude: asset.longitude,
          // Pricing fields
          card_rate: cardRate,
          base_rent: baseRate,  // Note: plan_items.base_rent stores media_assets.base_rate
          sales_price: negotiatedPrice,
          discount_type: 'Amount',
          discount_value: discountMonthly,
          discount_amount: discountAmount,
          printing_rate: printingRate,
          printing_cost: printing,
          printing_charges: printing,
          installation_rate: mountingRate,
          installation_cost: mounting,
          mounting_charges: mounting,
          subtotal,
          gst_amount: itemGst,
          total_with_gst: totalWithGst,
          // Per-asset duration fields (preserved on conversion to campaign)
          start_date: assetStartDate,
          end_date: assetEndDate,
          booked_days: assetBookedDays,
          billing_mode: billingMode,
          daily_rate: Math.round(dailyRate * 100) / 100,
          rent_amount: Math.round(rentAmount * 100) / 100,
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

  // Proposal Excel export handler (READ-ONLY - no DB writes)
  const handleExportProposalExcel = async () => {
    if (selectedAssetsArray.length === 0) {
      toast({
        title: "No Assets Selected",
        description: "Please select at least one asset to export.",
        variant: "destructive",
      });
      return;
    }

    setExportingProposal(true);
    try {
      const blob = await generateProposalExcel({
        planId: formData.id || id || 'PLAN',
        planName: formData.plan_name || 'Plan',
        clientName: formData.client_name || '',
        assets: selectedAssetsArray,
        assetPricing,
        planStartDate: formData.start_date instanceof Date ? formData.start_date : new Date(formData.start_date),
        planEndDate: formData.end_date instanceof Date ? formData.end_date : new Date(formData.end_date),
        durationDays,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposal_${formData.plan_name || 'Plan'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Proposal Excel downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate proposal Excel.",
        variant: "destructive",
      });
    } finally {
      setExportingProposal(false);
    }
  };

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
                  <ClientSelect
                    clients={clients}
                    value={formData.client_id}
                    onSelect={handleClientSelect}
                    placeholder="Select client"
                    returnPath={`/admin/plans/${id}/edit`}
                  />
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Tax Type</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>CGST+SGST:</strong> Same state (intra-state)</p>
                          <p><strong>IGST:</strong> Different state (inter-state)</p>
                          <p className="mt-1 text-xs">Company: {companyState || 'Not set'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select 
                    value={formData.tax_type} 
                    onValueChange={(v: TaxType) => {
                      setManualTaxOverride(true);
                      setFormData(prev => ({ ...prev, tax_type: v }));
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">CGST + SGST ({parseFloat(formData.gst_percent)/2}% + {parseFloat(formData.gst_percent)/2}%)</SelectItem>
                      <SelectItem value="IGST">IGST ({formData.gst_percent}%)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!manualTaxOverride && (
                    <p className="text-xs text-muted-foreground">Auto-detected based on client state</p>
                  )}
                  {manualTaxOverride && (
                    <Button 
                      type="button" 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => setManualTaxOverride(false)}
                    >
                      Reset to auto-detect
                    </Button>
                  )}
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
                planStartDate={formData.start_date instanceof Date ? formData.start_date : new Date(formData.start_date)}
                planEndDate={formData.end_date instanceof Date ? formData.end_date : new Date(formData.end_date)}
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
                onMultiSelect={handleMultiSelect}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportProposalExcel}
              disabled={exportingProposal || selectedAssets.size === 0}
            >
              {exportingProposal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Download Proposal Excel
            </Button>
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
