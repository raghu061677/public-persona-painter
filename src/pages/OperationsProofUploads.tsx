import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface ProofAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  photos: any;
  mounter_name: string | null;
  completed_at: string | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
  };
}

export default function OperationsProofUploads() {
  const [assets, setAssets] = useState<ProofAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProofUploads();
  }, []);

  const loadProofUploads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          campaigns (
            campaign_name,
            client_name
          )
        `)
        .not("photos", "is", null)
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error("Error loading proof uploads:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load proof uploads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const countPhotos = (photos: any) => {
    if (!photos) return 0;
    const photoObj = typeof photos === "string" ? JSON.parse(photos) : photos;
    return Object.keys(photoObj).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case "proof_uploaded":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case "installed":
        return <Badge variant="outline">Installed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof Photo Uploads</h1>
        <p className="text-muted-foreground">
          Review and manage installation proof photos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Proof Photo Gallery ({assets.length})
          </CardTitle>
          <CardDescription>
            View all uploaded proof photos for campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No proof photos uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Installation proof photos will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Asset Location</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Mounter</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      {asset.campaigns?.campaign_name}
                    </TableCell>
                    <TableCell>{asset.campaigns?.client_name}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div className="text-sm">
                          <div>{asset.location}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.area}, {asset.city}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {countPhotos(asset.photos)} photos
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {asset.mounter_name || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.completed_at
                        ? new Date(asset.completed_at).toLocaleDateString()
                        : "Pending"}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          (window.location.href = `/admin/campaigns/${asset.campaign_id}`)
                        }
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
