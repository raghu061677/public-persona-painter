import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FetchBillButton } from "@/components/power-bills/FetchBillButton";
import { PayBillButton } from "@/components/power-bills/PayBillButton";
import { UploadReceiptDialog } from "@/components/power-bills/UploadReceiptDialog";
import { Upload } from "lucide-react";
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
            <FetchBillButton 
              assetId={assetId}
              serviceNumber={asset?.service_number}
              uniqueServiceNumber={asset?.unique_service_number}
              onSuccess={fetchPowerBills}
            />
            <PayBillButton 
              serviceNumber={asset?.service_number}
              uniqueServiceNumber={asset?.unique_service_number}
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
                <TableHead>Bill Month</TableHead>
                <TableHead>Service Number</TableHead>
                <TableHead>Consumer Name</TableHead>
                <TableHead>Bill Amount</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>{bill.bill_month}</TableCell>
                  <TableCell className="font-mono text-sm">{bill.service_number}</TableCell>
                  <TableCell>{bill.consumer_name || '-'}</TableCell>
                  <TableCell className="font-semibold">
                    ₹{bill.bill_amount?.toLocaleString('en-IN') || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusColor(bill.payment_status)}>
                      {bill.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bill.payment_date 
                      ? new Date(bill.payment_date).toLocaleDateString('en-IN') 
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {bill.payment_status === 'Pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenUploadDialog(bill)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Receipt
                        </Button>
                      )}
                      {bill.paid_receipt_url && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.open(bill.paid_receipt_url, '_blank')}
                        >
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
