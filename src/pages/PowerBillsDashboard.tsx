import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Zap, Download, RefreshCw, Lightbulb, Sun, Flame, Settings, Upload, FileSpreadsheet, FileText, BarChart3, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MediaAssetWithBill {
  id: string;
  location: string;
  area: string;
  city: string;
  illumination: string | null;
  service_number: string | null;
  unique_service_number: string | null;
  consumer_name: string | null;
  ero: string | null;
  section_name: string | null;
  latest_bill_amount?: number;
  latest_bill_month?: string;
  payment_status?: string;
}

const getIlluminationIcon = (type: string | null) => {
  if (!type) return <Zap className="h-4 w-4 text-muted-foreground" />;
  
  const lowerType = type.toLowerCase();
  if (lowerType.includes('led')) return <Lightbulb className="h-4 w-4 text-blue-500" />;
  if (lowerType.includes('fluorescent')) return <Sun className="h-4 w-4 text-yellow-500" />;
  if (lowerType.includes('neon')) return <Flame className="h-4 w-4 text-pink-500" />;
  if (lowerType.includes('halogen')) return <Sun className="h-4 w-4 text-orange-500" />;
  return <Zap className="h-4 w-4 text-purple-500" />;
};

export default function PowerBillsDashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<MediaAssetWithBill[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [totalDues, setTotalDues] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  
  // Column visibility state
  const [showColumns, setShowColumns] = useState({
    consumerName: true,
    serviceNumber: true,
    uniqueServiceNumber: false,
    ero: false,
    sectionName: false,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAssetsWithBills();
    }
  }, [isAdmin]);

  const fetchAssetsWithBills = async () => {
    setLoading(true);
    try {
      // Fetch all illumination media assets (assets with power connections)
      const { data: assetsData, error: assetsError } = await supabase
        .from('media_assets')
        .select('id, location, area, city, illumination, service_number, unique_service_number, consumer_name, ero, section_name')
        .not('illumination', 'is', null)
        .neq('illumination', '')
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

  const exportToExcel = () => {
    const exportData = assets.map(asset => ({
      'Asset ID': asset.id,
      'Area': asset.area,
      'Location': asset.location,
      'City': asset.city,
      'Illumination Type': asset.illumination || 'N/A',
      'Consumer Name': asset.consumer_name || 'N/A',
      'Service Number': asset.service_number || 'N/A',
      'Unique Service Number': asset.unique_service_number || 'N/A',
      'ERO': asset.ero || 'N/A',
      'Section Name': asset.section_name || 'N/A',
      'Latest Bill Month': asset.latest_bill_month || 'N/A',
      'Bill Amount': asset.latest_bill_amount || 0,
      'Payment Status': asset.payment_status || 'No Data',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Power Bills');
    XLSX.writeFile(wb, `power-bills-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({
      title: "Success",
      description: "Excel file downloaded successfully",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text('Power Bills Dashboard', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = assets.map(asset => [
      asset.id,
      asset.area,
      asset.location,
      asset.city,
      asset.illumination || 'N/A',
      asset.consumer_name || 'N/A',
      asset.service_number || 'N/A',
      asset.payment_status || 'No Data',
      asset.latest_bill_amount ? `₹${asset.latest_bill_amount}` : '-',
    ]);

    autoTable(doc, {
      head: [['Asset ID', 'Area', 'Location', 'City', 'Illumination', 'Consumer', 'Service No.', 'Status', 'Amount']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`power-bills-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({
      title: "Success",
      description: "PDF file downloaded successfully",
    });
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
          <p className="text-muted-foreground">Manage electricity bills for all illumination assets</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/power-bills-analytics')} variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => navigate('/admin/power-bills-bulk-payment')} variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Bulk Payment
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => navigate('/admin/power-bills/bulk-upload')} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={fetchAssetsWithBills} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
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
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Power Details
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Power Connection Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showColumns.consumerName}
                    onCheckedChange={(checked) => 
                      setShowColumns(prev => ({ ...prev, consumerName: checked }))
                    }
                  >
                    Consumer Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showColumns.serviceNumber}
                    onCheckedChange={(checked) => 
                      setShowColumns(prev => ({ ...prev, serviceNumber: checked }))
                    }
                  >
                    Service Number
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showColumns.uniqueServiceNumber}
                    onCheckedChange={(checked) => 
                      setShowColumns(prev => ({ ...prev, uniqueServiceNumber: checked }))
                    }
                  >
                    Unique Service Number
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showColumns.ero}
                    onCheckedChange={(checked) => 
                      setShowColumns(prev => ({ ...prev, ero: checked }))
                    }
                  >
                    ERO (Revenue Officer)
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showColumns.sectionName}
                    onCheckedChange={(checked) => 
                      setShowColumns(prev => ({ ...prev, sectionName: checked }))
                    }
                  >
                    Section Name
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <TableHead>Illumination</TableHead>
                  {showColumns.serviceNumber && <TableHead>Service No.</TableHead>}
                  {showColumns.uniqueServiceNumber && <TableHead>Unique Service No.</TableHead>}
                  {showColumns.consumerName && <TableHead>Consumer Name</TableHead>}
                  {showColumns.ero && <TableHead>ERO</TableHead>}
                  {showColumns.sectionName && <TableHead>Section Name</TableHead>}
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIlluminationIcon(asset.illumination)}
                        <span className="text-sm">{asset.illumination || 'N/A'}</span>
                      </div>
                    </TableCell>
                    {showColumns.serviceNumber && (
                      <TableCell className="font-mono text-sm">{asset.service_number || '-'}</TableCell>
                    )}
                    {showColumns.uniqueServiceNumber && (
                      <TableCell className="font-mono text-sm">{asset.unique_service_number || '-'}</TableCell>
                    )}
                    {showColumns.consumerName && (
                      <TableCell>{asset.consumer_name || '-'}</TableCell>
                    )}
                    {showColumns.ero && (
                      <TableCell>{asset.ero || '-'}</TableCell>
                    )}
                    {showColumns.sectionName && (
                      <TableCell>{asset.section_name || '-'}</TableCell>
                    )}
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
