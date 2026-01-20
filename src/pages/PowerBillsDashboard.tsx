import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Zap, Download, RefreshCw, Lightbulb, Sun, Flame, Settings, Upload, FileSpreadsheet, FileText, BarChart3, CreditCard, Calendar, Clock, Play } from "lucide-react";
import { UploadReceiptDialog } from "@/components/power-bills/UploadReceiptDialog";
import { PowerBillsAnalyticsChart } from "@/components/power-bills/PowerBillsAnalyticsChart";
import { PowerBillFetchDialog } from "@/components/media-assets/PowerBillFetchDialog";
import { BulkBillImportDialog } from "@/components/power-bills/BulkBillImportDialog";
import { useState as useDialogState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AnomalyBadge } from "@/components/power-bills/AnomalyBadge";
import { BillJobsMonitor } from "@/components/power-bills/BillJobsMonitor";
import PowerBillKPIs from "@/components/power-bills/PowerBillKPIs";
import SixMonthChart from "@/components/power-bills/SixMonthChart";
import UnpaidBillsTable from "@/components/power-bills/UnpaidBillsTable";
import { BookmarkletInstructions } from "@/components/power-bills/BookmarkletInstructions";
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
  media_asset_code: string | null;
  location: string;
  area: string;
  city: string;
  illumination_type: string | null;
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
  const [aggregates, setAggregates] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  
  // Column visibility state
  const [showColumns, setShowColumns] = useState({
    consumerName: true,
    serviceNumber: true,
    uniqueServiceNumber: false,
    ero: false,
    sectionName: false,
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useDialogState(false);
  const [selectedBillAsset, setSelectedBillAsset] = useDialogState<any>(null);
  const [triggeringJob, setTriggeringJob] = useState(false);

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
        .select('id, media_asset_code, location, area, city, illumination_type, service_number, unique_service_number, consumer_name, ero, section_name')
        .not('illumination_type', 'is', null)
        .neq('illumination_type', '')
        .order('city', { ascending: true });

      if (assetsError) throw assetsError;

      // Fetch bills for last 6 months with full details
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: billsData, error: billsError } = await supabase
        .from('asset_power_bills')
        .select('*')
        .gte('bill_month', sixMonthsAgo.toISOString().split('T')[0])
        .order('bill_month', { ascending: false });

      if (billsError) throw billsError;

      // Map latest bills to assets
      const billsByAsset = new Map();
      billsData?.forEach((bill) => {
        if (!billsByAsset.has(bill.asset_id)) {
          billsByAsset.set(bill.asset_id, bill);
        }
      });

      // Fast lookup for asset metadata (for fallback fields in bills)
      const assetsById = new Map<string, (typeof assetsData)[number]>();
      assetsData?.forEach((a) => assetsById.set(a.id, a));

      // Calculate aggregates
      let totalDue = 0;
      let paidCount = 0;
      let unpaidCount = 0;
      let totalPaidAmount = 0;
      let pendingCount = 0;

      const assetsWithBills =
        assetsData?.map((asset) => {
          const latestBill = billsByAsset.get(asset.id);
          if (latestBill) {
            if (latestBill.payment_status === "Paid") {
              paidCount++;
              totalPaidAmount += latestBill.total_due || 0;
            } else if (latestBill.payment_status === "Pending") {
              unpaidCount++;
              totalDue += latestBill.total_due || 0;
              pendingCount++;
            }
          }
          return {
            ...asset,
            latest_bill_amount: latestBill?.bill_amount,
            latest_bill_month: latestBill?.bill_month,
            payment_status: latestBill?.payment_status,
          };
        }) || [];

      // Compute monthly aggregates for chart
      const monthlyMap = new Map<string, any>();
      billsData?.forEach((bill: any) => {
        if (!bill.bill_month) return;
        const month = bill.bill_month.substring(0, 7); // YYYY-MM

        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            monthLabel: month,
            totalAmount: 0,
            paidAmount: 0,
            unpaidAmount: 0,
            billCount: 0,
          });
        }

        const entry = monthlyMap.get(month);
        entry.billCount++;
        entry.totalAmount += bill.total_due || 0;

        if (bill.payment_status === "Paid") {
          entry.paidAmount += bill.total_due || 0;
        } else {
          entry.unpaidAmount += bill.total_due || 0;
        }
      });

      const monthlyDataArray = Array.from(monthlyMap.values())
        .sort((a, b) => a.monthLabel.localeCompare(b.monthLabel))
        .slice(-6); // Last 6 months

      // Get unpaid bills for table
      // Notes:
      // - Exclude zero-amount placeholder rows (total_due/bill_amount = 0)
      // - Fallback consumer/service details from the asset master when bill row is missing them
      // - Ignore bill rows whose asset_id doesn't exist in the asset master (avoids orphan/dirty imports)
      const unpaid = (billsData || [])
        .filter((b: any) => (b.payment_status || "Pending") !== "Paid")
        .filter((b: any) => assetsById.has(b.asset_id))
        .map((b: any) => {
          const a = assetsById.get(b.asset_id);
          return {
            ...b,
            asset_id: a?.media_asset_code || b.asset_id,
            consumer_name: b.consumer_name || a?.consumer_name || null,
            service_number: b.service_number || a?.service_number || null,
            ero_name: b.ero_name || a?.ero || null,
            section_name: b.section_name || a?.section_name || null,
          };
        })
        .filter((b: any) => ((b.total_due ?? b.bill_amount ?? 0) as number) > 0);

      setAssets(assetsWithBills);
      setTotalAssets(assetsWithBills.length);
      setTotalDues(totalDue);
      setAggregates({
        totalBills: billsData?.length || 0,
        paidBills: paidCount,
        unpaidBills: unpaidCount,
        totalAmountDue: totalDue,
        totalPaidAmount,
        pendingCount,
      });
      setMonthlyData(monthlyDataArray);
      setUnpaidBills(unpaid);

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
      'Asset ID': asset.media_asset_code || asset.id,
      'Area': asset.area,
      'Location': asset.location,
      'City': asset.city,
      'Illumination Type': asset.illumination_type || 'N/A',
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

  const handleTriggerMonthlyJob = async () => {
    setTriggeringJob(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-monthly-power-bills');
      
      if (error) throw error;
      
      toast({
        title: "Job Triggered",
        description: `Monthly bill fetch started. ${data?.summary?.successCount || 0} bills fetched successfully.`,
      });
      
      // Refresh the dashboard after a delay
      setTimeout(() => {
        fetchAssetsWithBills();
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering job:', error);
      toast({
        title: "Error",
        description: "Failed to trigger monthly bill fetch job",
        variant: "destructive",
      });
    } finally {
      setTriggeringJob(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text('Power Bills Dashboard', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = assets.map(asset => [
      asset.media_asset_code || asset.id,
      asset.area,
      asset.location,
      asset.city,
      asset.illumination_type || 'N/A',
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
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate('/admin/power-bills-analytics')} variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => navigate('/admin/power-bills-bulk-payment')} variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Bulk Payment
          </Button>
          <Button onClick={() => navigate('/admin/power-bills/reconciliation')} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Reconciliation
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
          <Button 
            onClick={() => window.open('/mobile/power-bills', '_blank')} 
            variant="outline" 
            size="sm"
            className="md:hidden"
          >
            <Zap className="h-4 w-4 mr-2" />
            Mobile View
          </Button>
          <Button onClick={fetchAssetsWithBills} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <PowerBillKPIs loading={loading} aggregates={aggregates} />

      {/* Bookmarklet Instructions */}
      <BookmarkletInstructions />

      {/* Analytics Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SixMonthChart data={monthlyData} />
        <UnpaidBillsTable bills={unpaidBills} />
      </div>

      {/* Automation Schedule Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Automated Bill Fetching
              </CardTitle>
              <CardDescription>
                Bills are automatically fetched and reminders sent on schedule
              </CardDescription>
            </div>
            <Button 
              onClick={handleTriggerMonthlyJob}
              disabled={triggeringJob}
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {triggeringJob ? "Running..." : "Trigger Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                <div className="p-2 rounded-md bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Monthly Bill Fetch</p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Runs on 28th-31st of every month at 8:30 PM UTC
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically fetches bills for all assets with service numbers
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                <div className="p-2 rounded-md bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Daily Reminders</p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Runs daily at 3:30 AM UTC (9:00 AM IST)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sends email notifications for pending and overdue bills
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  What Happens Automatically?
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Fetches bills from TSSPDCL for all illuminated assets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Stores bill details (units, amounts, due dates) in database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Sends summary email with success/failure report</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Triggers payment reminders for bills due in 3 and 7 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Escalates overdue bills with increasing urgency levels</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Chart */}
      <PowerBillsAnalyticsChart />

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
              <BulkBillImportDialog onImportComplete={fetchAssetsWithBills} />
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium"
                        onClick={() => navigate(`/admin/media-assets/${asset.media_asset_code || asset.id}`)}
                      >
                        {asset.media_asset_code || asset.id}
                      </Button>
                    </TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.city}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIlluminationIcon(asset.illumination_type)}
                        <span className="text-sm">{asset.illumination_type || 'N/A'}</span>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <PowerBillFetchDialog
                          assetId={asset.id}
                          asset={asset}
                          defaultServiceNumber={asset.unique_service_number || asset.service_number}
                          onBillFetched={fetchAssetsWithBills}
                        />
                        {asset.latest_bill_amount && asset.payment_status === 'Pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBillAsset(asset);
                              setUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
        </TableBody>
      </Table>
        )}
      </CardContent>
    </Card>

    {selectedBillAsset && (
      <UploadReceiptDialog
        billId={selectedBillAsset.id}
        serviceNumber={selectedBillAsset.service_number || ''}
        billAmount={selectedBillAsset.latest_bill_amount || 0}
        billMonth={selectedBillAsset.latest_bill_month || ''}
        assetId={selectedBillAsset.id}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={fetchAssetsWithBills}
      />
    )}
  </div>
);
}
