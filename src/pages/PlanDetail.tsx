import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Share2, Trash2, Copy, Rocket, MoreVertical, Ban, Activity, ExternalLink, Download, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/mediaAssets";
import { getPlanStatusColor, formatDate } from "@/utils/plans";
import { generateCampaignId } from "@/utils/campaigns";
import { toast } from "@/hooks/use-toast";

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [campaignData, setCampaignData] = useState({
    campaign_name: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    checkAdminStatus();
    fetchPlan();
    fetchPlanItems();
  }, [id]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchPlan = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch plan",
        variant: "destructive",
      });
      navigate('/admin/plans');
    } else {
      setPlan(data);
    }
    setLoading(false);
  };

  const fetchPlanItems = async () => {
    const { data } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', id)
      .order('created_at');
    setPlanItems(data || []);
  };

  const generateShareLink = async () => {
    if (!plan) return;

    let shareToken = plan.share_token;
    
    if (!shareToken) {
      // Generate new share token
      const { data } = await supabase.rpc('generate_share_token');
      shareToken = data;
      
      await supabase
        .from('plans')
        .update({ share_token: shareToken })
        .eq('id', id);
    }

    const shareUrl = `${window.location.origin}/admin/plans/${id}/share/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Public Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(plan.id);
    toast({
      title: "Copied",
      description: "Plan ID copied to clipboard",
    });
  };

  const handleBlock = async () => {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'Rejected' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan rejected successfully",
      });
      fetchPlan();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      navigate('/admin/plans');
    }
  };

  const handleConvertToCampaign = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate campaign ID
      const campaignId = await generateCampaignId(supabase);

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          id: campaignId,
          plan_id: plan.id,
          client_id: plan.client_id,
          client_name: plan.client_name,
          campaign_name: campaignData.campaign_name || plan.plan_name,
          start_date: campaignData.start_date || plan.start_date,
          end_date: campaignData.end_date || plan.end_date,
          status: 'Planned',
          total_assets: planItems.length,
          total_amount: plan.total_amount,
          gst_percent: plan.gst_percent,
          gst_amount: plan.gst_amount,
          grand_total: plan.grand_total,
          notes: campaignData.notes || plan.notes,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create campaign assets from plan items
      const campaignAssets = planItems.map(item => ({
        campaign_id: campaignId,
        asset_id: item.asset_id,
        location: item.location,
        city: item.city,
        area: item.area,
        media_type: item.media_type,
        card_rate: item.card_rate,
        mounting_charges: item.mounting_charges,
        printing_charges: item.printing_charges,
        status: 'Pending',
      }));

      const { error: assetsError } = await supabase
        .from('campaign_assets')
        .insert(campaignAssets as any);

      if (assetsError) throw assetsError;

      // Update plan status
      await supabase
        .from('plans')
        .update({ status: 'Converted' })
        .eq('id', id);

      // Update media assets status to Booked
      const assetIds = planItems.map(item => item.asset_id);
      await supabase
        .from('media_assets')
        .update({ status: 'Booked' })
        .in('id', assetIds);

      toast({
        title: "Success",
        description: "Campaign created successfully",
      });

      setShowConvertDialog(false);
      navigate(`/admin/campaigns/${campaignId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/plans')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{plan.plan_name}</h1>
            <div className="flex items-center gap-3">
              <Badge className={getPlanStatusColor(plan.status)}>
                {plan.status}
              </Badge>
              <span className="text-muted-foreground">{plan.id}</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {plan.status === 'Approved' && (
                <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" size="sm">
                      <Rocket className="mr-2 h-4 w-4" />
                      Convert to Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convert to Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Campaign Name</Label>
                        <Input
                          value={campaignData.campaign_name}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, campaign_name: e.target.value }))}
                          placeholder={plan.plan_name}
                        />
                      </div>
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={campaignData.start_date}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={campaignData.end_date}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={campaignData.notes}
                          onChange={(e) => setCampaignData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                          Cancel
                        </Button>
                        <Button variant="gradient" onClick={handleConvertToCampaign}>
                          Create Campaign
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBlock}>
                    <Ban className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCopyId}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy ID
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateShareLink}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateShareLink}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Activity className="mr-2 h-4 w-4" />
                    Activity
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download PPTx
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download Photos
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Quotation, PI, WO
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">{plan.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client ID</p>
                  <p className="font-medium">{plan.client_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(plan.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(plan.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{plan.duration_days} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(plan.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">GST ({plan.gst_percent}%)</span>
                  <span className="font-medium">{formatCurrency(plan.gst_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-semibold text-lg">{formatCurrency(plan.grand_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Items */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Assets ({planItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Sales Price</TableHead>
                  <TableHead className="text-right">Printing</TableHead>
                  <TableHead className="text-right">Mounting</TableHead>
                  <TableHead className="text-right">Total + GST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.asset_id}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.city}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sales_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.printing_charges)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.mounting_charges)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_with_gst)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {plan.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Created: {new Date(plan.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(plan.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
