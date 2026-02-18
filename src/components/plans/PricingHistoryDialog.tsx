import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate } from "@/utils/plans";
import { TrendingUp, TrendingDown, Minus, History, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PricingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetLocation: string;
  currentCardRate: number;
}

interface PriceHistory {
  plan_id: string;
  plan_name: string;
  client_name: string;
  sales_price: number;
  card_rate: number;
  discount_percent: number;
  created_at: string;
  plan_status: string;
}

export function PricingHistoryDialog({
  open,
  onOpenChange,
  assetId,
  assetLocation,
  currentCardRate,
}: PricingHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [stats, setStats] = useState({
    avgPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    totalDeals: 0,
    avgDiscount: 0,
  });

  useEffect(() => {
    if (open) {
      fetchPricingHistory();
    }
  }, [open, assetId]);

  const fetchPricingHistory = async () => {
    setLoading(true);
    try {
      // Get all plan items for this asset from completed/approved plans
      const { data: planItems, error } = await supabase
        .from('plan_items')
        .select(`
          plan_id,
          sales_price,
          card_rate,
          discount_value,
          created_at,
          plans!inner(
            plan_name,
            client_name,
            status
          )
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedHistory: PriceHistory[] = planItems?.map((item: any) => ({
        plan_id: item.plan_id,
        plan_name: item.plans.plan_name,
        client_name: item.plans.client_name,
        sales_price: item.sales_price || 0,
        card_rate: item.card_rate || 0,
        discount_percent: item.card_rate > 0 
          ? ((item.card_rate - item.sales_price) / item.card_rate) * 100 
          : 0,
        created_at: item.created_at,
        plan_status: item.plans.status,
      })) || [];

      setHistory(formattedHistory);

      // Calculate statistics
      if (formattedHistory.length > 0) {
        const prices = formattedHistory.map(h => h.sales_price);
        const discounts = formattedHistory.map(h => h.discount_percent);
        
        setStats({
          avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          totalDeals: formattedHistory.length,
          avgDiscount: discounts.reduce((a, b) => a + b, 0) / discounts.length,
        });
      }
    } catch (error: any) {
      console.error('Error fetching pricing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceTrend = (price: number) => {
    if (price > currentCardRate) {
      return { icon: TrendingUp, color: 'text-green-600', label: 'Premium' };
    } else if (price < currentCardRate) {
      return { icon: TrendingDown, color: 'text-red-600', label: 'Discount' };
    }
    return { icon: Minus, color: 'text-muted-foreground', label: 'At Card Rate' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Converted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Pricing History: {assetId}
          </DialogTitle>
          <DialogDescription>{assetLocation}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No pricing history available for this asset</p>
            <p className="text-sm text-muted-foreground mt-1">
              This will be the first deal for this asset
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Deals</div>
                  <div className="text-2xl font-bold">{stats.totalDeals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Price</div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Min Price</div>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.minPrice)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Max Price</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.maxPrice)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Discount</div>
                  <div className="text-2xl font-bold">{stats.avgDiscount.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Current Card Rate Reference */}
            <Card className="bg-primary/5 border-primary">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Card Rate</div>
                    <div className="text-xl font-bold">{formatCurrency(currentCardRate)}</div>
                  </div>
                  <Badge variant="outline" className="border-primary">Reference Price</Badge>
                </div>
              </CardContent>
            </Card>

            {/* History Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan / Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Card Rate</TableHead>
                    <TableHead className="text-right">Negotiated</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item, index) => {
                    const trend = getPriceTrend(item.sales_price);
                    const TrendIcon = trend.icon;
                    
                    return (
                      <TableRow key={`${item.plan_id}-${index}`}>
                        <TableCell className="font-medium">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{item.plan_name}</div>
                            <div className="text-xs text-muted-foreground">{item.client_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(item.plan_status)}>
                            {item.plan_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.card_rate)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.sales_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.discount_percent > 0 ? 'text-red-600' : 'text-green-600'}>
                            {item.discount_percent > 0 ? '-' : '+'}{Math.abs(item.discount_percent).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendIcon className={`h-4 w-4 ${trend.color}`} />
                            <span className={`text-xs ${trend.color}`}>{trend.label}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Insights */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <h4 className="font-semibold mb-2 text-sm">💡 Negotiation Insights</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Historical average is <strong>{formatCurrency(stats.avgPrice)}</strong> ({((stats.avgPrice / currentCardRate) * 100).toFixed(0)}% of current card rate)</li>
                  <li>• Price range: {formatCurrency(stats.minPrice)} to {formatCurrency(stats.maxPrice)} (spread: {formatCurrency(stats.maxPrice - stats.minPrice)})</li>
                  <li>• Most common discount: ~{stats.avgDiscount.toFixed(0)}%</li>
                  {stats.maxPrice > currentCardRate && (
                    <li className="text-green-600">• ✓ This asset has sold above card rate before (premium pricing possible)</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
