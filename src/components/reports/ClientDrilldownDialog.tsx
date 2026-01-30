import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Phone,
  Mail,
  Building2,
  FileText,
  MapPin,
  Calendar,
  TrendingUp,
  Camera,
  Download,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/mediaAssets";

interface ClientDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  dateRange?: { from: Date; to: Date };
}

interface ClientDetails {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  gst_number: string;
  address: string;
}

interface CampaignData {
  id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_assets: number;
  grand_total: number;
  city?: string;
  area?: string;
}

interface AssetData {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  direction: string;
  card_rate: number;
  status: string;
  campaign_name: string;
  booking_start: string;
  booking_end: string;
}

interface ProofData {
  campaign_id: string;
  campaign_name: string;
  total_assets: number;
  proof_uploaded: number;
  verified: number;
  pending: number;
  latest_upload?: string;
}

export function ClientDrilldownDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  dateRange,
}: ClientDrilldownDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [proofData, setProofData] = useState<ProofData[]>([]);

  useEffect(() => {
    if (open && clientId) {
      loadClientData();
    }
  }, [open, clientId, dateRange]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      // Load client details
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      
      if (client) {
        setClientDetails({
          id: client.id,
          name: client.name,
          company: client.company || "",
          email: client.email || "",
          phone: client.phone || "",
          gst_number: client.gst_number || "",
          address: client.address || "",
        });
      }

      // Load campaigns with date filter
      let campaignQuery = supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });

      if (dateRange?.from && dateRange?.to) {
        campaignQuery = campaignQuery
          .lte("start_date", dateRange.to.toISOString().split("T")[0])
          .gte("end_date", dateRange.from.toISOString().split("T")[0]);
      }

      const { data: campaignData } = await campaignQuery;
      
      const formattedCampaigns: CampaignData[] = (campaignData || []).map(c => ({
        id: c.id,
        campaign_name: c.campaign_name,
        start_date: c.start_date,
        end_date: c.end_date,
        status: c.status,
        total_assets: c.total_assets || 0,
        grand_total: c.grand_total || 0,
      }));
      setCampaigns(formattedCampaigns);

      // Load assets from those campaigns
      if (formattedCampaigns.length > 0) {
        const campaignIds = formattedCampaigns.map(c => c.id);
        const { data: assetData } = await supabase
          .from("campaign_assets")
          .select("*, campaigns!campaign_assets_campaign_id_fkey(campaign_name)")
          .in("campaign_id", campaignIds);

        const formattedAssets: AssetData[] = (assetData || []).map(a => ({
          id: a.id,
          asset_id: a.asset_id,
          location: a.location,
          city: a.city,
          area: a.area,
          media_type: a.media_type,
          direction: a.direction || "",
          card_rate: a.card_rate,
          status: a.status,
          campaign_name: a.campaigns?.campaign_name || "",
          booking_start: a.booking_start_date || a.start_date || "",
          booking_end: a.booking_end_date || a.end_date || "",
        }));
        setAssets(formattedAssets);

        // Calculate proof data
        const proofByCamera: ProofData[] = formattedCampaigns.map(c => {
          const campAssets = (assetData || []).filter(a => a.campaign_id === c.id);
          const verified = campAssets.filter(a => a.status === "Verified" || a.status === "Completed").length;
          const uploaded = campAssets.filter(a => a.status === "PhotoUploaded" || a.status === "Mounted").length;
          const pending = campAssets.filter(a => a.status === "Pending" || a.status === "Assigned").length;
          
          return {
            campaign_id: c.id,
            campaign_name: c.campaign_name,
            total_assets: campAssets.length,
            proof_uploaded: uploaded + verified,
            verified,
            pending,
          };
        });
        setProofData(proofByCamera);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = campaigns.reduce((sum, c) => sum + c.grand_total, 0);
  const totalAssets = assets.length;
  const activeCampaigns = campaigns.filter(c => 
    c.status === "InProgress" || c.status === "Running" || c.status === "Active"
  ).length;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      InProgress: { variant: "default", label: "Running" },
      Running: { variant: "default", label: "Running" },
      Active: { variant: "default", label: "Active" },
      Planned: { variant: "secondary", label: "Planned" },
      Upcoming: { variant: "secondary", label: "Upcoming" },
      Completed: { variant: "outline", label: "Completed" },
      Cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusMap[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {clientName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">
              Campaigns ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="proof">Proof Status</TabsTrigger>
            <TabsTrigger value="assets">
              Assets ({assets.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                <TabsContent value="overview" className="m-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Client Details Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Client Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{clientDetails?.company || clientName}</span>
                        </div>
                        {clientDetails?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{clientDetails.email}</span>
                          </div>
                        )}
                        {clientDetails?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{clientDetails.phone}</span>
                          </div>
                        )}
                        {clientDetails?.gst_number && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>GST: {clientDetails.gst_number}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Summary Stats Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Booking Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Campaigns</p>
                            <p className="text-2xl font-bold">{campaigns.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Active Now</p>
                            <p className="text-2xl font-bold text-emerald-600">{activeCampaigns}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Assets Booked</p>
                            <p className="text-2xl font-bold">{totalAssets}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Cities/Areas */}
                  {assets.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-base">Top Booking Locations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(assets.map(a => a.city))].slice(0, 5).map(city => (
                            <Badge key={city} variant="secondary">
                              <MapPin className="h-3 w-3 mr-1" />
                              {city} ({assets.filter(a => a.city === city).length})
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Campaigns Tab */}
                <TabsContent value="campaigns" className="m-0">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No campaigns found in selected date range
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign ID</TableHead>
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Assets</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow 
                            key={campaign.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/admin/campaigns/view/${campaign.id}`);
                            }}
                          >
                            <TableCell className="font-mono text-sm">
                              {campaign.id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {campaign.campaign_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {new Date(campaign.start_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(campaign.end_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{campaign.total_assets}</TableCell>
                            <TableCell>{formatCurrency(campaign.grand_total)}</TableCell>
                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                            <TableCell>
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Proof Status Tab */}
                <TabsContent value="proof" className="m-0">
                  {proofData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No proof data available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proofData.map((proof) => (
                        <Card key={proof.campaign_id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{proof.campaign_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {proof.total_assets} assets total
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">{proof.verified} verified</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Camera className="h-4 w-4" />
                                  <span className="text-sm">{proof.proof_uploaded} uploaded</span>
                                </div>
                                {proof.pending > 0 && (
                                  <div className="flex items-center gap-1 text-amber-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">{proof.pending} pending</span>
                                  </div>
                                )}
                              </div>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Download PPT
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Assets Tab */}
                <TabsContent value="assets" className="m-0">
                  {assets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No assets booked in selected date range
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Media Type</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Booking Period</TableHead>
                          <TableHead>Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-sm">
                              {asset.asset_id}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <div>
                                  <div>{asset.location}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {asset.city}, {asset.area}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction}</TableCell>
                            <TableCell>{asset.media_type}</TableCell>
                            <TableCell className="text-sm">{asset.campaign_name}</TableCell>
                            <TableCell className="text-sm">
                              {asset.booking_start && asset.booking_end ? (
                                <>
                                  {new Date(asset.booking_start).toLocaleDateString()} -{" "}
                                  {new Date(asset.booking_end).toLocaleDateString()}
                                </>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(asset.card_rate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
