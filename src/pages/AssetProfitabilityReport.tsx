import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, 
  Download, Filter, ArrowUpDown, Calendar,
  MapPin, Zap, Building
} from 'lucide-react';
import { formatCurrency } from '@/utils/mediaAssets';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';

interface AssetProfitability {
  asset_id: string;
  asset_code: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  illumination_type: string;
  booked_days: number;
  total_days: number;
  occupancy_percent: number;
  revenue_billed: number;
  printing_cost: number;
  mounting_cost: number;
  power_cost: number;
  maintenance_cost: number;
  total_cogs: number;
  gross_profit: number;
  margin_percent: number;
  revenue_per_day: number;
}

interface Filters {
  city: string;
  area: string;
  media_type: string;
  illumination_type: string;
}

type SortField = 'gross_profit' | 'revenue_billed' | 'occupancy_percent' | 'margin_percent' | 'revenue_per_day';
type SortDirection = 'asc' | 'desc';

export default function AssetProfitabilityReport() {
  const { toast } = useToast();
  const [data, setData] = useState<AssetProfitability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filters, setFilters] = useState<Filters>({ city: '', area: '', media_type: '', illumination_type: '' });
  const [sortField, setSortField] = useState<SortField>('gross_profit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filters]);

  const fetchFilterOptions = async () => {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('city, area, media_type');

    if (assets) {
      const uniqueCities = [...new Set(assets.map(a => a.city).filter(Boolean))] as string[];
      const uniqueAreas = [...new Set(assets.map(a => a.area).filter(Boolean))] as string[];
      const uniqueTypes = [...new Set(assets.map(a => a.media_type).filter(Boolean))] as string[];
      setCities(uniqueCities.sort());
      setAreas(uniqueAreas.sort());
      setMediaTypes(uniqueTypes.sort());
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Calculate total days in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDaysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Fetch all media assets with filters
      let assetsQuery = supabase
        .from('media_assets')
        .select('id, media_asset_code, location, city, area, media_type, illumination_type');

      if (filters.city) assetsQuery = assetsQuery.eq('city', filters.city);
      if (filters.area) assetsQuery = assetsQuery.eq('area', filters.area);
      if (filters.media_type) assetsQuery = assetsQuery.eq('media_type', filters.media_type);
      if (filters.illumination_type) assetsQuery = assetsQuery.eq('illumination_type', filters.illumination_type);

      const { data: assets, error: assetsError } = await assetsQuery;
      if (assetsError) throw assetsError;

      if (!assets || assets.length === 0) {
        setData([]);
        setIsLoading(false);
        return;
      }

      const assetIds = assets.map(a => a.id);

      // Fetch campaign assets for booked days and costs
      const { data: campaignAssets } = await supabase
        .from('campaign_assets')
        .select(`
          asset_id, 
          booking_start_date, 
          booking_end_date,
          printing_cost,
          mounting_cost,
          printing_billed,
          mounting_billed,
          card_rate,
          negotiated_rate,
          total_price
        `)
        .in('asset_id', assetIds)
        .gte('booking_end_date', startDate)
        .lte('booking_start_date', endDate);

      // Fetch invoice items for actual billed revenue
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_date, status')
        .in('status', ['Sent', 'Paid', 'Overdue'])
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

      const invoiceIds = invoices?.map(i => i.id) || [];

      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('invoice_id, campaign_asset_id, line_total')
        .in('invoice_id', invoiceIds);

      // Fetch power bills
      const { data: powerBills } = await supabase
        .from('asset_power_bills')
        .select('asset_id, bill_amount, bill_month')
        .in('asset_id', assetIds)
        .gte('bill_month', startDate.substring(0, 7))
        .lte('bill_month', endDate.substring(0, 7));

      // Fetch expenses (maintenance via Other category or dedicated maintenance)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('asset_id, amount, category')
        .in('asset_id', assetIds)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      // Build profitability data per asset
      const profitabilityMap = new Map<string, AssetProfitability>();

      for (const asset of assets) {
        const assetCampaigns = campaignAssets?.filter(ca => ca.asset_id === asset.id) || [];
        
        // Calculate booked days (overlap with date range)
        let bookedDays = 0;
        let printingCost = 0;
        let mountingCost = 0;
        let revenue = 0;

        for (const ca of assetCampaigns) {
          const caStart = new Date(ca.booking_start_date || startDate);
          const caEnd = new Date(ca.booking_end_date || endDate);
          const overlapStart = Math.max(caStart.getTime(), start.getTime());
          const overlapEnd = Math.min(caEnd.getTime(), end.getTime());
          
          if (overlapEnd >= overlapStart) {
            bookedDays += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          }

          if (ca.printing_billed) printingCost += ca.printing_cost || 0;
          if (ca.mounting_billed) mountingCost += ca.mounting_cost || 0;
        }

        // Get revenue from invoice items
        const assetInvoiceItems = invoiceItems?.filter(ii => {
          const ca = assetCampaigns.find(c => c.asset_id === asset.id);
          return ca && ii.campaign_asset_id;
        }) || [];
        
        revenue = assetInvoiceItems.reduce((sum, ii) => sum + (ii.line_total || 0), 0);
        
        // If no invoice data, estimate from campaign assets
        if (revenue === 0 && assetCampaigns.length > 0) {
          revenue = assetCampaigns.reduce((sum, ca) => sum + (ca.total_price || ca.negotiated_rate || ca.card_rate || 0), 0);
        }

        // Power costs
        const assetPowerBills = powerBills?.filter(pb => pb.asset_id === asset.id) || [];
        const powerCost = assetPowerBills.reduce((sum, pb) => sum + (pb.bill_amount || 0), 0);

        // Maintenance costs (filter for Other or any maintenance-type)
        const assetExpenses = expenses?.filter(e => e.asset_id === asset.id) || [];
        const maintenanceCost = assetExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalCogs = printingCost + mountingCost + powerCost + maintenanceCost;
        const grossProfit = revenue - totalCogs;
        const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        const occupancyPercent = totalDaysInRange > 0 ? (bookedDays / totalDaysInRange) * 100 : 0;
        const revenuePerDay = bookedDays > 0 ? revenue / bookedDays : 0;

        profitabilityMap.set(asset.id, {
          asset_id: asset.id,
          asset_code: asset.media_asset_code || asset.id,
          location: asset.location || '',
          city: asset.city || '',
          area: asset.area || '',
          media_type: asset.media_type || '',
          illumination_type: asset.illumination_type || '',
          booked_days: bookedDays,
          total_days: totalDaysInRange,
          occupancy_percent: Math.min(100, occupancyPercent),
          revenue_billed: revenue,
          printing_cost: printingCost,
          mounting_cost: mountingCost,
          power_cost: powerCost,
          maintenance_cost: maintenanceCost,
          total_cogs: totalCogs,
          gross_profit: grossProfit,
          margin_percent: marginPercent,
          revenue_per_day: revenuePerDay,
        });
      }

      setData(Array.from(profitabilityMap.values()));
    } catch (error) {
      console.error('Error fetching profitability data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profitability data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue_billed,
      cogs: acc.cogs + item.total_cogs,
      profit: acc.profit + item.gross_profit,
    }),
    { revenue: 0, cogs: 0, profit: 0 }
  );

  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const topAsset = data.length > 0 ? [...data].sort((a, b) => b.gross_profit - a.gross_profit)[0] : null;

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToExcel = () => {
    const exportData = sortedData.map((item) => ({
      'Asset Code': item.asset_code,
      'Location': item.location,
      'City': item.city,
      'Area': item.area,
      'Media Type': item.media_type,
      'Illumination': item.illumination_type,
      'Booked Days': item.booked_days,
      'Occupancy %': item.occupancy_percent.toFixed(1),
      'Revenue (Billed)': item.revenue_billed,
      'Printing Cost': item.printing_cost,
      'Mounting Cost': item.mounting_cost,
      'Power Cost': item.power_cost,
      'Maintenance Cost': item.maintenance_cost,
      'Total COGS': item.total_cogs,
      'Gross Profit': item.gross_profit,
      'Margin %': item.margin_percent.toFixed(1),
      'Revenue/Day': item.revenue_per_day.toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Profitability');
    XLSX.writeFile(wb, `Asset_Profitability_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Profitability Report</h1>
          <p className="text-muted-foreground">Revenue, costs, profit, and occupancy by asset</p>
        </div>
        <Button onClick={exportToExcel} disabled={data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Date Range & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>City</Label>
              <Select value={filters.city} onValueChange={(v) => setFilters({ ...filters, city: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Area</Label>
              <Select value={filters.area} onValueChange={(v) => setFilters({ ...filters, area: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Media Type</Label>
              <Select value={filters.media_type} onValueChange={(v) => setFilters({ ...filters, media_type: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {mediaTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Illumination</Label>
              <Select value={filters.illumination_type} onValueChange={(v) => setFilters({ ...filters, illumination_type: v === 'all' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Lit">Lit</SelectItem>
                  <SelectItem value="Non-Lit">Non-Lit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingDown className="h-4 w-4" />
              Total COGS
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.cogs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Gross Profit
            </div>
            <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              Avg Margin
            </div>
            <p className={`text-2xl font-bold ${avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building className="h-4 w-4" />
              Top Asset
            </div>
            <p className="text-lg font-bold truncate" title={topAsset?.asset_code}>
              {topAsset?.asset_code || '-'}
            </p>
            {topAsset && (
              <p className="text-sm text-green-600">{formatCurrency(topAsset.gross_profit)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset-wise P&L ({data.length} assets)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No data for selected filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('occupancy_percent')}
                    >
                      Occupancy <ArrowUpDown className="inline h-3 w-3" />
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('revenue_billed')}
                    >
                      Revenue <ArrowUpDown className="inline h-3 w-3" />
                    </TableHead>
                    <TableHead className="text-right">Printing</TableHead>
                    <TableHead className="text-right">Mounting</TableHead>
                    <TableHead className="text-right">Power</TableHead>
                    <TableHead className="text-right">Maint.</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('gross_profit')}
                    >
                      Profit <ArrowUpDown className="inline h-3 w-3" />
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('margin_percent')}
                    >
                      Margin <ArrowUpDown className="inline h-3 w-3" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => (
                    <TableRow key={item.asset_id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="font-medium">{item.asset_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.location}>
                        {item.city}, {item.area}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.media_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.booked_days}d</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={item.occupancy_percent >= 70 ? 'default' : item.occupancy_percent >= 40 ? 'secondary' : 'outline'}
                          className={item.occupancy_percent >= 70 ? 'bg-green-500' : ''}
                        >
                          {item.occupancy_percent.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.revenue_billed)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.printing_cost)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.mounting_cost)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.power_cost)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(item.maintenance_cost)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(item.total_cogs)}</TableCell>
                      <TableCell className={`text-right font-bold ${item.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.gross_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.margin_percent >= 50 ? 'default' : item.margin_percent >= 0 ? 'secondary' : 'destructive'}>
                          {item.margin_percent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
