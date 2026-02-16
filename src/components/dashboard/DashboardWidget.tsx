import { useEffect, useState } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface WidgetProps {
  widget: {
    id: string;
    type: string;
    metric: string;
    timeRange: string;
    visualizationType: string;
    title: string;
    config: any;
    filters?: {
      city?: string;
      clientId?: string;
      assetType?: string;
    };
  };
  globalFilters?: {
    city?: string;
    clientId?: string;
    assetType?: string;
  };
}

export function DashboardWidget({ widget, globalFilters }: WidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Merge widget-specific filters with global filters
  const activeFilters = {
    ...globalFilters,
    ...widget.filters
  };

  useEffect(() => {
    fetchWidgetData();
  }, [widget, globalFilters]);

  const fetchWidgetData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: companyData } = await supabase
      .from('company_users' as any)
      .select('company_id')
      .eq('user_id', user.id)
      .single() as any;

    const companyId = companyData?.company_id;
    const timeRangeDays = getTimeRangeDays(widget.timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);

    try {
      let result;
      switch (widget.metric) {
        case 'booking_requests':
          result = await fetchBookingRequests(companyId, startDate);
          break;
        case 'ai_queries':
          result = await fetchAIQueries(companyId, startDate);
          break;
        case 'portal_logins':
          result = await fetchPortalLogins(startDate);
          break;
        case 'revenue':
          result = await fetchRevenue(companyId, startDate);
          break;
        case 'campaigns':
          result = await fetchCampaigns(companyId, startDate);
          break;
        case 'vacant_media':
          result = await fetchVacantMedia(companyId);
          break;
        default:
          result = { value: 0, data: [] };
      }
      setData(result);
    } catch (error) {
      console.error('Error fetching widget data:', error);
      setData({ value: 0, data: [] });
    }
    
    setLoading(false);
  };

  const getTimeRangeDays = (range: string): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const fetchBookingRequests = async (companyId: string, startDate: Date) => {
    let query = supabase
      .from('booking_requests' as any)
      .select('*, media_assets!inner(*)')
      .gte('created_at', startDate.toISOString());

    // Apply filters
    if (activeFilters.city && activeFilters.city !== 'all') {
      query = query.eq('media_assets.city', activeFilters.city);
    }
    if (activeFilters.assetType && activeFilters.assetType !== 'all') {
      query = query.eq('media_assets.media_type', activeFilters.assetType);
    }

    const { data } = await query as any;

    const total = data?.length || 0;
    const approved = data?.filter((r: any) => r.status === 'approved').length || 0;
    
    return {
      value: total,
      change: approved / (total || 1) * 100,
      data: data || []
    };
  };

  const fetchAIQueries = async (companyId: string, startDate: Date) => {
    const { data } = await supabase
      .from('ai_assistant_logs' as any)
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString()) as any;

    return {
      value: data?.length || 0,
      data: data || []
    };
  };

  const fetchPortalLogins = async (startDate: Date) => {
    const { data } = await supabase
      .from('client_portal_access_logs' as any)
      .select('*')
      .eq('action', 'login')
      .gte('created_at', startDate.toISOString()) as any;

    return {
      value: data?.length || 0,
      data: data || []
    };
  };

  const fetchRevenue = async (companyId: string, startDate: Date) => {
    let query = supabase
      .from('invoices' as any)
      .select('total_amount, status, client_id')
      .eq('company_id', companyId)
      .gte('invoice_date', startDate.toISOString().split('T')[0]);

    // Apply client filter
    if (activeFilters.clientId && activeFilters.clientId !== 'all') {
      query = query.eq('client_id', activeFilters.clientId);
    }

    const { data } = await query as any;

    const total = data?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;
    
    return {
      value: total,
      data: data || []
    };
  };

  const fetchCampaigns = async (companyId: string, startDate: Date) => {
    let query = supabase
      .from('campaigns' as any)
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate.toISOString());

    // Apply client filter
    if (activeFilters.clientId && activeFilters.clientId !== 'all') {
      query = query.eq('client_id', activeFilters.clientId);
    }

    const { data } = await query as any;

    return {
      value: data?.length || 0,
      data: data || []
    };
  };

  const fetchVacantMedia = async (companyId: string) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all assets for this company
    let assetQuery = supabase
      .from('media_assets' as any)
      .select('id, city, media_type')
      .eq('company_id', companyId);

    if (activeFilters.city && activeFilters.city !== 'all') {
      assetQuery = assetQuery.eq('city', activeFilters.city);
    }
    if (activeFilters.assetType && activeFilters.assetType !== 'all') {
      assetQuery = assetQuery.eq('media_type', activeFilters.assetType);
    }

    const { data: allAssets } = await assetQuery as any;
    if (!allAssets || allAssets.length === 0) return { value: 0, data: [] };

    const assetIds = allAssets.map((a: any) => a.id);

    // 2. Fetch active campaign bookings overlapping today
    const { data: bookings } = await supabase
      .from('campaign_assets' as any)
      .select('asset_id, campaign_id, booking_start_date, booking_end_date, campaigns:campaign_id!inner(status, is_deleted)')
      .in('asset_id', assetIds) as any;

    const bookedAssetIds = new Set<string>();
    for (const b of (bookings || [])) {
      const campaign = b.campaigns as any;
      if (!campaign || campaign.is_deleted) continue;
      const activeStatuses = ['Draft', 'Upcoming', 'Running'];
      if (!activeStatuses.includes(campaign.status)) continue;
      const bStart = b.booking_start_date;
      const bEnd = b.booking_end_date;
      if (bStart && bEnd && bStart <= today && bEnd >= today) {
        bookedAssetIds.add(b.asset_id);
      }
    }

    // 3. Fetch active holds overlapping today
    const { data: holds } = await supabase
      .from('asset_holds' as any)
      .select('asset_id')
      .in('asset_id', assetIds)
      .eq('status', 'ACTIVE')
      .lte('start_date', today)
      .gte('end_date', today) as any;

    for (const h of (holds || [])) {
      bookedAssetIds.add(h.asset_id);
    }

    // 4. Truly available = all minus booked/held
    const vacantCount = allAssets.filter((a: any) => !bookedAssetIds.has(a.id)).length;

    return {
      value: vacantCount,
      data: allAssets.filter((a: any) => !bookedAssetIds.has(a.id))
    };
  };

  const renderVisualization = () => {
    if (loading) {
      return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
    }

    if (!data) {
      return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;
    }

    switch (widget.visualizationType) {
      case 'kpi':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-5xl font-bold text-foreground">
              {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
            </div>
            {data.change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">{Math.abs(data.change).toFixed(1)}%</span>
              </div>
            )}
          </div>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="h-64 flex items-center justify-center text-muted-foreground">Unsupported visualization</div>;
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        <CardDescription>{widget.timeRange} view</CardDescription>
      </CardHeader>
      <CardContent>
        {renderVisualization()}
      </CardContent>
    </>
  );
}
