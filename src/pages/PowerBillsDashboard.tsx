import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Zap, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MediaAssetWithBill {
  id: string;
  location: string;
  area: string;
  city: string;
  service_number: string | null;
  consumer_name: string | null;
  latest_bill_amount?: number;
  latest_bill_month?: string;
  payment_status?: string;
}

export default function PowerBillsDashboard() {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<MediaAssetWithBill[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [totalDues, setTotalDues] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      fetchAssetsWithBills();
    }
  }, [isAdmin]);

  const fetchAssetsWithBills = async () => {
    setLoading(true);
    try {
      // Fetch all media assets with service numbers
      const { data: assetsData, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, location, area, city, service_number, consumer_name')
        .not('service_number', 'is', null)
        .order('city', { ascending: true });

      if (assetsError) throw assetsError;

      // Fetch latest bills for these assets
      const { data: billsData, error: billsError } = await supabase
        .from('asset_power_bills')
        .select('asset_id, bill_amount, bill_month, payment_status')
        .order('bill_month', { ascending: false });

      if (billsError) throw billsError;

      // Map latest bills to assets
      const billsByAsset = new Map();
      billsData?.forEach(bill => {
        if (!billsByAsset.has(bill.asset_id)) {
          billsByAsset.set(bill.asset_id, bill);
        }
      });

      const assetsWithBills = assetsData?.map(asset => {
        const latestBill = billsByAsset.get(asset.id);
        return {
          ...asset,
          latest_bill_amount: latestBill?.bill_amount,
          latest_bill_month: latestBill?.bill_month,
          payment_status: latestBill?.payment_status,
        };
      }) || [];

      setAssets(assetsWithBills);
      setTotalAssets(assetsWithBills.length);
      
      // Calculate total dues (pending bills only)
      const dues = assetsWithBills.reduce((sum, asset) => {
        if (asset.payment_status === 'Pending' && asset.latest_bill_amount) {
          return sum + asset.latest_bill_amount;
        }
        return sum;
      }, 0);
      setTotalDues(dues);

    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Error",
        description: "Failed to load assets with power bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assets.map(a => a.id)));
    } else {
      setSelectedAssets(new Set());
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleBulkFetch = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: "No Assets Selected",
        description: "Please select at least one asset to fetch bills",
        variant: "destructive",
      });
      return;
    }

    setFetching(true);
    let successCount = 0;
    let failCount = 0;

    for (const assetId of selectedAssets) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset || !asset.service_number) {
        failCount++;
        continue;
      }

      try {
        const { data, error } = await supabase.functions.invoke('fetch-tgspdcl-bill', {
          body: { 
            serviceNumber: asset.service_number,
            assetId: asset.id
          }
        });

        if (error) {
          failCount++;
          console.error(`Failed to fetch bill for ${asset.id}:`, error);
        } else if (data?.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`Error fetching bill for ${asset.id}:`, error);
      }
    }

    setFetching(false);
    
    toast({
      title: "Bulk Fetch Complete",
      description: `Successfully fetched ${successCount} bills. ${failCount} failed.`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    // Refresh the list
    await fetchAssetsWithBills();
    setSelectedAssets(new Set());
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Power Bills Dashboard</h2>
          <p className="text-muted-foreground">Manage electricity bills for all media assets</p>
        </div>
        <Button onClick={fetchAssetsWithBills} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">with service numbers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dues</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDues.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Assets</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedAssets.size}</div>
            <p className="text-xs text-muted-foreground">ready for bulk fetch</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assets with Power Connections</CardTitle>
              <CardDescription>Select assets to fetch bills in bulk</CardDescription>
            </div>
            <Button 
              onClick={handleBulkFetch} 
              disabled={selectedAssets.size === 0 || fetching}
            >
              {fetching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Fetch Bills ({selectedAssets.size})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading assets...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedAssets.size === assets.length && assets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Service No.</TableHead>
                  <TableHead>Consumer Name</TableHead>
                  <TableHead>Latest Bill</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={(checked) => 
                          handleSelectAsset(asset.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{asset.id}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.city}</TableCell>
                    <TableCell className="font-mono text-sm">{asset.service_number}</TableCell>
                    <TableCell>{asset.consumer_name || '-'}</TableCell>
                    <TableCell>{asset.latest_bill_month || '-'}</TableCell>
                    <TableCell>
                      {asset.latest_bill_amount 
                        ? `₹${asset.latest_bill_amount.toLocaleString('en-IN')}` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {asset.payment_status ? (
                        <Badge variant={asset.payment_status === 'Paid' ? 'default' : 'destructive'}>
                          {asset.payment_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Data</Badge>
                      )}
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
