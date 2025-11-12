import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PowerBillFetchDialog } from "@/components/media-assets/PowerBillFetchDialog";
import { PayBillButton } from "@/components/power-bills/PayBillButton";
import { UploadReceiptDialog } from "@/components/power-bills/UploadReceiptDialog";
import { FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface AssetPowerBillsTabProps {
  assetId: string;
  asset?: any;
  isAdmin?: boolean;
}

export function AssetPowerBillsTab({ assetId, asset, isAdmin }: AssetPowerBillsTabProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  useEffect(() => {
    fetchPowerBills();
  }, [assetId]);

  const fetchPowerBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_power_bills')
        .select('*')
        .eq('asset_id', assetId)
        .order('bill_month', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching power bills:', error);
      toast({
        title: "Error",
        description: "Failed to load power bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadDialog = (bill: any) => {
    setSelectedBill(bill);
    setUploadDialogOpen(true);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'destructive';
      case 'Overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading power bills...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Power Bills</CardTitle>
            <CardDescription>
              {asset?.service_number ? (
                <>Service Number: <span className="font-mono font-semibold">{asset.service_number}</span></>
              ) : (
                "No service number configured"
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <PowerBillFetchDialog 
              assetId={assetId}
              asset={asset}
              defaultServiceNumber={asset?.unique_service_number || asset?.service_number}
              onBillFetched={fetchPowerBills}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No power bills found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Current Bill</TableHead>
                <TableHead>Arrears</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">
                    {bill.bill_date ? format(new Date(bill.bill_date), 'dd MMM yyyy') : 
                     format(new Date(bill.bill_month), 'MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    {bill.due_date ? format(new Date(bill.due_date), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell>{bill.units || 0}</TableCell>
                  <TableCell>₹{(bill.current_month_bill || bill.bill_amount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {bill.arrears ? (
                      <span className="text-destructive">₹{bill.arrears.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{(bill.total_due || 0).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusColor(bill.payment_status)}>
                      {bill.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {bill.payment_status === 'Pending' && (
                        <>
                          <PayBillButton
                            billId={bill.id}
                            assetId={assetId}
                            amount={bill.total_due || bill.bill_amount || 0}
                            consumerName={bill.consumer_name}
                            serviceNumber={bill.service_number}
                            uniqueServiceNumber={bill.unique_service_number}
                            onPaymentSuccess={fetchPowerBills}
                            size="sm"
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenUploadDialog(bill)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Receipt
                          </Button>
                        </>
                      )}
                      {bill.paid_receipt_url && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.open(bill.paid_receipt_url, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Receipt
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

      {selectedBill && (
        <UploadReceiptDialog
          billId={selectedBill.id}
          serviceNumber={selectedBill.service_number}
          billAmount={selectedBill.bill_amount}
          billMonth={selectedBill.bill_month}
          assetId={assetId}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={fetchPowerBills}
        />
      )}
    </Card>
  );
}
