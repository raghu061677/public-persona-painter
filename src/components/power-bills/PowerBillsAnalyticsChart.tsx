import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

interface BillData {
  bill_month: string;
  asset_id: string;
  area?: string;
  location?: string;
  units: number;
  current_month_bill: number;
  total_due: number;
  payment_status: string;
}

export function PowerBillsAnalyticsChart() {
  const [bills, setBills] = useState<BillData[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [assets, setAssets] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillsData();
  }, []);

  const fetchBillsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_power_bills')
        .select('*')
        .order('bill_month', { ascending: true });

      if (error) throw error;

      if (data) {
        setBills(data);
        
        // Get unique asset IDs
        const uniqueAssetIds = Array.from(new Set(data.map(b => b.asset_id)));
        
        // Fetch asset details from media_assets for better labels
        const { data: assetDetails } = await supabase
          .from('media_assets')
          .select('id, media_asset_code, location, area')
          .in('id', uniqueAssetIds);
        
        // Build asset dropdown options with location info
        const uniqueAssets = uniqueAssetIds.map(assetId => {
          const asset = assetDetails?.find(a => a.id === assetId);
          const displayCode = asset?.media_asset_code || assetId.slice(0, 8);
          const location = asset?.location || '';
          const area = asset?.area || '';
          
          return {
            id: assetId,
            label: location 
              ? `${displayCode} - ${area ? area + ', ' : ''}${location}`.trim()
              : displayCode
          };
        });
        
        setAssets(uniqueAssets);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const filtered = selectedAsset === "all" 
      ? bills 
      : bills.filter(b => b.asset_id === selectedAsset);

    // Group by month and aggregate
    const monthlyData = filtered.reduce((acc, bill) => {
      const month = format(new Date(bill.bill_month), 'MMM yyyy');
      
      if (!acc[month]) {
        acc[month] = {
          month,
          totalUnits: 0,
          totalCost: 0,
          billCount: 0,
          avgCost: 0,
          avgUnits: 0
        };
      }
      
      acc[month].totalUnits += Number(bill.units || 0);
      acc[month].totalCost += Number(bill.total_due || bill.current_month_bill || 0);
      acc[month].billCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    return Object.values(monthlyData).map((item: any) => ({
      ...item,
      avgCost: Math.round(item.totalCost / item.billCount),
      avgUnits: Math.round(item.totalUnits / item.billCount)
    }));
  };

  const chartData = getFilteredData();

  const calculateTrends = () => {
    if (chartData.length < 2) return { costTrend: 0, unitsTrend: 0 };
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    const costTrend = previous.totalCost > 0 
      ? ((latest.totalCost - previous.totalCost) / previous.totalCost) * 100 
      : 0;
    
    const unitsTrend = previous.totalUnits > 0
      ? ((latest.totalUnits - previous.totalUnits) / previous.totalUnits) * 100
      : 0;
    
    return { costTrend, unitsTrend };
  };

  const { costTrend, unitsTrend } = calculateTrends();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No bill data available. Fetch bills to see analytics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Power Bills Analytics
            </CardTitle>
            <CardDescription>
              Month-over-month consumption and cost trends
            </CardDescription>
          </div>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {assets.map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost (Latest)</p>
                  <p className="text-2xl font-bold">
                    ₹{chartData[chartData.length - 1]?.totalCost.toLocaleString() || 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className={`text-xs mt-2 ${costTrend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {costTrend >= 0 ? '↑' : '↓'} {Math.abs(costTrend).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units (Latest)</p>
                  <p className="text-2xl font-bold">
                    {chartData[chartData.length - 1]?.totalUnits.toLocaleString() || 0}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className={`text-xs mt-2 ${unitsTrend >= 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                {unitsTrend >= 0 ? '↑' : '↓'} {Math.abs(unitsTrend).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Cost per Unit</p>
                  <p className="text-2xl font-bold">
                    ₹{chartData[chartData.length - 1]?.totalUnits 
                      ? (chartData[chartData.length - 1].totalCost / chartData[chartData.length - 1].totalUnits).toFixed(2)
                      : 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Based on latest billing period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="cost" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cost">Cost Trends</TabsTrigger>
            <TabsTrigger value="consumption">Consumption</TabsTrigger>
            <TabsTrigger value="comparison">Cost vs Units</TabsTrigger>
          </TabsList>

          <TabsContent value="cost" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalCost" 
                  name="Total Cost"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgCost" 
                  name="Avg Cost per Asset"
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="consumption" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} units`}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar 
                  dataKey="totalUnits" 
                  name="Total Units"
                  fill="hsl(var(--chart-3))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Cost (₹)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Units', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="totalCost" 
                  name="Cost (₹)"
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="totalUnits" 
                  name="Units"
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Data Table */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">Monthly Breakdown</h4>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-right">Total Units</th>
                    <th className="px-4 py-2 text-right">Total Cost</th>
                    <th className="px-4 py-2 text-right">Avg Cost/Unit</th>
                    <th className="px-4 py-2 text-center">Bills Count</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{row.month}</td>
                      <td className="px-4 py-2 text-right">{row.totalUnits.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">₹{row.totalCost.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        ₹{(row.totalCost / row.totalUnits).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">{row.billCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}