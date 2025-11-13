import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, FileText, Calendar, User, Building2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { EnhancedBillDialog } from "./EnhancedBillDialog";
import { FetchBillButton } from "../power-bills/FetchBillButton";
import { AnomalyBadge } from "@/components/power-bills/AnomalyBadge";

interface EnhancedPowerBillsTabProps {
  assetId: string;
  asset?: any;
  isAdmin?: boolean;
}

export function EnhancedPowerBillsTab({ assetId, asset, isAdmin }: EnhancedPowerBillsTabProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [consumerInfo, setConsumerInfo] = useState<any>(null);

  useEffect(() => {
    fetchPowerBills();
  }, [assetId]);

  const fetchPowerBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("asset_power_bills")
        .select("*")
        .eq("asset_id", assetId)
        .order("bill_date", { ascending: false });

      if (error) throw error;

      setBills(data || []);
      
      // Extract consumer info from the latest bill
      if (data && data.length > 0) {
        const latestBill = data[0];
        setConsumerInfo({
          consumer_name: latestBill.consumer_name,
          service_number: latestBill.service_number,
          unique_service_number: latestBill.unique_service_number,
          ero_name: latestBill.ero_name,
          section_name: latestBill.section_name,
          consumer_address: latestBill.consumer_address,
        });
      }
    } catch (error) {
      console.error("Error fetching power bills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch power bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualBill = () => {
    setSelectedBill(null);
    setDialogOpen(true);
  };

  const getPaymentStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consumer Information Card */}
      {consumerInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Consumer Information
            </CardTitle>
            <CardDescription>TGSPDCL Consumer Details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Consumer Name</p>
                <p className="font-medium">{consumerInfo.consumer_name || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Service Number</p>
                <p className="font-medium">{consumerInfo.service_number || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Unique Service Number (USN)</p>
                <p className="font-medium">{consumerInfo.unique_service_number || asset?.unique_service_number || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  ERO Name
                </p>
                <p className="font-medium">{consumerInfo.ero_name || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Section Name</p>
                <p className="font-medium">{consumerInfo.section_name || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Address
                </p>
                <p className="font-medium">{consumerInfo.consumer_address || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Bill Summary */}
      {bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Latest Bill Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Last Bill Date
                </p>
                <p className="font-medium">
                  {bills[0].bill_date ? format(new Date(bills[0].bill_date), "dd MMM yyyy") : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Paid Date</p>
                <p className="font-medium">
                  {bills[0].paid_date ? format(new Date(bills[0].paid_date), "dd MMM yyyy") : "Not Paid"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Total Due</p>
                <p className="font-medium text-lg">₹{bills[0].total_due?.toFixed(2) || bills[0].bill_amount?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Power Bills History</CardTitle>
              <CardDescription>Manage electricity bills for this asset</CardDescription>
            </div>
            <div className="flex gap-2">
              <FetchBillButton
                assetId={assetId}
                serviceNumber={asset?.service_number}
                uniqueServiceNumber={asset?.unique_service_number}
                onSuccess={fetchPowerBills}
              />
              <Button onClick={handleAddManualBill} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Manual Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No power bills found for this asset</p>
              <p className="text-sm mt-2">Click "Fetch from TGSPDCL" to retrieve bill details</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Month</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>Total Due</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {bill.bill_month || "N/A"}
                        <AnomalyBadge 
                          isAnomaly={bill.is_anomaly}
                          anomalyType={bill.anomaly_type}
                          anomalyDetails={bill.anomaly_details}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {bill.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {bill.due_date ? format(new Date(bill.due_date), "dd MMM yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>₹{bill.bill_amount?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>₹{bill.total_due?.toFixed(2) || bill.bill_amount?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusColor(bill.payment_status)}>
                        {bill.payment_status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.paid_date ? format(new Date(bill.paid_date), "dd MMM yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Bill Dialog */}
      <EnhancedBillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assetId={assetId}
        asset={asset}
        existingConsumerInfo={consumerInfo}
        onSuccess={fetchPowerBills}
      />
    </div>
  );
}
