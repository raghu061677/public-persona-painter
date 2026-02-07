import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";

interface AssetBudget {
  asset_id: string;
  asset_display_code: string;
  location: string;
  area: string;
  planned_cost: number;
  actual_cost: number;
  variance: number;
  variance_percent: number;
}

export default function CampaignBudget() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [assetBudgets, setAssetBudgets] = useState<AssetBudget[]>([]);
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [totalActual, setTotalActual] = useState(0);
  const [totalVariance, setTotalVariance] = useState(0);
  const [sharedExpenseTotal, setSharedExpenseTotal] = useState(0);
  useEffect(() => {
    if (id) loadBudgetData();
  }, [id]);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      // Fetch campaign
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignData) {
        setCampaign(campaignData);

        // Fetch campaign assets with costs and media_asset_code
        const { data: assetsData } = await supabase
          .from("campaign_assets")
          .select(`
            asset_id, location, area, card_rate, negotiated_rate,
            printing_charges, mounting_charges,
            booking_start_date, booking_end_date,
            start_date, end_date,
            media_assets!campaign_assets_asset_id_fkey (
              id,
              media_asset_code
            )
          `)
          .eq("campaign_id", id);

        if (assetsData) {
          // Fetch expenses for this campaign (only needed columns)
          const { data: expensesData } = await supabase
            .from("expenses")
            .select("id, asset_id, total_amount")
            .eq("campaign_id", id!);

          const expenses = expensesData || [];

          // Separate direct (asset-linked) vs shared (no asset_id) expenses
          const directExpenseMap = new Map<string, number>();
          let sharedTotal = 0;

          for (const exp of expenses) {
            const amt = exp.total_amount || 0;
            if (exp.asset_id) {
              directExpenseMap.set(exp.asset_id, (directExpenseMap.get(exp.asset_id) || 0) + amt);
            } else {
              sharedTotal += amt;
            }
          }

          // Step 1: Compute planned costs for all assets
          const assetPlannedCosts: { asset: typeof assetsData[0]; plannedCost: number }[] = assetsData.map(asset => {
            const assetStart = asset.booking_start_date || asset.start_date || campaignData.start_date;
            const assetEnd = asset.booking_end_date || asset.end_date || campaignData.end_date;
            const assetDuration = assetStart && assetEnd
              ? Math.ceil((new Date(assetEnd).getTime() - new Date(assetStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
              : 30;

            const monthlyRate = asset.negotiated_rate ?? asset.card_rate ?? 0;
            const plannedRent = (monthlyRate / 30) * assetDuration;
            const plannedCost = plannedRent + (asset.printing_charges || 0) + (asset.mounting_charges || 0);
            return { asset, plannedCost };
          });

          const totalPlannedCostRaw = assetPlannedCosts.reduce((s, x) => s + x.plannedCost, 0);

          // Step 2: Build budgets with direct + shared allocation
          const budgets: AssetBudget[] = assetPlannedCosts.map(({ asset, plannedCost }) => {
            const directActual = directExpenseMap.get(asset.asset_id) || 0;
            const plannedShare = totalPlannedCostRaw > 0 ? plannedCost / totalPlannedCostRaw : 0;
            const sharedAllocated = sharedTotal * plannedShare;
            const actualCost = directActual + sharedAllocated;

            const variance = actualCost - plannedCost;
            const variance_percent = plannedCost > 0 ? (variance / plannedCost) * 100 : 0;

            const assetDisplayCode = getAssetDisplayCode(
              (asset as any).media_assets,
              asset.asset_id
            );

            return {
              asset_id: asset.asset_id,
              asset_display_code: assetDisplayCode,
              location: asset.location,
              area: asset.area,
              planned_cost: plannedCost,
              actual_cost: actualCost,
              variance,
              variance_percent,
            };
          });

          setAssetBudgets(budgets);
          setSharedExpenseTotal(sharedTotal);

          const planned = budgets.reduce((sum, b) => sum + b.planned_cost, 0);
          const actual = budgets.reduce((sum, b) => sum + b.actual_cost, 0);
          setTotalPlanned(planned);
          setTotalActual(actual);
          setTotalVariance(actual - planned);
        }
      }
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceBadge = (variance_percent: number) => {
    if (variance_percent > 10) {
      return <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" />Over {Math.abs(variance_percent).toFixed(1)}%</Badge>;
    } else if (variance_percent < -10) {
      return <Badge variant="default" className="gap-1 bg-green-500"><TrendingDown className="h-3 w-3" />Under {Math.abs(variance_percent).toFixed(1)}%</Badge>;
    } else {
      return <Badge variant="secondary">On Track</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button onClick={() => navigate("/admin/campaigns")} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const overallVariancePercent = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/campaigns/${id}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaign
          </Button>
          <h1 className="text-3xl font-bold">Budget Tracker</h1>
          <p className="text-muted-foreground mt-1">
            {campaign.campaign_name} - Planned vs Actual Costs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Planned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPlanned)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getVarianceBadge(overallVariancePercent)}
          </CardContent>
        </Card>
      </div>

      {Math.abs(overallVariancePercent) > 10 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Budget Alert
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {overallVariancePercent > 0 
                    ? `Actual costs exceed planned budget by ${Math.abs(overallVariancePercent).toFixed(1)}%`
                    : `Actual costs are under planned budget by ${Math.abs(overallVariancePercent).toFixed(1)}%`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Asset-wise Budget Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">Planned Cost</TableHead>
                <TableHead className="text-right">Actual Cost</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetBudgets.map((budget) => (
                <TableRow key={budget.asset_id}>
                  <TableCell className="font-mono text-sm">{budget.asset_display_code}</TableCell>
                  <TableCell>{budget.location}</TableCell>
                  <TableCell>{budget.area}</TableCell>
                  <TableCell className="text-right">{formatCurrency(budget.planned_cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(budget.actual_cost)}</TableCell>
                  <TableCell className={`text-right ${budget.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {budget.variance > 0 ? '+' : ''}{formatCurrency(budget.variance)}
                  </TableCell>
                  <TableCell>{getVarianceBadge(budget.variance_percent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sharedExpenseTotal > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Shared campaign expenses allocated proportionally: {formatCurrency(sharedExpenseTotal)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
