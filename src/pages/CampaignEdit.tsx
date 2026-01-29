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
import { ArrowLeft, CalendarIcon, Plus, Trash2, Save, X, AlertCircle, Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AddCampaignAssetsDialog } from "@/components/campaigns/AddCampaignAssetsDialog";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PrintingPricingBar } from "@/components/shared/PrintingPricingBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculatePrintingCost, calculateMountingCost, getAssetSqft } from "@/utils/effectivePricing";
import {
  DurationMode,
  calculateDurationDays,
  calculateEndDate,
  calculateMonthsFromDays,
  BILLING_CYCLE_DAYS,
} from "@/utils/billingEngine";
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

import { 
  BillingMode, 
  computeBookedDays, 
  computeRentAmount,
  BILLING_CYCLE_DAYS as PRICING_BILLING_CYCLE_DAYS 
} from "@/utils/perAssetPricing";
import { CampaignAssetDurationCell } from "@/components/campaigns/CampaignAssetDurationCell";
import { ApplyDatesToAssetsDialog } from "@/components/campaigns/ApplyDatesToAssetsDialog";

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
  // Per-asset duration fields
  start_date: Date | string | null;
  end_date: Date | string | null;
  booked_days: number;
  billing_mode: BillingMode;
  daily_rate: number;
  rent_amount: number;
  // Sqft-based pricing fields
  total_sqft: number;
  printing_rate_per_sqft: number;
  mounting_rate_per_sqft: number;
  printing_cost: number;
  mounting_cost: number;
  dimensions?: string;
}

export default function CampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [showAddAssetsDialog, setShowAddAssetsDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<CampaignAsset | null>(null);
  const [showApplyDatesDialog, setShowApplyDatesDialog] = useState(false);
  const [pendingDatesUpdate, setPendingDatesUpdate] = useState<{ start: Date; end: Date } | null>(null);
  
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
  const [companyPrefix, setCompanyPrefix] = useState<string | null>(null);
  
  // Duration settings
  const [durationMode, setDurationMode] = useState<DurationMode>('MONTH');
  const [durationValue, setDurationValue] = useState<number>(1);
  
  // Campaign assets (from campaign_assets table - primary source)
  const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>([]);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
  
  // Selection state for bulk operations
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
  // Bulk pricing rates
  const [bulkPrintingRate, setBulkPrintingRate] = useState<number>(17);
  const [bulkMountingRate, setBulkMountingRate] = useState<number>(8);

  useEffect(() => {
    fetchClients();
    fetchCompanySettings();
    if (id) {
      updateCampaignStatuses().then(() => {
        fetchCampaign();
      });
    }
  }, [id]);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_id, companies(asset_id_prefix, name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (companyUser?.companies) {
          const company = companyUser.companies as any;
          setCompanyPrefix(company.asset_id_prefix || null);
        }
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

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
    
    // Calculate and set duration from dates
    if (campaignStartDate && campaignEndDate) {
      const days = calculateDurationDays(campaignStartDate, campaignEndDate);
      const months = calculateMonthsFromDays(days);
      
      // Determine if this is month-wise or day-wise based on the billing_cycle
      const mode = campaign.billing_cycle === 'DAILY' ? 'DAYS' : 'MONTH';
      setDurationMode(mode);
      
      if (mode === 'MONTH') {
        setDurationValue(months);
      } else {
        setDurationValue(days);
      }
    }
    
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
      // Fetch media_asset data including total_sqft for proper display and calculations
      const assetIds = assets.map(a => a.asset_id);
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('id, media_asset_code, total_sqft, dimensions')
        .in('id', assetIds);
      
      const mediaAssetDataMap = new Map<string, { code: string; sqft: number; dimensions: string }>();
      mediaAssets?.forEach(ma => {
        mediaAssetDataMap.set(ma.id, { 
          code: ma.media_asset_code || ma.id,
          sqft: Number(ma.total_sqft) || 0,
          dimensions: ma.dimensions || ''
        });
      });

      setCampaignAssets(assets.map(asset => {
        const assetStartDate = asset.booking_start_date || campaign.start_date;
        const assetEndDate = asset.booking_end_date || campaign.end_date;
        const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
        
        // ALWAYS recalculate rent to avoid precision errors from stored rounded values
        const rentResult = assetStartDate && assetEndDate 
          ? computeRentAmount(monthlyRate, assetStartDate, assetEndDate, (asset.billing_mode as BillingMode) || 'PRORATA_30')
          : { booked_days: 0, daily_rate: 0, rent_amount: 0, billing_mode: 'PRORATA_30' as BillingMode };
        
        const assetData = mediaAssetDataMap.get(asset.asset_id);
        const totalSqft = Number(asset.total_sqft) || assetData?.sqft || 0;
        
        // Calculate printing and mounting rates from existing charges
        const printingCharges = Number(asset.printing_charges) || 0;
        const mountingCharges = Number(asset.mounting_charges) || 0;
        const printingRatePerSqft = totalSqft > 0 && printingCharges > 0 ? printingCharges / totalSqft : 0;
        const mountingRatePerSqft = totalSqft > 0 && mountingCharges > 0 ? mountingCharges / totalSqft : 0;
        
        return {
          id: asset.id,
          asset_id: asset.asset_id,
          media_asset_code: assetData?.code || asset.asset_id,
          location: asset.location || '',
          area: asset.area || '',
          city: asset.city || '',
          media_type: asset.media_type || '',
          card_rate: Number(asset.card_rate) || 0,
          negotiated_rate: monthlyRate,
          printing_charges: printingCharges,
          mounting_charges: mountingCharges,
          total_price: Number(asset.total_price) || 0,
          status: asset.status || 'Pending',
          start_date: assetStartDate,
          end_date: assetEndDate,
          // Always use freshly computed values to avoid precision errors
          booked_days: rentResult.booked_days,
          billing_mode: (asset.billing_mode as BillingMode) || 'PRORATA_30',
          daily_rate: rentResult.daily_rate,
          rent_amount: rentResult.rent_amount,
          // New sqft-based fields
          total_sqft: totalSqft,
          printing_rate_per_sqft: printingRatePerSqft,
          mounting_rate_per_sqft: mountingRatePerSqft,
          printing_cost: printingCharges,
          mounting_cost: mountingCharges,
          dimensions: assetData?.dimensions || asset.dimensions || '',
        };
      }));
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
            media_type,
            total_sqft,
            dimensions
          )
        `)
        .eq('campaign_id', id)
        .order('created_at');

      if (items && items.length > 0) {
        const campaignStart = campaign.start_date;
        const campaignEnd = campaign.end_date;
        
        setCampaignAssets(items.map(item => {
          const asset = item.media_assets as any;
          const finalPrice = Number(item.final_price) || Number(item.negotiated_rate) || 0;
          const printingCharge = Number(item.printing_charge) || 0;
          const mountingCharge = Number(item.mounting_charge) || 0;
          const totalSqft = Number(asset?.total_sqft) || 0;
          const rentResult = campaignStart && campaignEnd 
            ? computeRentAmount(finalPrice, campaignStart, campaignEnd, 'PRORATA_30')
            : { booked_days: 0, daily_rate: 0, rent_amount: 0, billing_mode: 'PRORATA_30' as BillingMode };
          
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
            status: 'Pending',
            start_date: campaignStart,
            end_date: campaignEnd,
            booked_days: rentResult.booked_days,
            billing_mode: 'PRORATA_30' as BillingMode,
            daily_rate: rentResult.daily_rate,
            rent_amount: rentResult.rent_amount,
            // New sqft-based fields
            total_sqft: totalSqft,
            printing_rate_per_sqft: totalSqft > 0 && printingCharge > 0 ? printingCharge / totalSqft : 0,
            mounting_rate_per_sqft: totalSqft > 0 && mountingCharge > 0 ? mountingCharge / totalSqft : 0,
            printing_cost: printingCharge,
            mounting_cost: mountingCharge,
            dimensions: asset?.dimensions || '',
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
      
      // Recalculate rent if dates are set
      if (updated[index].start_date && updated[index].end_date) {
        const rentResult = computeRentAmount(
          negotiated,
          updated[index].start_date!,
          updated[index].end_date!,
          updated[index].billing_mode
        );
        updated[index].booked_days = rentResult.booked_days;
        updated[index].daily_rate = rentResult.daily_rate;
        updated[index].rent_amount = rentResult.rent_amount;
      }
    }
    
    setCampaignAssets(updated);
  };
  
  // Handler for per-asset duration changes
  const handleAssetDurationChange = (index: number, updates: {
    start_date?: Date | string;
    end_date?: Date | string;
    billing_mode?: BillingMode;
    booked_days?: number;
    daily_rate?: number;
    rent_amount?: number;
  }) => {
    const updated = [...campaignAssets];
    updated[index] = { ...updated[index], ...updates };
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
    const campaignStart = startDate;
    const campaignEnd = endDate;
    
    const newAssets: CampaignAsset[] = assets.map(asset => {
      const monthlyRate = Number(asset.card_rate) || 0;
      const totalSqft = Number(asset.total_sqft) || 0;
      const rentResult = campaignStart && campaignEnd 
        ? computeRentAmount(monthlyRate, campaignStart, campaignEnd, 'PRORATA_30')
        : { booked_days: 0, daily_rate: 0, rent_amount: 0, billing_mode: 'PRORATA_30' as BillingMode };
      
      return {
        id: `new-${Date.now()}-${asset.id}`,
        asset_id: asset.id,
        media_asset_code: asset.media_asset_code || asset.id,
        location: asset.location || '',
        area: asset.area || '',
        city: asset.city || '',
        media_type: asset.media_type || '',
        card_rate: monthlyRate,
        negotiated_rate: monthlyRate,
        printing_charges: 0,
        mounting_charges: 0,
        total_price: monthlyRate,
        status: 'Pending',
        isNew: true,
        start_date: campaignStart || null,
        end_date: campaignEnd || null,
        booked_days: rentResult.booked_days,
        billing_mode: 'PRORATA_30' as BillingMode,
        daily_rate: rentResult.daily_rate,
        rent_amount: rentResult.rent_amount,
        // New sqft-based fields
        total_sqft: totalSqft,
        printing_rate_per_sqft: 0,
        mounting_rate_per_sqft: 0,
        printing_cost: 0,
        mounting_cost: 0,
        dimensions: asset.dimensions || '',
      };
    });
    
    setCampaignAssets(prev => [...prev, ...newAssets]);
    toast({
      title: "Assets added",
      description: `${assets.length} asset(s) added to campaign`,
    });
  };

  // Calculate duration days from dates
  const getDurationDays = (): number => {
    if (!startDate || !endDate) return 0;
    return calculateDurationDays(startDate, endDate);
  };

  // Legacy handler - kept for reference, replaced by handleDurationValueChangeWithSync
  const handleDurationValueChange = (value: number) => {
    handleDurationValueChangeWithSync(value);
  };
  
  // Handle duration mode change
  const handleDurationModeChange = (mode: DurationMode) => {
    setDurationMode(mode);
    
    const currentDays = getDurationDays();
    if (currentDays > 0) {
      if (mode === 'MONTH') {
        // Convert current days to months
        setDurationValue(calculateMonthsFromDays(currentDays));
      } else {
        // Use current days
        setDurationValue(currentDays);
      }
    }
  };
  
  // Handle start date change (keep duration, update end date)
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    let daysToAdd: number;
    if (durationMode === 'MONTH') {
      daysToAdd = durationValue * BILLING_CYCLE_DAYS;
    } else {
      daysToAdd = durationValue;
    }
    
    const newEndDate = calculateEndDate(date, daysToAdd);
    
    // If there are assets, prompt user to apply dates
    if (campaignAssets.length > 0) {
      setPendingDatesUpdate({ start: date, end: newEndDate });
      setShowApplyDatesDialog(true);
    } else {
      setStartDate(date);
      setEndDate(newEndDate);
    }
  };
  
  // Handle end date change (update duration value)
  const handleEndDateChange = (date: Date | undefined) => {
    if (!date || !startDate) return;
    
    const days = calculateDurationDays(startDate, date);
    
    // If there are assets, prompt user to apply dates
    if (campaignAssets.length > 0) {
      setPendingDatesUpdate({ start: startDate, end: date });
      setShowApplyDatesDialog(true);
    } else {
      setEndDate(date);
      if (durationMode === 'MONTH') {
        setDurationValue(calculateMonthsFromDays(days));
      } else {
        setDurationValue(days);
      }
    }
  };

  // Handle duration value change (update end date accordingly)
  const handleDurationValueChangeWithSync = (value: number) => {
    if (value < 0.5) return;
    
    if (!startDate) {
      setDurationValue(value);
      return;
    }
    
    let daysToAdd: number;
    if (durationMode === 'MONTH') {
      daysToAdd = value * BILLING_CYCLE_DAYS;
    } else {
      daysToAdd = value;
    }
    
    const newEndDate = calculateEndDate(startDate, daysToAdd);
    
    // If there are assets, prompt user to apply dates
    if (campaignAssets.length > 0) {
      setPendingDatesUpdate({ start: startDate, end: newEndDate });
      setShowApplyDatesDialog(true);
      setDurationValue(value);
    } else {
      setDurationValue(value);
      setEndDate(newEndDate);
    }
  };

  // Apply campaign dates to all assets
  const applyDatesToAllAssets = () => {
    if (!pendingDatesUpdate) return;
    
    const { start, end } = pendingDatesUpdate;
    setStartDate(start);
    setEndDate(end);
    
    const days = calculateDurationDays(start, end);
    if (durationMode === 'MONTH') {
      setDurationValue(calculateMonthsFromDays(days));
    } else {
      setDurationValue(days);
    }
    
    // Update all assets with new dates and recalculate rent
    const updatedAssets = campaignAssets.map(asset => {
      const monthlyRate = asset.negotiated_rate || asset.card_rate || 0;
      const rentResult = computeRentAmount(monthlyRate, start, end, asset.billing_mode);
      
      return {
        ...asset,
        start_date: start,
        end_date: end,
        booked_days: rentResult.booked_days,
        daily_rate: rentResult.daily_rate,
        rent_amount: rentResult.rent_amount,
      };
    });
    
    setCampaignAssets(updatedAssets);
    setShowApplyDatesDialog(false);
    setPendingDatesUpdate(null);
  };

  // Keep individual asset dates (only update campaign header)
  const skipApplyDatesToAssets = () => {
    if (!pendingDatesUpdate) return;
    
    const { start, end } = pendingDatesUpdate;
    setStartDate(start);
    setEndDate(end);
    
    const days = calculateDurationDays(start, end);
    if (durationMode === 'MONTH') {
      setDurationValue(calculateMonthsFromDays(days));
    } else {
      setDurationValue(days);
    }
    
    setShowApplyDatesDialog(false);
    setPendingDatesUpdate(null);
  };

  const calculateTotals = () => {
    // Use FULL precision throughout accumulation, round only final results
    // This prevents floating-point errors like 300000.60 instead of 300000.00
    let rentTotalRaw = 0;
    let printingTotal = 0;
    let mountingTotal = 0;

    campaignAssets.forEach(asset => {
      // Calculate rent using full precision formula: (monthly_rate / 30) * days
      // NO rounding of individual asset rents - accumulate raw values
      const monthlyRate = asset.negotiated_rate || asset.card_rate || 0;
      const days = asset.booked_days || getDurationDays();
      // Use raw calculation without rounding to avoid compounding errors
      const assetRentRaw = (monthlyRate / PRICING_BILLING_CYCLE_DAYS) * days;
      
      const printing = asset.printing_charges || 0;
      const mounting = asset.mounting_charges || 0;
      
      rentTotalRaw += assetRentRaw;
      printingTotal += printing;
      mountingTotal += mounting;
    });

    // Round ONLY the final totals
    const rentTotal = Math.round(rentTotalRaw * 100) / 100;
    const totalAmount = Math.round((rentTotal + printingTotal + mountingTotal) * 100) / 100;
    const effectiveGstPercent = isGstApplicable ? gstPercent : 0;
    const gstAmount = Math.round((totalAmount * effectiveGstPercent / 100) * 100) / 100;
    const grandTotal = Math.round((totalAmount + gstAmount) * 100) / 100;

    return { 
      subtotal: rentTotal, 
      printingTotal: Math.round(printingTotal * 100) / 100, 
      mountingTotal: Math.round(mountingTotal * 100) / 100, 
      totalAmount, 
      gstAmount, 
      grandTotal, 
      effectiveGstPercent,
      durationDays: getDurationDays(),
    };
  };

  // Selection handlers
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.size === campaignAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(campaignAssets.map(a => a.id)));
    }
  };

  // Calculate and update printing cost for a single asset
  const updateAssetPrintingRate = (assetId: string, rate: number) => {
    setCampaignAssets(prev => prev.map(asset => {
      if (asset.id !== assetId) return asset;
      
      const printingResult = calculatePrintingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        rate
      );
      
      return {
        ...asset,
        printing_rate_per_sqft: rate,
        printing_cost: printingResult.cost,
        printing_charges: printingResult.cost, // Keep in sync with legacy field
      };
    }));
  };

  // Calculate and update mounting cost for a single asset
  const updateAssetMountingRate = (assetId: string, rate: number) => {
    setCampaignAssets(prev => prev.map(asset => {
      if (asset.id !== assetId) return asset;
      
      const mountingResult = calculateMountingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        rate
      );
      
      return {
        ...asset,
        mounting_rate_per_sqft: rate,
        mounting_cost: mountingResult.cost,
        mounting_charges: mountingResult.cost, // Keep in sync with legacy field
      };
    }));
  };

  // Bulk apply printing rate
  const applyPrintingRateToSelected = () => {
    if (selectedAssetIds.size === 0) {
      toast({
        title: "No assets selected",
        description: "Select at least 1 asset to apply printing rate",
        variant: "destructive",
      });
      return;
    }
    
    setCampaignAssets(prev => prev.map(asset => {
      if (!selectedAssetIds.has(asset.id)) return asset;
      
      const printingResult = calculatePrintingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        bulkPrintingRate
      );
      
      return {
        ...asset,
        printing_rate_per_sqft: bulkPrintingRate,
        printing_cost: printingResult.cost,
        printing_charges: printingResult.cost,
      };
    }));
    
    toast({
      title: "Printing rate applied",
      description: `Applied ₹${bulkPrintingRate}/sqft to ${selectedAssetIds.size} asset(s)`,
    });
  };

  const applyPrintingRateToAll = () => {
    if (campaignAssets.length === 0) return;
    
    setCampaignAssets(prev => prev.map(asset => {
      const printingResult = calculatePrintingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        bulkPrintingRate
      );
      
      return {
        ...asset,
        printing_rate_per_sqft: bulkPrintingRate,
        printing_cost: printingResult.cost,
        printing_charges: printingResult.cost,
      };
    }));
    
    toast({
      title: "Printing rate applied",
      description: `Applied ₹${bulkPrintingRate}/sqft to ${campaignAssets.length} asset(s)`,
    });
  };

  // Bulk apply mounting rate
  const applyMountingRateToSelected = () => {
    if (selectedAssetIds.size === 0) {
      toast({
        title: "No assets selected",
        description: "Select at least 1 asset to apply mounting rate",
        variant: "destructive",
      });
      return;
    }
    
    setCampaignAssets(prev => prev.map(asset => {
      if (!selectedAssetIds.has(asset.id)) return asset;
      
      const mountingResult = calculateMountingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        bulkMountingRate
      );
      
      return {
        ...asset,
        mounting_rate_per_sqft: bulkMountingRate,
        mounting_cost: mountingResult.cost,
        mounting_charges: mountingResult.cost,
      };
    }));
    
    toast({
      title: "Mounting rate applied",
      description: `Applied ₹${bulkMountingRate}/sqft to ${selectedAssetIds.size} asset(s)`,
    });
  };

  const applyMountingRateToAll = () => {
    if (campaignAssets.length === 0) return;
    
    setCampaignAssets(prev => prev.map(asset => {
      const mountingResult = calculateMountingCost(
        { total_sqft: asset.total_sqft, dimensions: asset.dimensions },
        bulkMountingRate
      );
      
      return {
        ...asset,
        mounting_rate_per_sqft: bulkMountingRate,
        mounting_cost: mountingResult.cost,
        mounting_charges: mountingResult.cost,
      };
    }));
    
    toast({
      title: "Mounting rate applied",
      description: `Applied ₹${bulkMountingRate}/sqft to ${campaignAssets.length} asset(s)`,
    });
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
      const { subtotal, printingTotal, mountingTotal, totalAmount, gstAmount, grandTotal } = calculateTotals();

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
          subtotal: subtotal,
          printing_total: printingTotal,
          mounting_total: mountingTotal,
          total_amount: totalAmount,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          billing_cycle: durationMode === 'DAYS' ? 'DAILY' : 'MONTHLY',
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
        const assetStartDate = asset.start_date 
          ? (typeof asset.start_date === 'string' ? asset.start_date : format(asset.start_date, 'yyyy-MM-dd'))
          : format(startDate!, 'yyyy-MM-dd');
        const assetEndDate = asset.end_date
          ? (typeof asset.end_date === 'string' ? asset.end_date : format(asset.end_date, 'yyyy-MM-dd'))
          : format(endDate!, 'yyyy-MM-dd');
        
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
              booking_start_date: assetStartDate,
              booking_end_date: assetEndDate,
              billing_mode: asset.billing_mode,
              booked_days: asset.booked_days,
              daily_rate: asset.daily_rate,
              rent_amount: asset.rent_amount,
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
              booking_start_date: assetStartDate,
              booking_end_date: assetEndDate,
              billing_mode: asset.billing_mode,
              booked_days: asset.booked_days,
              daily_rate: asset.daily_rate,
              rent_amount: asset.rent_amount,
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

  const { subtotal, printingTotal, mountingTotal, totalAmount, gstAmount, grandTotal, effectiveGstPercent, durationDays } = calculateTotals();
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
                        onSelect={handleStartDateChange}
                        initialFocus
                        className="pointer-events-auto"
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
                        onSelect={handleEndDateChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Editable Duration Controls */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Campaign Duration & Billing</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Billing Mode Dropdown */}
                  <div>
                    <Label>Billing Mode</Label>
                    <Select 
                      value={durationMode} 
                      onValueChange={(value: DurationMode) => handleDurationModeChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTH">Month-wise</SelectItem>
                        <SelectItem value="DAYS">Day-wise (Pro-rata)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Duration Value Input */}
                  <div>
                    <Label>{durationMode === 'MONTH' ? 'Months' : 'Days'}</Label>
                    <Input
                      type="number"
                      min={durationMode === 'MONTH' ? '0.5' : '1'}
                      step={durationMode === 'MONTH' ? '0.5' : '1'}
                      value={durationValue}
                      onChange={(e) => handleDurationValueChange(parseFloat(e.target.value) || 0.5)}
                      className="font-medium"
                    />
                  </div>
                  
                  {/* Duration Summary */}
                  <div>
                    <Label>Duration Summary</Label>
                    <div className="h-10 flex items-center gap-2">
                      <Badge variant="secondary" className="font-semibold">
                        {durationDays} days
                      </Badge>
                      {durationMode === 'DAYS' && durationDays > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Factor: {(durationDays / BILLING_CYCLE_DAYS).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Billing Info */}
                <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
                  {durationMode === 'MONTH' ? (
                    <p>
                      <strong>Month-wise billing:</strong> Negotiated price × {durationValue} {durationValue === 1 ? 'month' : 'months'}
                    </p>
                  ) : (
                    <p>
                      <strong>Day-wise (Pro-rata):</strong> (Negotiated price ÷ 30) × {durationDays} days = Factor {(durationDays / BILLING_CYCLE_DAYS).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Validation Error */}
              {startDate && endDate && durationDays <= 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <span className="text-sm text-destructive">End date must be after start date</span>
                </div>
              )}

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
                <span className="text-muted-foreground">Display Cost (Subtotal)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Printing Charges</span>
                <span className="font-medium">{formatCurrency(printingTotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mounting Charges</span>
                <span className="font-medium">{formatCurrency(mountingTotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm border-t pt-2">
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

              <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                {!isGstApplicable && (
                  <p className="text-amber-600">Client is not GST applicable</p>
                )}
                <p>
                  Duration: {durationDays} days ({durationMode === 'MONTH' ? `${durationValue} month${durationValue !== 1 ? 's' : ''}` : `Factor: ${(durationDays / BILLING_CYCLE_DAYS).toFixed(2)}`})
                </p>
                {durationMode === 'DAYS' && (
                  <p className="text-primary">
                    Pro-rata applied: (Monthly Rate ÷ 30) × {durationDays}
                  </p>
                )}
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
            {/* Bulk Pricing Controls */}
            {campaignAssets.length > 0 && (
              <PrintingPricingBar
                printingRate={bulkPrintingRate}
                mountingRate={bulkMountingRate}
                onPrintingRateChange={setBulkPrintingRate}
                onMountingRateChange={setBulkMountingRate}
                onApplyPrintingToSelected={applyPrintingRateToSelected}
                onApplyPrintingToAll={applyPrintingRateToAll}
                onApplyMountingToSelected={applyMountingRateToSelected}
                onApplyMountingToAll={applyMountingRateToAll}
                selectedCount={selectedAssetIds.size}
                totalCount={campaignAssets.length}
              />
            )}
            
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedAssetIds.size === campaignAssets.length && campaignAssets.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[50px] text-center">S.No</TableHead>
                    <TableHead className="w-[140px]">Asset ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right w-[80px]">Sqft</TableHead>
                    <TableHead className="min-w-[180px]">Duration</TableHead>
                    <TableHead className="text-right">Negotiated</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead className="w-[160px]">Printing (Rate→Cost)</TableHead>
                    <TableHead className="w-[160px]">Mounting (Rate→Cost)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No assets in this campaign. Click "Add Assets" to add media assets.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignAssets.map((asset, index) => (
                      <TableRow key={asset.id} className={cn(asset.isNew && "bg-green-50/50", selectedAssetIds.has(asset.id) && "bg-primary/5")}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAssetIds.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatAssetDisplayCode({
                            mediaAssetCode: asset.media_asset_code,
                            fallbackId: asset.asset_id,
                            companyPrefix: companyPrefix
                          })}
                          {asset.isNew && <span className="ml-1 text-xs text-green-600">(new)</span>}
                        </TableCell>
                        <TableCell className="min-w-[180px] max-w-[250px] text-sm">
                          <div className="break-words whitespace-normal" title={asset.location}>
                            {asset.location}
                          </div>
                          <span className="block text-xs text-muted-foreground">{asset.area}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {asset.total_sqft > 0 ? (
                            <span className="font-medium">{asset.total_sqft}</span>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="text-xs cursor-help">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    N/A
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Area missing - cannot calculate printing cost</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell>
                          <CampaignAssetDurationCell
                            startDate={asset.start_date}
                            endDate={asset.end_date}
                            billingMode={asset.billing_mode}
                            monthlyRate={asset.negotiated_rate || asset.card_rate}
                            campaignStartDate={startDate}
                            campaignEndDate={endDate}
                            onChange={(updates) => handleAssetDurationChange(index, updates)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={asset.negotiated_rate}
                            onChange={(e) => updateCampaignAsset(index, 'negotiated_rate', Number(e.target.value))}
                            className="h-8 w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(asset.rent_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={asset.printing_rate_per_sqft || ''}
                              onChange={(e) => updateAssetPrintingRate(asset.id, Number(e.target.value))}
                              className="h-8 w-16 text-right text-xs"
                              placeholder="₹/sqft"
                              step="0.5"
                            />
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-green-600 min-w-[60px] text-right">
                              {formatCurrency(asset.printing_charges || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={asset.mounting_rate_per_sqft || ''}
                              onChange={(e) => updateAssetMountingRate(asset.id, Number(e.target.value))}
                              className="h-8 w-16 text-right text-xs"
                              placeholder="₹/sqft"
                              step="0.5"
                            />
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-green-600 min-w-[60px] text-right">
                              {formatCurrency(asset.mounting_charges || 0)}
                            </span>
                          </div>
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

      {/* Apply Dates to Assets Dialog */}
      {pendingDatesUpdate && (
        <ApplyDatesToAssetsDialog
          open={showApplyDatesDialog}
          onClose={() => {
            setShowApplyDatesDialog(false);
            setPendingDatesUpdate(null);
          }}
          onApply={applyDatesToAllAssets}
          onSkip={skipApplyDatesToAssets}
          startDate={pendingDatesUpdate.start}
          endDate={pendingDatesUpdate.end}
          assetCount={campaignAssets.length}
        />
      )}
    </div>
  );
}
