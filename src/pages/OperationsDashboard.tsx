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
    
    // Fetch all operations
    const { data: opsData, error: opsError } = await supabase
      .from('operations')
      .select(`
        *,
        mounters (name),
        media_assets (id, location, city, area, qr_code_url, latitude, longitude)
      `)
      .order('created_at', { ascending: false });

    if (opsError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch operations',
        variant: 'destructive',
      });
    } else {
      setOperations(opsData || []);
    }

    // Fetch campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('id, campaign_name')
      .order('created_at', { ascending: false });

    setCampaigns(campaignsData || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-500';
      case 'In Progress':
        return 'bg-yellow-500';
      case 'Completed':
        return 'bg-green-500';
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
                    {operations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-medium">
                          {operation.media_assets?.id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {operation.media_assets?.location || 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {operation.media_assets?.city}, {operation.media_assets?.area}
                          </div>
                        </TableCell>
                        <TableCell>{operation.mounters?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(operation.status)}>
                            {operation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {operation.assigned_at
                            ? formatDate(operation.assigned_at)
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {operation.verified_at ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Clock className="h-3 w-3" />
                              {formatDate(operation.verified_at)}
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
                              onClick={() => navigate(`/admin/operations/${operation.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                      {filteredOperations.map((operation) => (
                        <TableRow key={operation.id}>
                          <TableCell className="font-medium">
                            {operation.media_assets?.id || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {operation.media_assets?.location || 'N/A'}
                          </TableCell>
                          <TableCell>{operation.mounters?.name || 'Unassigned'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(operation.status)}>
                              {operation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/operations/${operation.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
