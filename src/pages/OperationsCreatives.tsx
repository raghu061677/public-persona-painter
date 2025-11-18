import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Upload, Download, Eye, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

interface Creative {
  id: string;
  campaign_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
  };
}

export default function OperationsCreatives() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCreatives();
  }, []);

  const loadCreatives = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_creatives")
        .select(`
          *,
          campaigns (
            campaign_name,
            client_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error: any) {
      console.error("Error loading creatives:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load creatives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creative Assets</h1>
        <p className="text-muted-foreground">
          Track client creatives for campaign execution
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Creative Submissions
          </CardTitle>
          <CardDescription>
            Monitor creative asset submissions from clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : creatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No creative assets yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Client creative submissions will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatives.map((creative) => (
                  <TableRow key={creative.id}>
                    <TableCell className="font-medium">{creative.file_name}</TableCell>
                    <TableCell>{creative.campaigns?.campaign_name}</TableCell>
                    <TableCell>{creative.campaigns?.client_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{creative.file_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(creative.file_size)}
                    </TableCell>
                    <TableCell>{getStatusBadge(creative.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(creative.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(creative.file_url, "_blank")}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(creative.file_url, "_blank")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
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
