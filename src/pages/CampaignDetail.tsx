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
import { ArrowLeft, Trash2, Upload, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getCampaignStatusColor, getAssetStatusColor, calculateProgress } from "@/utils/campaigns";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { OperationsBoard } from "@/components/campaigns/OperationsBoard";
import { ProofGallery } from "@/components/campaigns/ProofGallery";
import { ExportProofDialog } from "@/components/campaigns/ExportProofDialog";

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
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
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
    const { data } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at');
    setCampaignAssets(data || []);
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
              <CardTitle className="text-blue-600 dark:text-blue-400">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary - Orange */}
          <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-orange-600 dark:text-orange-400">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(campaign.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">GST ({campaign.gst_percent}%)</span>
                  <span className="font-medium">{formatCurrency(campaign.gst_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-semibold text-lg">{formatCurrency(campaign.grand_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
