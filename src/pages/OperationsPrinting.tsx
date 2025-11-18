import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, MapPin, Calendar } from "lucide-react";
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

interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  printing_charges: number | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
    start_date: string;
  };
}

export default function OperationsPrinting() {
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPrintingQueue();
  }, []);

  const loadPrintingQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          campaigns (
            campaign_name,
            client_name,
            start_date
          )
        `)
        .in("status", ["Assigned", "Pending"])
        .order("campaigns(start_date)", { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error("Error loading printing queue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load printing queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge variant="secondary">Ready for Print</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "installed":
        return <Badge variant="default">Installed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Printing Status</h1>
        <p className="text-muted-foreground">
          Monitor printing progress for campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Printing Queue ({assets.length})
          </CardTitle>
          <CardDescription>
            Track printing status for all active campaigns
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
              <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No printing jobs in queue</p>
              <p className="text-sm text-muted-foreground mt-2">
                Printing tasks will appear here once campaigns start
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Asset Location</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Printing Cost</TableHead>
                  <TableHead>Status</TableHead>
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
                      <Badge variant="outline">{asset.media_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(asset.campaigns?.start_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.printing_charges
                        ? `₹${asset.printing_charges.toLocaleString()}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
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
