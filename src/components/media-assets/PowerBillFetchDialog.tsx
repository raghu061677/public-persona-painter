import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Download, ExternalLink, Zap, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";

interface PowerBillFetchDialogProps {
  assetId: string;
  defaultServiceNumber?: string;
  onBillFetched?: () => void;
}

export function PowerBillFetchDialog({ 
  assetId, 
  defaultServiceNumber,
  onBillFetched 
}: PowerBillFetchDialogProps) {
  const [open, setOpen] = useState(false);
  const [uniqueServiceNumber, setUniqueServiceNumber] = useState(defaultServiceNumber || "");
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [paymentUrl, setPaymentUrl] = useState<string>("");

  const handleFetchBill = async () => {
    if (!uniqueServiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a unique service number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setBillData(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-tgspdcl-bill', {
        body: {
          uniqueServiceNumber: uniqueServiceNumber.trim(),
          assetId: assetId,
        }
      });

      if (error) throw error;

      if (data.success) {
        setBillData(data.data);
        setPaymentUrl(data.payment_url);
        
        toast({
          title: "Bill Fetched Successfully",
          description: "Power bill details have been retrieved and saved",
        });

        if (onBillFetched) {
          onBillFetched();
        }
      } else {
        throw new Error(data.error || "Failed to fetch bill");
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch bill from TGSPDCL",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="mr-2 h-4 w-4" />
          Fetch TGSPDCL Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fetch TGSPDCL Power Bill</DialogTitle>
          <DialogDescription>
            Enter the TGSPDCL unique service number to fetch current bill details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="uniqueServiceNumber">Unique Service Number</Label>
              <Input
                id="uniqueServiceNumber"
                value={uniqueServiceNumber}
                onChange={(e) => setUniqueServiceNumber(e.target.value)}
                placeholder="Enter TGSPDCL unique service number"
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleFetchBill} 
                disabled={loading || !uniqueServiceNumber.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Fetch Bill
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Bill Details Display */}
          {billData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bill Details</CardTitle>
                    <CardDescription>
                      Latest bill information from TGSPDCL
                    </CardDescription>
                  </div>
                  <Badge variant={billData.status === 'Paid' ? 'secondary' : 'destructive'}>
                    {billData.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Consumer Name</Label>
                    <p className="font-medium">{billData.consumer_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Service Number</Label>
                    <p className="font-mono text-sm">{billData.service_number}</p>
                  </div>
                  {billData.section_name && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Section</Label>
                      <p className="font-medium">{billData.section_name}</p>
                    </div>
                  )}
                  {billData.ero && (
                    <div>
                      <Label className="text-muted-foreground text-xs">ERO</Label>
                      <p className="font-medium">{billData.ero}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Bill Month</Label>
                    <p className="font-medium">{billData.bill_month}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Bill Amount</Label>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(billData.bill_amount)}
                    </p>
                  </div>
                  {billData.due_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Due Date</Label>
                      <p className="font-medium">{billData.due_date}</p>
                    </div>
                  )}
                </div>

                {billData.status !== 'Paid' && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handlePayNow}
                      className="w-full"
                      variant="default"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Pay Now on TGSPDCL Portal
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      You will be redirected to TGSPDCL's secure payment portal
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Information */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">About TGSPDCL Bill Fetch</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Bills are fetched from Telangana Southern Power Distribution portal</li>
              <li>• Data is automatically saved to your asset's power bills</li>
              <li>• Payment is processed securely on TGSPDCL's official portal</li>
              <li>• Ensure you have the correct service number for the asset</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
