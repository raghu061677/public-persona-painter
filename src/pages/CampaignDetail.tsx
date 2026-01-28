import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Trash2, Upload, RefreshCw, Info, Pencil, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getCampaignStatusColor, getAssetStatusColor, calculateProgress } from "@/utils/campaigns";
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
import { GenerateInvoiceDialog } from "@/components/campaigns/GenerateInvoiceDialog";
import { checkAndAutoGeneratePPT } from "@/lib/operations/autoGenerateProofPPT";
import { CreativeUploadSection } from "@/components/campaigns/CreativeUploadSection";
import { useCampaignWorkflows } from "@/hooks/useCampaignWorkflows";
import { AutoAssignMountersButton } from "@/components/campaigns/AutoAssignMountersButton";
import { ShareTrackingLinkDialog } from "@/components/campaigns/ShareTrackingLinkDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { CampaignTimelineView } from "@/components/campaigns/CampaignTimelineView";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { DeleteCampaignDialog } from "@/components/campaigns/DeleteCampaignDialog";
import { CampaignBillingTab } from "@/components/campaigns/billing";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assetCodePrefix, setAssetCodePrefix] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { company } = useCompany();

  // Enable automated workflows
  useCampaignWorkflows(id);

  const refreshData = () => {
    fetchCampaign();
    fetchCampaignAssets();
  };

  useEffect(() => {
    checkAdminStatus();
    refreshData();
  }, [id]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      setIsAdmin(data?.some(r => r.role === 'admin') || false);
    }
  };

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
    
    // Fetch media asset details to get total_sqft and media_asset_code
    if (assets && assets.length > 0) {
      const assetIds = assets.map(a => a.asset_id);
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('id, total_sqft, media_asset_code')
        .in('id', assetIds);
      
      const mediaAssetsMap = (mediaAssets || []).reduce((acc, ma) => {
        acc[ma.id] = ma;
        return acc;
      }, {} as Record<string, any>);
      
      // Merge media asset data with campaign assets
      const enrichedAssets = assets.map(a => ({
        ...a,
        total_sqft: mediaAssetsMap[a.asset_id]?.total_sqft || 0,
        media_asset_code: mediaAssetsMap[a.asset_id]?.media_asset_code || a.asset_id
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

  // Calculate status counts from campaign_assets (single source of truth)
  const pendingAssets = campaignAssets.filter(a => 
    a.status === 'Pending' || a.status === 'Assigned' || !a.status
  ).length;
  const installedAssets = campaignAssets.filter(a => 
    a.status === 'Installed' || 
    a.status === 'Mounted' ||
    a.installation_status === 'Installed' || 
    a.installation_status === 'Completed'
  ).length;
  const verifiedAssets = campaignAssets.filter(a => 
    a.status === 'Verified' || a.status === 'Completed'
  ).length;
  const totalAssets = campaignAssets.length || campaign.total_assets || 0;
  const progress = calculateProgress(totalAssets, verifiedAssets);

  // Calculate campaign duration
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const durationMonths = Math.round(durationDays / 30);

  // Use campaign_assets pricing which is locked from Plan
  // Display cost from negotiated_rate (final price)
  const displayCost = campaignAssets.reduce((sum, a) => {
    return sum + (a.negotiated_rate || a.card_rate || 0);
  }, 0);
  
  // Printing and mounting from campaign_assets
  const printingTotal = campaignAssets.reduce((sum, a) => {
    return sum + (a.printing_charges || 0);
  }, 0);
  
  const mountingTotal = campaignAssets.reduce((sum, a) => {
    return sum + (a.mounting_charges || 0);
  }, 0);
  
  const subtotal = displayCost + printingTotal + mountingTotal;
  const discount = subtotal > campaign.total_amount ? subtotal - campaign.total_amount : 0;

  return (
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
                  <span className="text-sm text-muted-foreground">{campaign.id}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isAdmin && company && (
                  <>
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
                  </>
                )}
                <GenerateInvoiceDialog 
                  campaign={campaign} 
                  campaignAssets={campaignAssets}
                  displayCost={displayCost}
                  printingTotal={printingTotal}
                  mountingTotal={mountingTotal}
                  discount={discount}
                />
                <CampaignPDFReport campaign={campaign} campaignAssets={campaignAssets} />
                <CampaignComparisonDialog currentCampaignId={campaign.id} />
                <ExportProofDialog
                  campaignId={campaign.id}
                  campaignName={campaign.campaign_name}
                  assets={campaignAssets}
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
                {isAdmin && !isDeleted && (
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
                    <Button variant="destructive" size="sm" onClick={openDeleteDialog}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
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
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">Installation Progress</span>
              <span className="text-sm text-muted-foreground">
                {totalAssets} Total Assets
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

          {/* Financial Summary - Orange */}
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
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Pro-rata Calculation:</p>
                          <p className="text-xs">
                            For each asset: (Card Rate ÷ 30 days) × {durationDays} days
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            Campaign: {formatDate(campaign.start_date)} to {formatDate(campaign.end_date)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="font-medium">{formatCurrency(displayCost)}</span>
                  </div>
                  
                  {printingTotal > 0 && (
                    <div className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Printing Cost</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Printing Cost Breakdown:</p>
                            <p className="text-xs">
                              ₹15 per sqft × Total sqft of all assets
                            </p>
                            <p className="text-xs mt-1 text-muted-foreground">
                              {campaignAssets.length} assets with combined {campaignAssets.reduce((sum, a) => sum + (a.total_sqft || 0), 0).toFixed(0)} sqft
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span>{formatCurrency(printingTotal)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Mounting Cost</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Mounting Cost Breakdown:</p>
                          <p className="text-xs">
                            ₹1,500 per asset × {campaignAssets.length} assets
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span>{formatCurrency(mountingTotal)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400 items-center">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Discount</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Discount Applied:</p>
                            <p className="text-xs">
                              Subtotal - Campaign Total Amount
                            </p>
                            <p className="text-xs mt-1 text-muted-foreground">
                              {formatCurrency(subtotal)} - {formatCurrency(campaign.total_amount)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-medium">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold">Taxable Amount</span>
                    <span className="font-semibold">{formatCurrency(campaign.total_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">GST ({campaign.gst_percent}%)</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">GST Calculation:</p>
                          <p className="text-xs">
                            Taxable Amount × {campaign.gst_percent}%
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            {formatCurrency(campaign.total_amount)} × {campaign.gst_percent}% = {formatCurrency(campaign.gst_amount)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span>{formatCurrency(campaign.gst_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between pt-3 border-t-2 border-border items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold">Grand Total</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Grand Total:</p>
                          <p className="text-xs">
                            Taxable Amount + GST
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            {formatCurrency(campaign.total_amount)} + {formatCurrency(campaign.gst_amount)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(campaign.grand_total)}</span>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {/* Health Alerts */}
        <div className="mb-6">
          <CampaignHealthAlerts campaignId={campaign.id} />
        </div>

        {/* Timeline and Performance - Enhanced with borders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-1 bg-card/50">
            <CampaignTimelineCard campaign={campaign} campaignAssets={campaignAssets} />
          </div>
          <div className="border rounded-lg p-1 bg-card/50">
            <CampaignPerformanceMetrics campaign={campaign} campaignAssets={campaignAssets} />
          </div>
        </div>

        {/* Tabs - Enhanced with border */}
        <Card className="border-2">
          <Tabs defaultValue="assets" className="p-4">
            <TabsList className="grid grid-cols-6 w-full max-w-4xl">
              <TabsTrigger value="assets">Assets ({campaignAssets.length})</TabsTrigger>
              <TabsTrigger value="creatives">Creatives</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="proof">Proof Gallery</TabsTrigger>
              <TabsTrigger value="billing">Billing & Invoices</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mounter</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium font-mono text-sm">{formatAssetDisplayCode({ mediaAssetCode: asset.media_asset_code, fallbackId: asset.asset_id, companyPrefix: assetCodePrefix, companyName: company?.name })}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{asset.city}</TableCell>
                        <TableCell>
                          <Badge className={getAssetStatusColor(asset.status)}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.mounter_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/mobile/upload/${id}/${asset.id}`)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    assets={campaignAssets}
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
                  <ProofGallery assets={campaignAssets} onUpdate={refreshData} />
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
                }}
                campaignAssets={campaignAssets}
                displayCost={displayCost}
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
  );
}
