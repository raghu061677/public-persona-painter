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
import { ArrowLeft, Trash2, Upload, RefreshCw, Info } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getCampaignStatusColor, getAssetStatusColor, calculateProgress } from "@/utils/campaigns";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OperationsBoard } from "@/components/campaigns/OperationsBoard";
import { ProofGallery } from "@/components/campaigns/ProofGallery";
import { ExportProofDialog } from "@/components/campaigns/ExportProofDialog";
import { CampaignTimelineCard } from "@/components/campaigns/CampaignTimelineCard";
import { CampaignPerformanceMetrics } from "@/components/campaigns/CampaignPerformanceMetrics";
import { CampaignPDFReport } from "@/components/campaigns/CampaignPDFReport";
import { CampaignComparisonDialog } from "@/components/campaigns/CampaignComparisonDialog";
import { CampaignHealthAlerts } from "@/components/campaigns/CampaignHealthAlerts";
import { GenerateInvoiceDialog } from "@/components/campaigns/GenerateInvoiceDialog";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
    }
    setLoading(false);
  };

  const fetchCampaignAssets = async () => {
    const { data: assets } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at');
    
    // Fetch media asset details to get total_sqft for printing calculations
    if (assets && assets.length > 0) {
      const assetIds = assets.map(a => a.asset_id);
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('id, total_sqft')
        .in('id', assetIds);
      
      const mediaAssetsMap = (mediaAssets || []).reduce((acc, ma) => {
        acc[ma.id] = ma;
        return acc;
      }, {} as Record<string, any>);
      
      // Merge media asset data with campaign assets
      const enrichedAssets = assets.map(a => ({
        ...a,
        total_sqft: mediaAssetsMap[a.asset_id]?.total_sqft || 0
      }));
      
      setCampaignAssets(enrichedAssets);
    } else {
      setCampaignAssets(assets || []);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      navigate('/admin/campaigns');
    }
  };

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const verifiedAssets = campaignAssets.filter(a => a.status === 'Verified').length;
  const progress = calculateProgress(campaign.total_assets, verifiedAssets);

  // Calculate campaign duration
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  const durationMonths = Math.round(durationDays / 30);

  // Calculate detailed financials with pro-rata
  const pricePerSqft = 15; // ₹15 per sqft for printing
  const mountingCostPerAsset = 1500; // ₹1500 per asset
  
  // Display cost (pro-rated based on campaign duration)
  const displayCost = campaignAssets.reduce((sum, a) => {
    const monthlyRate = a.card_rate || 0;
    const proRatedCost = (monthlyRate / 30) * durationDays;
    return sum + proRatedCost;
  }, 0);
  
  // Printing cost based on total sqft
  const printingTotal = campaignAssets.reduce((sum, a) => {
    const sqft = a.total_sqft || 0;
    return sum + (sqft * pricePerSqft);
  }, 0);
  
  // Mounting cost - ₹1500 per asset
  const mountingTotal = campaignAssets.length * mountingCostPerAsset;
  
  const subtotal = displayCost + printingTotal + mountingTotal;
  const discount = subtotal > campaign.total_amount ? subtotal - campaign.total_amount : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/campaigns')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{campaign.campaign_name}</h1>
            <div className="flex items-center gap-3">
              <Badge className={getCampaignStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
              <span className="text-muted-foreground">{campaign.id}</span>
            </div>
          </div>
          <div className="flex gap-2">
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
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Campaign Progress</span>
              <span className="text-sm text-muted-foreground">
                {verifiedAssets} / {campaign.total_assets} assets verified
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Client Info - Blue */}
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-blue-600 dark:text-blue-400">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Display Name</p>
                  <p className="font-medium">{campaign.campaign_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">{campaign.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client ID</p>
                  <p className="font-medium">{campaign.client_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period - Green */}
          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">Campaign Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{durationDays} days ({durationMonths} {durationMonths === 1 ? 'month' : 'months'})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary - Orange */}
          <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-orange-600 dark:text-orange-400">Financial Summary</CardTitle>
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

        {/* Timeline and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CampaignTimelineCard campaign={campaign} campaignAssets={campaignAssets} />
          <CampaignPerformanceMetrics campaign={campaign} campaignAssets={campaignAssets} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Assets ({campaignAssets.length})</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="proof">Proof Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <Card>
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
                        <TableCell className="font-medium">{asset.asset_id}</TableCell>
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

          <TabsContent value="operations">
            <Card>
              <CardContent className="pt-6">
                <OperationsBoard
                  campaignId={campaign.id}
                  assets={campaignAssets}
                  onUpdate={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proof">
            <Card>
              <CardContent className="pt-6">
                <ProofGallery assets={campaignAssets} onUpdate={refreshData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
      </div>
    </div>
  );
}
