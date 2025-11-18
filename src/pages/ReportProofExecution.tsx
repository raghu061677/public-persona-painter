import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, CheckCircle, Clock } from "lucide-react";
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

interface ProofSummary {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  total_assets: number;
  installed: number;
  proof_uploaded: number;
  verified: number;
  pending: number;
}

export default function ReportProofExecution() {
  const [proofSummaries, setProofSummaries] = useState<ProofSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProofExecution();
  }, []);

  const loadProofExecution = async () => {
    try {
      setLoading(true);

      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name");

      if (campaignsError) throw campaignsError;

      const { data: assets, error: assetsError } = await supabase
        .from("campaign_assets")
        .select("campaign_id, status");

      if (assetsError) throw assetsError;

      const summaries: ProofSummary[] = campaigns?.map(campaign => {
        const campaignAssets = assets?.filter(a => a.campaign_id === campaign.id) || [];
        const installed = campaignAssets.filter(a => a.status === 'Mounted').length;
        const proofUploaded = campaignAssets.filter(a => a.status === 'PhotoUploaded').length;
        const verified = campaignAssets.filter(a => a.status === 'Verified').length;
        const pending = campaignAssets.filter(a => a.status === 'Assigned' || a.status === 'Pending').length;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_name: campaign.client_name,
          total_assets: campaignAssets.length,
          installed,
          proof_uploaded: proofUploaded,
          verified,
          pending,
        };
      }) || [];

      setProofSummaries(summaries);
    } catch (error: any) {
      console.error("Error loading proof execution:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load proof execution data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = proofSummaries.reduce((sum, s) => sum + s.total_assets, 0);
  const totalVerified = proofSummaries.reduce((sum, s) => sum + s.verified, 0);
  const completionRate = totalAssets > 0 ? Math.round((totalVerified / totalAssets) * 100) : 0;

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof-of-Execution Reports</h1>
        <p className="text-muted-foreground">
          Campaign execution and proof photo analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totalVerified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {proofSummaries.reduce((sum, s) => sum + s.pending, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Execution Proof Analytics
          </CardTitle>
          <CardDescription>
            Track installation completion and proof photo submission rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : proofSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Execution reports will appear here once campaigns are active
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total Assets</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead>Proof Uploaded</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proofSummaries.map((summary) => {
                  const progress = summary.total_assets > 0 
                    ? Math.round((summary.verified / summary.total_assets) * 100) 
                    : 0;
                  
                  return (
                    <TableRow key={summary.campaign_id}>
                      <TableCell className="font-medium">{summary.campaign_name}</TableCell>
                      <TableCell>{summary.client_name}</TableCell>
                      <TableCell>{summary.total_assets}</TableCell>
                      <TableCell>{summary.installed}</TableCell>
                      <TableCell>{summary.proof_uploaded}</TableCell>
                      <TableCell>{summary.verified}</TableCell>
                      <TableCell>
                        {progress === 100 ? (
                          <Badge variant="default">Complete</Badge>
                        ) : progress > 50 ? (
                          <Badge variant="secondary">In Progress</Badge>
                        ) : (
                          <Badge variant="outline">Started</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
