import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { OperationsMapView } from '@/components/operations/OperationsMapView';
import { OperationsDataTable } from '@/components/operations/OperationsDataTable';

export default function OperationsDashboard() {
  const [operations, setOperations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch all operations from campaign_assets with related data including media_asset_code
    const { data: opsData, error: opsError } = await supabase
      .from('campaign_assets')
      .select(`
        *,
        media_assets (id, media_asset_code, location, city, area, qr_code_url, latitude, longitude),
        campaigns:campaign_id (id, campaign_name, client_name, status)
      `)
      .order('created_at', { ascending: false });

    if (opsError) {
      console.error('Error fetching operations:', opsError);
      toast({
        title: 'Error',
        description: 'Failed to fetch operations',
        variant: 'destructive',
      });
      setOperations([]);
    } else {
      // Transform data to match OperationsDataTable interface
      const transformed = (opsData || []).map(op => ({
        ...op,
        campaign: op.campaigns,
      }));
      setOperations(transformed);
    }

    // Fetch campaigns for filter dropdown
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, campaign_name, client_name, status')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      setCampaigns([]);
    } else {
      setCampaigns(campaignsData || []);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading operations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor installation progress and manage field operations
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Operations</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <OperationsDataTable 
              assets={operations}
              campaigns={campaigns}
              loading={loading}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operations Map View</CardTitle>
              </CardHeader>
              <CardContent>
                <OperationsMapView />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
