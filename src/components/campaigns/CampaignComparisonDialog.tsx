import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate } from "@/utils/plans";

interface CampaignComparisonDialogProps {
  currentCampaignId: string;
}

export function CampaignComparisonDialog({ currentCampaignId }: CampaignComparisonDialogProps) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [currentAssets, setCurrentAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCampaigns();
      fetchCurrentCampaign();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchSelectedCampaign();
    }
  }, [selectedCampaignId]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, campaign_name, client_name, status")
      .neq("id", currentCampaignId)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const fetchCurrentCampaign = async () => {
    setLoading(true);
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", currentCampaignId)
      .single();
    
    const { data: assets } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", currentCampaignId);

    setCurrentCampaign(campaign);
    setCurrentAssets(assets || []);
    setLoading(false);
  };

  const fetchSelectedCampaign = async () => {
    setLoading(true);
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", selectedCampaignId)
      .single();
    
    const { data: assets } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", selectedCampaignId);

    setSelectedCampaign(campaign);
    setSelectedAssets(assets || []);
    setLoading(false);
  };

  const calculateMetrics = (campaign: any, assets: any[]) => {
    if (!campaign) return null;

    const verifiedAssets = assets.filter(a => a.status === 'Verified').length;
    const completionRate = assets.length > 0 ? (verifiedAssets / assets.length) * 100 : 0;
    const costPerAsset = assets.length > 0 ? campaign.grand_total / assets.length : 0;

    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalAssets: assets.length,
      verifiedAssets,
      completionRate,
      costPerAsset,
      durationDays,
      grandTotal: campaign.grand_total,
    };
  };

  const renderComparison = (label: string, current: any, selected: any, formatter?: (val: any) => string) => {
    if (!selected) return null;

    const formatValue = formatter || ((v) => v?.toString() || '-');
    const difference = typeof current === 'number' && typeof selected === 'number' ? current - selected : 0;
    const percentDiff = selected !== 0 ? (difference / selected) * 100 : 0;

    let icon = <Minus className="h-4 w-4 text-muted-foreground" />;
    let diffColor = "text-muted-foreground";
    
    if (difference > 0) {
      icon = <TrendingUp className="h-4 w-4 text-green-600" />;
      diffColor = "text-green-600";
    } else if (difference < 0) {
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
      diffColor = "text-red-600";
    }

    return (
      <div className="py-3 border-b last:border-0">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="font-medium">{formatValue(current)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Comparing</p>
            <p className="font-medium">{formatValue(selected)}</p>
          </div>
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <p className={`text-sm font-medium ${diffColor}`}>
                {difference > 0 ? '+' : ''}{formatter ? formatValue(difference) : difference}
              </p>
              {typeof percentDiff === 'number' && !isNaN(percentDiff) && percentDiff !== 0 && (
                <p className={`text-xs ${diffColor}`}>
                  {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentMetrics = currentCampaign ? calculateMetrics(currentCampaign, currentAssets) : null;
  const selectedMetrics = selectedCampaign ? calculateMetrics(selectedCampaign, selectedAssets) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <GitCompare className="mr-2 h-4 w-4" />
          Compare Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Comparison</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Campaign */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Campaign to Compare</label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.id} - {campaign.campaign_name} ({campaign.client_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comparison Results */}
          {currentMetrics && selectedMetrics && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Performance Metrics</h3>
                  {renderComparison("Total Assets", currentMetrics.totalAssets, selectedMetrics.totalAssets)}
                  {renderComparison("Verified Assets", currentMetrics.verifiedAssets, selectedMetrics.verifiedAssets)}
                  {renderComparison(
                    "Completion Rate",
                    currentMetrics.completionRate,
                    selectedMetrics.completionRate,
                    (v) => `${Math.round(v)}%`
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Financial Metrics</h3>
                  {renderComparison(
                    "Grand Total",
                    currentMetrics.grandTotal,
                    selectedMetrics.grandTotal,
                    formatCurrency
                  )}
                  {renderComparison(
                    "Cost per Asset",
                    currentMetrics.costPerAsset,
                    selectedMetrics.costPerAsset,
                    formatCurrency
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Timeline</h3>
                  {renderComparison(
                    "Duration",
                    currentMetrics.durationDays,
                    selectedMetrics.durationDays,
                    (v) => `${v} days`
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedCampaignId && (
            <div className="text-center py-12 text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a campaign to compare</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
