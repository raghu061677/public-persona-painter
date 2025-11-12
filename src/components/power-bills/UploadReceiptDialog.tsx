import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadReceiptDialogProps {
  billId: string;
  serviceNumber: string;
  billAmount: number;
  billMonth: string;
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadReceiptDialog({
  billId,
  serviceNumber,
  billAmount,
  billMonth,
  assetId,
  open,
  onOpenChange,
  onSuccess
}: UploadReceiptDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [paidAmount, setPaidAmount] = useState(billAmount.toString());
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (PNG, JPG)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a receipt file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `power-bills/${assetId}/${billId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('campaign-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-photos')
        .getPublicUrl(fileName);

      // Update bill record
      const { error: updateError } = await supabase
        .from('asset_power_bills')
        .update({
          paid: true,
          payment_status: 'Paid',
          payment_date: new Date().toISOString().split('T')[0],
          paid_amount: parseFloat(paidAmount),
          paid_receipt_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);

      if (updateError) throw updateError;

      // Create expense record
      const expenseId = `EXP-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
      
      await supabase.from('expenses').insert({
        id: expenseId,
        category: 'Electricity',
        vendor_name: 'TGSPDCL',
        amount: parseFloat(paidAmount),
        gst_percent: 0,
        gst_amount: 0,
        total_amount: parseFloat(paidAmount),
        payment_status: 'Paid',
        paid_date: new Date().toISOString().split('T')[0],
        notes: `Power bill payment for Service ${serviceNumber}, ${billMonth}`,
        invoice_url: publicUrl,
        bill_id: billId,
        bill_month: billMonth,
      });

      toast({
        title: "Receipt Uploaded",
        description: "Payment has been recorded successfully",
      });

      onOpenChange(false);
      onSuccess?.();
      setFile(null);
      setPaidAmount(billAmount.toString());
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
          <DialogDescription>
            Upload the PDF or screenshot of your payment confirmation from BillDesk/TGSPDCL
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Paid Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Enter paid amount"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="receipt">Receipt File (PDF/Image, max 10MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
