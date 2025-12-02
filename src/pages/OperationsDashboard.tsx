import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { QrCode, MapPin, Eye, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/plans';

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all operations from campaign_assets
    const { data: opsData, error: opsError } = await supabase
      .from('campaign_assets')
      .select(`
        *,
        media_assets (id, location, city, area, qr_code_url, latitude, longitude),
        campaigns (id, campaign_name, client_name)
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
      setOperations(opsData || []);
    }

    // Fetch campaigns
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, campaign_name')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      setCampaigns([]);
    } else {
      setCampaigns(campaignsData || []);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-gray-500';
      case 'Assigned':
        return 'bg-blue-500';
      case 'In Progress':
        return 'bg-yellow-500';
      case 'Installed':
        return 'bg-purple-500';
      case 'QA Pending':
        return 'bg-orange-500';
      case 'Completed':
        return 'bg-green-500';
      case 'Failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredOperations =
    selectedCampaign === 'all'
      ? operations
      : operations.filter((op) => op.campaign_id === selectedCampaign);

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
            <TabsTrigger value="campaign">By Campaign</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Mounter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No operations found. Operations are created when campaigns are assigned to mounters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      operations.map((operation) => (
                        <TableRow key={operation.id}>
                          <TableCell className="font-medium">
                            {operation.asset_id || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {operation.location || operation.media_assets?.location || 'N/A'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {operation.city || operation.media_assets?.city}, {operation.area || operation.media_assets?.area}
                            </div>
                          </TableCell>
                          <TableCell>{operation.mounter_name || 'Unassigned'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(operation.installation_status || operation.status)}>
                              {operation.installation_status || operation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {operation.assigned_at
                              ? formatDate(operation.assigned_at)
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {operation.completed_at ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Clock className="h-3 w-3" />
                                {formatDate(operation.completed_at)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {operation.media_assets?.qr_code_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(operation.media_assets.qr_code_url, '_blank')}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/campaigns/${operation.campaign_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Campaign
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filter by Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full max-w-md p-2 border rounded-md"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.campaign_name}
                    </option>
                  ))}
                </select>

                <div className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Mounter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOperations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No operations found for this campaign filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOperations.map((operation) => (
                          <TableRow key={operation.id}>
                            <TableCell className="font-medium">
                              {operation.asset_id || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {operation.location || operation.media_assets?.location || 'N/A'}
                            </TableCell>
                            <TableCell>{operation.mounter_name || 'Unassigned'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(operation.installation_status || operation.status)}>
                                {operation.installation_status || operation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/campaigns/${operation.campaign_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Campaign
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Map View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Map view coming soon - Will display all operations on an interactive map
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
