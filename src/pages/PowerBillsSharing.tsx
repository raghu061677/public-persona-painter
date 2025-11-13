import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Zap, DollarSign, Settings, AlertCircle, Link2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SharedConnection {
  unique_service_number: string;
  consumer_name: string;
  assets: Array<{
    asset_id: string;
    share_percentage: number;
    area?: string;
    location?: string;
  }>;
  total_monthly_bill?: number;
  last_bill_date?: string;
}

interface BillSharingConfig {
  primaryAssetId: string;
  sharedAssets: Array<{
    asset_id: string;
    share_percentage: number;
  }>;
}

export default function PowerBillsSharing() {
  const [sharedConnections, setSharedConnections] = useState<SharedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUSN, setEditingUSN] = useState<string | null>(null);
  const [sharingConfig, setSharingConfig] = useState<BillSharingConfig | null>(null);

  useEffect(() => {
    fetchSharedConnections();
  }, []);

  const fetchSharedConnections = async () => {
    setLoading(true);
    try {
      // Find all unique service numbers that are shared across multiple assets
      const { data: assets, error: assetsError } = await supabase
        .from("media_assets")
        .select("id, unique_service_number, consumer_name, area, location")
        .not("unique_service_number", "is", null);

      if (assetsError) throw assetsError;

      // Group assets by USN
      const groupedByUSN = (assets || []).reduce((acc: any, asset) => {
        const usn = asset.unique_service_number;
        if (!acc[usn]) {
          acc[usn] = {
            unique_service_number: usn,
            consumer_name: asset.consumer_name,
            assets: [],
          };
        }
        acc[usn].assets.push({
          asset_id: asset.id,
          share_percentage: 0, // Will be fetched from bills
          area: asset.area,
          location: asset.location,
        });
        return acc;
      }, {});

      // Filter only shared connections (2+ assets)
      const shared = Object.values(groupedByUSN).filter(
        (group: any) => group.assets.length > 1
      ) as SharedConnection[];

      // Fetch latest bill info for each shared connection
      for (const connection of shared) {
        const { data: billData } = await supabase
          .from("asset_power_bills")
          .select("bill_amount, bill_date, shared_with_assets, is_primary_bill")
          .eq("unique_service_number", connection.unique_service_number)
          .eq("is_primary_bill", true)
          .order("bill_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (billData) {
          connection.total_monthly_bill = billData.bill_amount;
          connection.last_bill_date = billData.bill_date;

          // Update share percentages from bill data
          if (billData.shared_with_assets && Array.isArray(billData.shared_with_assets)) {
            const sharingMap = new Map(
              billData.shared_with_assets.map((s: any) => [s.asset_id, s.share_percentage])
            );
            connection.assets.forEach((asset) => {
              asset.share_percentage = sharingMap.get(asset.asset_id) || 0;
            });
          } else {
            // Default: equal split
            const equalShare = 100 / connection.assets.length;
            connection.assets.forEach((asset) => {
              asset.share_percentage = equalShare;
            });
          }
        }
      }

      setSharedConnections(shared);
    } catch (error) {
      console.error("Error fetching shared connections:", error);
      toast({
        title: "Error",
        description: "Failed to load shared power connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSharing = (connection: SharedConnection) => {
    const primaryAsset = connection.assets[0];
    setSharingConfig({
      primaryAssetId: primaryAsset.asset_id,
      sharedAssets: connection.assets.map((a) => ({
        asset_id: a.asset_id,
        share_percentage: a.share_percentage || 100 / connection.assets.length,
      })),
    });
    setEditingUSN(connection.unique_service_number);
  };

  const updateSharePercentage = (assetId: string, percentage: number) => {
    if (!sharingConfig) return;
    
    setSharingConfig({
      ...sharingConfig,
      sharedAssets: sharingConfig.sharedAssets.map((a) =>
        a.asset_id === assetId ? { ...a, share_percentage: percentage } : a
      ),
    });
  };

  const handleSaveSharing = async () => {
    if (!sharingConfig || !editingUSN) return;

    try {
      const totalPercentage = sharingConfig.sharedAssets.reduce(
        (sum, a) => sum + a.share_percentage,
        0
      );

      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Invalid Split",
          description: "Total share percentages must equal 100%",
          variant: "destructive",
        });
        return;
      }

      // Update all primary bills for this USN with new sharing config
      const { error } = await supabase
        .from("asset_power_bills")
        .update({
          shared_with_assets: sharingConfig.sharedAssets,
        })
        .eq("unique_service_number", editingUSN)
        .eq("is_primary_bill", true);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sharing configuration updated successfully",
      });

      setEditingUSN(null);
      setSharingConfig(null);
      fetchSharedConnections();
    } catch (error) {
      console.error("Error saving sharing config:", error);
      toast({
        title: "Error",
        description: "Failed to update sharing configuration",
        variant: "destructive",
      });
    }
  };

  const getTotalSharedAmount = () => {
    return sharedConnections.reduce(
      (sum, conn) => sum + (conn.total_monthly_bill || 0),
      0
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Power Bill Sharing</h2>
          <p className="text-muted-foreground">
            Manage shared power connections across multiple assets
          </p>
        </div>
        <Button onClick={fetchSharedConnections} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Connections</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedConnections.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique service numbers with multiple assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets Sharing</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedConnections.reduce((sum, conn) => sum + conn.assets.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets connected to shared power sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalSharedAmount())}</div>
            <p className="text-xs text-muted-foreground">
              Combined cost of all shared connections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      {sharedConnections.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure sharing percentages to automatically split power bill expenses across
            multiple assets. The total must equal 100%.
          </AlertDescription>
        </Alert>
      )}

      {/* Shared Connections List */}
      <div className="space-y-4">
        {sharedConnections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Shared Connections Found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                No assets are currently sharing power connections. Shared connections are
                detected when multiple assets have the same Unique Service Number.
              </p>
            </CardContent>
          </Card>
        ) : (
          sharedConnections.map((connection) => (
            <Card key={connection.unique_service_number}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      USN: {connection.unique_service_number}
                    </CardTitle>
                    <CardDescription>
                      Consumer: {connection.consumer_name || "N/A"}
                    </CardDescription>
                    {connection.last_bill_date && (
                      <p className="text-sm text-muted-foreground">
                        Latest Bill: {format(new Date(connection.last_bill_date), "MMMM yyyy")} -{" "}
                        {formatCurrency(connection.total_monthly_bill || 0)}
                      </p>
                    )}
                  </div>
                  <Dialog open={editingUSN === connection.unique_service_number} onOpenChange={(open) => {
                    if (!open) {
                      setEditingUSN(null);
                      setSharingConfig(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureSharing(connection)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Split
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure Sharing Split</DialogTitle>
                        <DialogDescription>
                          Set the percentage each asset contributes to the total power bill. Total
                          must equal 100%.
                        </DialogDescription>
                      </DialogHeader>
                      {sharingConfig && (
                        <div className="space-y-4">
                          {sharingConfig.sharedAssets.map((asset, idx) => (
                            <div key={asset.asset_id} className="flex items-center gap-4">
                              <Label className="w-32 text-sm font-medium">{asset.asset_id}</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={asset.share_percentage}
                                onChange={(e) =>
                                  updateSharePercentage(asset.asset_id, parseFloat(e.target.value) || 0)
                                }
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                              {connection.total_monthly_bill && (
                                <span className="text-sm font-medium ml-auto">
                                  {formatCurrency(
                                    (connection.total_monthly_bill * asset.share_percentage) / 100
                                  )}
                                </span>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <span className="font-semibold">Total:</span>
                            <span
                              className={`font-bold ${
                                Math.abs(
                                  sharingConfig.sharedAssets.reduce(
                                    (sum, a) => sum + a.share_percentage,
                                    0
                                  ) - 100
                                ) > 0.01
                                  ? "text-destructive"
                                  : "text-primary"
                              }`}
                            >
                              {sharingConfig.sharedAssets.reduce(
                                (sum, a) => sum + a.share_percentage,
                                0
                              ).toFixed(1)}%
                            </span>
                          </div>
                          <Button onClick={handleSaveSharing} className="w-full">
                            Save Configuration
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Share %</TableHead>
                      <TableHead className="text-right">Monthly Split</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connection.assets.map((asset) => (
                      <TableRow key={asset.asset_id}>
                        <TableCell className="font-medium">{asset.asset_id}</TableCell>
                        <TableCell>
                          {asset.area && asset.location
                            ? `${asset.area}, ${asset.location}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {asset.share_percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {connection.total_monthly_bill
                            ? formatCurrency(
                                (connection.total_monthly_bill * asset.share_percentage) / 100
                              )
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
