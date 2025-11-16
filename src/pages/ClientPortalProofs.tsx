import { useState, useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPortalAccess } from '@/utils/portalAccessLogger';

interface ProofPhoto {
  id: string;
  campaign_id: string;
  campaign_name: string;
  asset_id: string;
  asset_location: string;
  tag: string;
  photo_url: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
}

export default function ClientPortalProofs() {
  const { portalUser } = useClientPortal();
  const { toast } = useToast();
  const [proofs, setProofs] = useState<ProofPhoto[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<ProofPhoto[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ProofPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (portalUser) {
      loadData();
      logPortalAccess(portalUser.client_id, 'view_proof');
    }
  }, [portalUser]);

  useEffect(() => {
    filterProofs();
  }, [proofs, selectedCampaign, searchTerm]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load campaigns for this client
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, campaign_name')
        .eq('client_id', portalUser!.client_id)
        .order('created_at', { ascending: false });

      setCampaigns(campaignsData || []);

      // Load all proof photos for this client's campaigns
      const campaignIds = campaignsData?.map(c => c.id) || [];
      
      if (campaignIds.length > 0) {
        const { data: photosData } = await supabase
          .from('operations_photos')
          .select(`
            id,
            campaign_id,
            asset_id,
            tag,
            photo_url,
            uploaded_at,
            latitude,
            longitude
          `)
          .in('campaign_id', campaignIds)
          .order('uploaded_at', { ascending: false });

        // Enrich with campaign and asset info
        const enrichedProofs = await Promise.all(
          (photosData || []).map(async (photo) => {
            const campaign = campaignsData?.find(c => c.id === photo.campaign_id);
            
            const { data: assetData } = await supabase
              .from('media_assets')
              .select('location')
              .eq('id', photo.asset_id)
              .single();

            return {
              ...photo,
              campaign_name: campaign?.campaign_name || 'Unknown Campaign',
              asset_location: assetData?.location || 'Unknown Location'
            };
          })
        );

        setProofs(enrichedProofs);
      }
    } catch (error) {
      console.error('Error loading proofs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load proof photos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterProofs = () => {
    let filtered = [...proofs];

    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(p => p.campaign_id === selectedCampaign);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.asset_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProofs(filtered);
  };

  const handleDownload = async (proof: ProofPhoto) => {
    try {
      const response = await fetch(proof.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proof.campaign_name}_${proof.asset_id}_${proof.tag}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logPortalAccess(portalUser!.client_id, 'download_proof', 'photo', proof.id);

      toast({
        title: 'Success',
        description: 'Photo downloaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download photo',
        variant: 'destructive'
      });
    }
  };

  const handleBulkDownload = async () => {
    for (const proof of filteredProofs) {
      await handleDownload(proof);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaign Proofs</h1>
        <Button onClick={handleBulkDownload} disabled={filteredProofs.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Download All ({filteredProofs.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Location</label>
              <Input
                placeholder="Search by location or campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading proofs...</div>
      ) : filteredProofs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No proof photos available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProofs.map((proof) => (
            <Card key={proof.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedPhoto(proof)}>
              <div className="aspect-video relative bg-muted">
                <img
                  src={proof.photo_url}
                  alt={proof.tag}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  {proof.tag}
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <p className="font-medium text-sm truncate">{proof.campaign_name}</p>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{proof.asset_location}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(proof.uploaded_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.campaign_name} - {selectedPhoto?.tag}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.tag}
                className="w-full rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Location:</span>
                  <p className="text-muted-foreground">{selectedPhoto.asset_location}</p>
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span>
                  <p className="text-muted-foreground">
                    {new Date(selectedPhoto.uploaded_at).toLocaleString()}
                  </p>
                </div>
                {selectedPhoto.latitude && selectedPhoto.longitude && (
                  <div className="col-span-2">
                    <span className="font-medium">Coordinates:</span>
                    <p className="text-muted-foreground">
                      {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
              <Button onClick={() => handleDownload(selectedPhoto)} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Photo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
