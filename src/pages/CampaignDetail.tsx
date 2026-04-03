import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { ActionGuard } from "@/components/rbac/ActionGuard";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignResolver, getCampaignDisplayCode } from "@/hooks/useCampaignResolver";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Trash2, RefreshCw, Info, Pencil, TrendingUp, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { generateProposalExcel, type ProposalAsset } from "@/lib/exports/proposalExcelExport";
import { formatCurrency } from "@/utils/mediaAssets";
import { getCampaignStatusColor, calculateProgress } from "@/utils/campaigns";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperationsBoard } from "@/components/campaigns/OperationsBoard";
import { ProofGallery } from "@/components/campaigns/ProofGallery";
import { CampaignPerformanceChart } from "@/components/charts/CampaignPerformanceChart";
import { ExportProofDialog } from "@/components/campaigns/ExportProofDialog";
import { CampaignTimelineCard } from "@/components/campaigns/CampaignTimelineCard";
import { CampaignPerformanceMetrics } from "@/components/campaigns/CampaignPerformanceMetrics";
import { CampaignPDFReport } from "@/components/campaigns/CampaignPDFReport";
import { CampaignComparisonDialog } from "@/components/campaigns/CampaignComparisonDialog";
import { CampaignHealthAlerts } from "@/components/campaigns/CampaignHealthAlerts";

import { checkAndAutoGeneratePPT } from "@/lib/operations/autoGenerateProofPPT";
import { normalizeCampaignAssetStatus } from "@/lib/constants/campaignAssetStatus";
import { computeCampaignAssetCounts, getActiveAssets } from "@/lib/availability/campaignAssetHelpers";
import { CreativeUploadSection } from "@/components/campaigns/CreativeUploadSection";
import { useCampaignWorkflows } from "@/hooks/useCampaignWorkflows";
import { AutoAssignMountersButton } from "@/components/campaigns/AutoAssignMountersButton";
import { ShareTrackingLinkDialog } from "@/components/campaigns/ShareTrackingLinkDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { CampaignTimelineView } from "@/components/campaigns/CampaignTimelineView";
import { DeleteCampaignDialog } from "@/components/campaigns/DeleteCampaignDialog";
import { CampaignBillingTab } from "@/components/campaigns/billing";
import { CampaignDetailAssetsTable } from "@/components/campaigns/CampaignDetailAssetsTable";
import { computeCampaignTotals } from "@/utils/computeCampaignTotals";
import { useCampaignProfitability } from "@/hooks/useCampaignProfitability";
import { CampaignProfitSummary } from "@/components/campaigns/CampaignProfitSummary";
import { CampaignSignedROUpload } from "@/components/campaigns/CampaignSignedROUpload";
import { useRecordPermissions } from "@/hooks/useRecordAccessMode";
import { RestrictedBanner } from "@/components/rbac/RestrictedBanner";
import { CampaignRenewalChain } from "@/components/campaigns/CampaignRenewalChain";

export default function CampaignDetail() {
  const { id: routeParam } = useParams();
  const navigate = useNavigate();
  const { resolvedId, loading: resolving } = useCampaignResolver(routeParam);
  const id = resolvedId;
  const [campaign, setCampaign] = useState<any>(null);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetCodePrefix, setAssetCodePrefix] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportingProposalExcel, setExportingProposalExcel] = useState(false);
  const [signedRoData, setSignedRoData] = useState<{ planId: string; url: string | null; uploadedAt: string | null } | null>(null);
  const { company } = useCompany();
  const { setBreadcrumbs } = useBreadcrumb();
  const { data: profitability, isLoading: profitLoading } = useCampaignProfitability(id, company?.id, 0);
  
  // Enterprise RBAC access mode
  const perms = useRecordPermissions(campaign, 'campaigns');
  const canEditThisCampaign = perms.canEditRecord;
  const isAdmin = canEditThisCampaign; // Legacy alias - true for admin/owner/secondary owner

  // Enable automated workflows
  useCampaignWorkflows(id);

  // Set custom breadcrumbs with campaign code instead of UUID
  useEffect(() => {
    if (campaign) {
      const displayCode = getCampaignDisplayCode(campaign);
      setBreadcrumbs([
        { title: 'Home', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Campaigns', href: '/admin/campaigns' },
        { title: displayCode },
      ]);
    }
    return () => setBreadcrumbs(null);
  }, [campaign]);

  const refreshData = () => {
    fetchCampaign();
    fetchCampaignAssets();
  };

  useEffect(() => {
    if (!id || resolving) return;
    refreshData();
  }, [id, resolving]);

  const fetchCampaign = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch campaign",
        variant: "destructive",
      });
      navigate('/admin/campaigns');
    } else {
      setCampaign(data);
      
      // Fetch signed RO from linked plan
      if (data?.plan_id) {
        const { data: planData } = await supabase
          .from('plans')
          .select('id, signed_ro_url, signed_ro_uploaded_at')
          .eq('id', data.plan_id)
          .maybeSingle();
        if (planData) {
          setSignedRoData({
            planId: planData.id,
            url: planData.signed_ro_url,
            uploadedAt: planData.signed_ro_uploaded_at,
          });
        }
      }
      
      // Fetch company code settings for asset display
      if (data?.company_id) {
        const { data: codeSettings } = await supabase
          .from('company_code_settings')
          .select('asset_code_prefix, use_custom_asset_codes')
          .eq('company_id', data.company_id)
          .maybeSingle();
        
        if (codeSettings?.use_custom_asset_codes && codeSettings?.asset_code_prefix) {
          setAssetCodePrefix(codeSettings.asset_code_prefix);
        }
      }
    }
    setLoading(false);
  };

  const fetchCampaignAssets = async () => {
    const { data: assets } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at');
    
    // Fetch media asset details and photo counts
    if (assets && assets.length > 0) {
      const assetIds = assets.map(a => a.asset_id);
      
      // Fetch media assets and photo counts in parallel
      const [mediaAssetsResult, photoCountsResult] = await Promise.all([
        supabase
          .from('media_assets')
          .select('id, total_sqft, media_asset_code, direction, illumination_type, dimensions')
          .in('id', assetIds),
        supabase
          .from('media_photos')
          .select('asset_id')
          .eq('campaign_id', id)
          .in('asset_id', assetIds),
      ]);
      
      const mediaAssetsMap = (mediaAssetsResult.data || []).reduce((acc, ma) => {
        acc[ma.id] = ma;
        return acc;
      }, {} as Record<string, any>);
      
      // Count photos per asset
      const photoCountMap: Record<string, number> = {};
      (photoCountsResult.data || []).forEach(p => {
        photoCountMap[p.asset_id] = (photoCountMap[p.asset_id] || 0) + 1;
      });
      
      // Merge media asset data with campaign assets
      const enrichedAssets = assets.map(a => ({
        ...a,
        total_sqft: mediaAssetsMap[a.asset_id]?.total_sqft || 0,
        media_asset_code: mediaAssetsMap[a.asset_id]?.media_asset_code || null,
        photo_count: photoCountMap[a.asset_id] || 0,
      }));
      
      setCampaignAssets(enrichedAssets);
    } else {
      setCampaignAssets(assets || []);
    }
  };

  // Check if campaign is already deleted
  const isDeleted = campaign?.is_deleted === true;

  const openDeleteDialog = () => setShowDeleteDialog(true);

  const handleAutoComplete = async () => {
    const today = new Date();
    const endDate = new Date(campaign.end_date);
    
    if (endDate >= today) {
      toast({
        title: "Cannot Auto-Complete",
        description: "Campaign end date must be in the past",
        variant: "destructive",
      });
      return;
    }

    if (campaign.status === 'Completed') {
      toast({
        title: "Already Completed",
        description: "This campaign is already marked as completed",
      });
      return;
    }

    if (!confirm(`Auto-complete campaign "${campaign.campaign_name}"? This will mark it as Completed.`)) return;

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'Completed' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to auto-complete campaign",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign marked as completed",
      });
      refreshData();
    }
  };

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Calculate status counts from campaign_assets using centralized helpers
  const assetCounts = computeCampaignAssetCounts(campaignAssets);
  const activeAssets = getActiveAssets(campaignAssets);
  const totalAssets = assetCounts.active; // Progress based on active assets only
  const pendingAssets = assetCounts.pending;
  const installedAssets = assetCounts.installed;
  const verifiedAssets = assetCounts.verified;
  const droppedAssetCount = assetCounts.dropped;
  const progress = calculateProgress(totalAssets, verifiedAssets);

  // Use Single Source of Truth calculator for all financial data
  const totals = computeCampaignTotals({
    campaign: {
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      gst_percent: campaign.gst_percent,
      billing_cycle: campaign.billing_cycle,
      manual_discount_amount: campaign.manual_discount_amount,
      manual_discount_reason: campaign.manual_discount_reason,
    },
    campaignAssets,
  });
  
  // Duration info from calculator
  const durationDays = totals.durationDays;
  const durationMonths = Math.round(durationDays / 30);
  
  // Use calculator values for display
  const roundedDisplayCost = totals.displayCost;
  const printingTotal = totals.printingCost;
  const mountingTotal = totals.mountingCost;
  const manualDiscount = totals.manualDiscountAmount;

  const handleExportProposalExcel = async () => {
    if (!campaign || activeAssets.length === 0) {
      toast({ title: "No Assets", description: "No active assets to export.", variant: "destructive" });
      return;
    }
    setExportingProposalExcel(true);
    try {
      const assetPricing: Record<string, any> = {};
      const proposalAssets: ProposalAsset[] = activeAssets.map((a: any) => {
        assetPricing[a.asset_id] = {
          negotiated_price: a.negotiated_rate || a.card_rate,
          start_date: a.booking_start_date || a.start_date || campaign.start_date,
          end_date: a.booking_end_date || a.end_date || campaign.end_date,
          booked_days: a.booked_days || 30,
          printing_charges: a.printing_charges || 0,
          printing_cost: a.printing_charges || 0,
          mounting_charges: a.mounting_charges || 0,
          mounting_cost: a.mounting_charges || 0,
          mounting_mode: 'fixed',
        };
        return {
          id: a.asset_id,
          location: a.location,
          direction: a.direction,
          dimensions: a.dimensions,
          total_sqft: a.total_sqft,
          illumination_type: a.illumination_type,
          card_rate: a.card_rate,
        };
      });

      const durationDays = campaign.start_date && campaign.end_date
        ? Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 30;

      const blob = await generateProposalExcel({
        planId: campaign.id,
        planName: campaign.campaign_name || 'Campaign',
        clientName: campaign.client_name || '',
        assets: proposalAssets,
        assetPricing,
        planStartDate: new Date(campaign.start_date),
        planEndDate: new Date(campaign.end_date),
        durationDays,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Campaign_Proposal_${campaign.campaign_name || campaign.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Export Successful", description: "Campaign proposal Excel downloaded." });
    } catch (error: any) {
      console.error('Campaign Proposal Excel export error:', error);
      toast({ title: "Export Failed", description: error.message || "Failed to export.", variant: "destructive" });
    } finally {
      setExportingProposalExcel(false);
    }
  };

  return (
    <ModuleGuard module="campaigns">
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/campaigns')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        {/* Restricted Mode Banner */}
        {perms.isReadOnly && <RestrictedBanner module="campaign" />}

        {/* Deleted Campaign Banner */}
        {isDeleted && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Archived Campaign</AlertTitle>
            <AlertDescription>
              This campaign was deleted on {campaign.deleted_at ? formatDate(campaign.deleted_at) : 'Unknown date'}.
              <br />
              <strong>Reason:</strong> {campaign.deletion_reason || 'No reason provided'}
            </AlertDescription>
          </Alert>
        )}

        {/* Header Card with Border */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold mb-3">{campaign.campaign_name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={getCampaignStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{getCampaignDisplayCode(campaign)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canEditThisCampaign && company && (
                  <ActionGuard module="campaigns" action="assign" record={campaign}>
                    <AutoAssignMountersButton
                      campaignId={campaign.id}
                      companyId={company.id}
                      currentUserId={campaign.created_by}
                      onSuccess={refreshData}
                    />
                    <ShareTrackingLinkDialog
                      campaignId={campaign.id}
                      publicToken={campaign.public_tracking_token}
                      isEnabled={campaign.public_share_enabled}
                      onUpdate={refreshData}
                    />
                  </ActionGuard>
                )}
                <CampaignPDFReport campaign={campaign} campaignAssets={activeAssets} />
                <Button variant="outline" size="sm" onClick={handleExportProposalExcel} disabled={exportingProposalExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {exportingProposalExcel ? "Generating..." : "Proposal Excel"}
                </Button>
                <CampaignComparisonDialog currentCampaignId={campaign.id} />
                <ExportProofDialog
                  campaignId={campaign.id}
                  campaignName={campaign.campaign_name}
                  assets={activeAssets}
                />
                <Button variant="outline" size="sm" onClick={refreshData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/campaigns/${id}/budget`)}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Budget Tracker
                </Button>
                <ActionGuard module="campaigns" action="edit" record={campaign}>
                {!isDeleted && (
                  <>
                    {campaign.status !== 'Completed' && new Date(campaign.end_date) < new Date() && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAutoComplete}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Auto-Complete
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/campaigns/edit/${campaign.id}`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </>
                )}
                </ActionGuard>
                <ActionGuard module="campaigns" action="delete" record={campaign}>
                {!isDeleted && (
                    <Button variant="destructive" size="sm" onClick={openDeleteDialog}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                )}
                </ActionGuard>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Performance Chart */}
        <div className="mb-6">
          <CampaignPerformanceChart campaignId={campaign.id} />
        </div>

        {/* Installation Progress - Segmented Bar */}
        <Card className="mb-6 border">
          <CardContent className="pt-6">
            {/* Active / Dropped / Total summary strip */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <Badge variant="outline" className="text-sm py-1 px-3 bg-green-50 text-green-700 border-green-300">
                Active: {assetCounts.active}
              </Badge>
              {droppedAssetCount > 0 && (
                <Badge variant="outline" className="text-sm py-1 px-3 bg-orange-50 text-orange-700 border-orange-300">
                  Dropped: {droppedAssetCount}
                </Badge>
              )}
              <Badge variant="outline" className="text-sm py-1 px-3">
                Total Records: {assetCounts.total}
              </Badge>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">Installation Progress (Active Assets)</span>
              <span className="text-sm text-muted-foreground">
                {totalAssets} Active Assets
              </span>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="relative h-8 bg-muted rounded-lg overflow-hidden flex">
              {totalAssets > 0 ? (
                <>
                  {/* Verified Segment (Green) */}
                  {verifiedAssets > 0 && (
                    <div 
                      className="h-full bg-green-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                      style={{ width: `${(verifiedAssets / totalAssets) * 100}%` }}
                    >
                      {verifiedAssets > 0 && `${verifiedAssets}`}
                    </div>
                  )}
                  {/* Installed Segment (Blue) */}
                  {installedAssets > 0 && (
                    <div 
                      className="h-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                      style={{ width: `${(installedAssets / totalAssets) * 100}%` }}
                    >
                      {installedAssets > 0 && `${installedAssets}`}
                    </div>
                  )}
                  {/* Pending Segment (Amber) */}
                  {pendingAssets > 0 && (
                    <div 
                      className="h-full bg-amber-400 flex items-center justify-center text-amber-900 text-xs font-medium transition-all duration-500"
                      style={{ width: `${(pendingAssets / totalAssets) * 100}%` }}
                    >
                      {pendingAssets > 0 && `${pendingAssets}`}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                  No assets in campaign
                </div>
              )}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span>Pending ({pendingAssets})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Installed ({installedAssets})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Verified ({verifiedAssets})</span>
              </div>
            </div>
            
            {/* Completion Percentage */}
            {totalAssets > 0 && (
              <div className="mt-3 text-center">
                <span className="text-lg font-bold text-green-600">
                  {Math.round((verifiedAssets / totalAssets) * 100)}%
                </span>
                <span className="text-sm text-muted-foreground ml-2">Complete</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Client Info - Blue */}
          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-600 dark:text-blue-400">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Display Name</p>
                  <p className="text-sm font-medium">{campaign.campaign_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client Name</p>
                  <p className="text-sm font-medium">{campaign.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client ID</p>
                  <p className="text-sm font-medium">{campaign.client_id}</p>
                </div>
                {campaign.client_po_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Client PO / WO No.</p>
                    <p className="text-sm font-medium">
                      {campaign.client_po_number}
                      {campaign.client_po_date && (
                        <span className="text-muted-foreground ml-2 text-xs">({formatDate(campaign.client_po_date)})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period - Green */}
          <Card className="border-l-4 border-l-green-500 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-green-600 dark:text-green-400">Campaign Period</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm font-medium">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{durationDays} days ({durationMonths} {durationMonths === 1 ? 'month' : 'months'})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary - Hidden for non-owners */}
          {perms.canViewFinancials && (
          <Card className="border-l-4 border-l-orange-500 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-orange-600 dark:text-orange-400">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground font-medium">Display Cost</span>
                    </div>
                    <span className="font-medium">{formatCurrency(roundedDisplayCost)}</span>
                  </div>
                  {printingTotal > 0 && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Printing Cost</span>
                      <span>{formatCurrency(printingTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Mounting Cost</span>
                    <span>{formatCurrency(mountingTotal)}</span>
                  </div>
                  {manualDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400 items-center">
                      <span className="font-medium">Discount</span>
                      <span className="font-medium">- {formatCurrency(manualDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold">Taxable Amount</span>
                    <span className="font-semibold">{formatCurrency(totals.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">GST ({totals.gstRate}%)</span>
                    <span>{formatCurrency(totals.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-border items-center">
                    <span className="text-base font-bold">Grand Total</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Profitability Summary - Hidden for non-owners */}
        {perms.canViewFinancials && (
        <div className="mb-6">
          {profitability && (
            <CampaignProfitSummary
              profitability={{ ...profitability, bookingRevenue: totals.grandTotal, revenue: profitability.invoiceRevenue > 0 ? profitability.revenue : totals.grandTotal }}
              companyId={company?.id}
              isLoading={profitLoading}
            />
          )}
        </div>
        )}
        {/* Signed Release Order - with upload from campaign */}
        <div className="mb-6">
          <CampaignSignedROUpload
            campaignId={campaign.id}
            planId={signedRoData?.planId || campaign.plan_id || null}
            planSignedRoUrl={signedRoData?.url || null}
            planSignedRoUploadedAt={signedRoData?.uploadedAt || null}
            campaignSignedRoUrl={campaign.signed_ro_url || null}
            campaignSignedRoUploadedAt={campaign.signed_ro_uploaded_at || null}
            onUploadComplete={refreshData}
            onViewPlan={signedRoData?.planId ? () => navigate(`/admin/plans/${signedRoData.planId}`) : undefined}
            canEdit={canEditThisCampaign}
          />
        </div>

        {/* Health Alerts */}
        <div className="mb-6">
          <CampaignHealthAlerts campaignId={campaign.id} />
        </div>

        {/* Renewal Chain / Campaign Series */}
        <CampaignRenewalChain
          campaignId={campaign.id}
          campaignGroupId={campaign.campaign_group_id}
          parentCampaignId={campaign.parent_campaign_id}
          createdFrom={campaign.created_from}
        />

        {/* Timeline and Performance - Enhanced with borders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-1 bg-card/50">
            <CampaignTimelineCard campaign={campaign} campaignAssets={activeAssets} />
          </div>
          <div className="border rounded-lg p-1 bg-card/50">
            <CampaignPerformanceMetrics campaign={campaign} campaignAssets={activeAssets} />
          </div>
        </div>

        {/* Tabs - Enhanced with border */}
        <Card className="border-2">
          <Tabs defaultValue="assets" className="p-4">
            <TabsList className={`grid w-full max-w-4xl ${perms.canViewFinancials ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="assets">
                Assets ({assetCounts.active})
                {droppedAssetCount > 0 && (
                  <span className="ml-1 text-xs text-orange-600">+{droppedAssetCount} dropped</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="creatives">Creatives</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="proof">Proof Gallery</TabsTrigger>
              {perms.canViewFinancials && (
                <TabsTrigger value="billing">Billing & Invoices</TabsTrigger>
              )}
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <CampaignDetailAssetsTable
                    assets={activeAssets}
                    campaignId={campaign.id}
                    companyPrefix={assetCodePrefix}
                    companyName={company?.name}
                    onRefresh={refreshData}
                    readOnly={!canEditThisCampaign}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creatives" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <CreativeUploadSection campaignId={campaign.id} onUploadComplete={refreshData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <OperationsBoard
                    campaignId={campaign.id}
                    assets={activeAssets}
                    onUpdate={refreshData}
                    assetCodePrefix={assetCodePrefix}
                    companyName={company?.name}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proof" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6">
                  <ProofGallery assets={activeAssets} onUpdate={refreshData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-4">
              <CampaignBillingTab
                campaign={{
                  id: campaign.id,
                  campaign_name: campaign.campaign_name,
                  client_id: campaign.client_id,
                  client_name: campaign.client_name,
                  start_date: campaign.start_date,
                  end_date: campaign.end_date,
                  total_amount: campaign.total_amount,
                  gst_amount: campaign.gst_amount,
                  gst_percent: campaign.gst_percent,
                  printing_total: printingTotal,
                  mounting_total: mountingTotal,
                  subtotal: campaign.subtotal,
                  billing_cycle: campaign.billing_cycle,
                  company_id: campaign.company_id,
                  manual_discount_amount: campaign.manual_discount_amount,
                  manual_discount_reason: campaign.manual_discount_reason,
                }}
                campaignAssets={activeAssets}
                displayCost={roundedDisplayCost}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <CampaignTimelineView campaignId={campaign.id} />
            </TabsContent>
          </Tabs>
        </Card>

        {campaign.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Delete Campaign Dialog */}
        <DeleteCampaignDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          campaignId={campaign.id}
          campaignName={campaign.campaign_name}
          onDeleted={() => navigate('/admin/campaigns')}
        />
      </div>
    </div>
    </ModuleGuard>
  );
}
