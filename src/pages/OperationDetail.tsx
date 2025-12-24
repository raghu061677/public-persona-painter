import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, QrCode, Clock, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/plans';
import { BackToCampaignButton } from '@/components/campaigns/BackToCampaignButton';
import { CampaignBreadcrumbs } from '@/components/campaigns/CampaignBreadcrumbs';
import { CampaignContextHeader } from '@/components/campaigns/CampaignContextHeader';

export default function OperationDetail() {
  const { id, campaignId } = useParams();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    // Fetch operation with related data
    const { data: opData, error: opError } = await supabase
      .from('operations')
      .select(
        `
        *,
        mounters (name, phone),
        media_assets (id, location, city, area, qr_code_url, latitude, longitude),
        campaigns (id, campaign_name, client_name)
      `
      )
      .eq('id', id)
      .single();

    if (opError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch operation details',
        variant: 'destructive',
      });
      // Navigate back to campaign if we have campaignId, otherwise campaigns list
      const targetCampaignId = campaignId || opData?.campaigns?.id;
      if (targetCampaignId) {
        navigate(`/admin/campaigns/${targetCampaignId}`);
      } else {
        navigate('/admin/campaigns');
      }
      return;
    }

    setOperation(opData);

    // Fetch photos
    const { data: photosData } = await supabase
      .from('operation_photos')
      .select('*')
      .eq('operation_id', id)
      .order('uploaded_at', { ascending: false });

    setPhotos(photosData || []);
    setLoading(false);
  };

  // Resolve the campaign ID from operation data or route params
  const resolvedCampaignId = campaignId || operation?.campaigns?.id || operation?.campaign_id;

  const handleBackClick = () => {
    if (resolvedCampaignId) {
      navigate(`/admin/campaigns/${resolvedCampaignId}`);
    } else {
      navigate('/admin/campaigns');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading operation details...</p>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Operation not found</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Campaign Context Header */}
      <CampaignContextHeader />
      
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Breadcrumbs */}
        <CampaignBreadcrumbs additionalItems={[{ label: 'Operation Detail' }]} />
        
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaign
        </Button>

        {/* Operation Header */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {operation.media_assets?.id || 'N/A'}
                </CardTitle>
                <p className="text-muted-foreground">
                  {operation.campaigns?.campaign_name} • {operation.campaigns?.client_name}
                </p>
              </div>
              <Badge className={getStatusColor(operation.status)}>
                {operation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <p className="text-sm font-medium mb-1">Location</p>
                <p className="text-sm text-muted-foreground">
                  {operation.media_assets?.location}
                </p>
                <p className="text-xs text-muted-foreground">
                  {operation.media_assets?.city}, {operation.media_assets?.area}
                </p>
              </div>

              {/* Mounter */}
              <div>
                <p className="text-sm font-medium mb-1">Assigned Mounter</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{operation.mounters?.name || 'N/A'}</p>
                </div>
                {operation.mounters?.phone && (
                  <p className="text-xs text-muted-foreground">
                    {operation.mounters.phone}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <p className="text-sm font-medium mb-1">Timeline</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span>{formatDate(operation.assigned_at)}</span>
                  </div>
                  {operation.check_in_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Check-in:</span>
                      <span>{formatDate(operation.check_in_time)}</span>
                    </div>
                  )}
                  {operation.verified_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span className="text-muted-foreground">Completed:</span>
                      <span>{formatDate(operation.verified_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              {operation.media_assets?.qr_code_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Asset QR Code</p>
                  <img
                    src={operation.media_assets.qr_code_url}
                    alt="QR Code"
                    className="w-32 h-32 border rounded-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(operation.media_assets.qr_code_url, '_blank')}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    View Full Size
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>Proof Photos ({photos.length}/4)</CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <img
                      src={photo.file_path}
                      alt={photo.photo_type}
                      className="w-full aspect-video object-cover rounded-md border"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {photo.photo_type?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(photo.uploaded_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No photos uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
