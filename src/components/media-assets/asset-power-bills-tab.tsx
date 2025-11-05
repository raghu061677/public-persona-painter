import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface AssetPowerBillsTabProps {
  assetId: string;
  isAdmin?: boolean;
}

export function AssetPowerBillsTab({ assetId, isAdmin }: AssetPowerBillsTabProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPowerBills();
  }, [assetId]);

  const fetchPowerBills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('asset_power_bills')
      .select('*')
      .eq('asset_id', assetId)
      .order('bill_month', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch power bills",
        variant: "destructive",
      });
    } else {
      setBills(data || []);
    }
    setLoading(false);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'Overdue':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading power bills...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Power Bills (TGSPDCL)</h3>
        {isAdmin && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Button>
        )}
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No power bills recorded yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bills.map((bill) => (
            <Card key={bill.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {format(new Date(bill.bill_month), 'MMMM yyyy')}
                    </CardTitle>
                    {bill.consumer_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Consumer: {bill.consumer_name}
                      </p>
                    )}
                  </div>
                  <Badge className={getPaymentStatusColor(bill.payment_status)}>
                    {bill.payment_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {bill.service_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Service Number</p>
                      <p className="font-medium">{bill.service_number}</p>
                    </div>
                  )}
                  {bill.unique_service_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Unique Service No.</p>
                      <p className="font-medium">{bill.unique_service_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Amount</p>
                    <p className="font-medium text-lg">{formatCurrency(bill.bill_amount)}</p>
                  </div>
                  {bill.paid_amount > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Amount</p>
                      <p className="font-medium text-green-600">{formatCurrency(bill.paid_amount)}</p>
                    </div>
                  )}
                  {bill.payment_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="font-medium">{format(new Date(bill.payment_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                  {bill.ero && (
                    <div>
                      <p className="text-sm text-muted-foreground">ERO</p>
                      <p className="font-medium">{bill.ero}</p>
                    </div>
                  )}
                  {bill.section_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Section</p>
                      <p className="font-medium">{bill.section_name}</p>
                    </div>
                  )}
                </div>
                {bill.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm">{bill.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
