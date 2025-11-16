import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReceiptUploadProps {
  invoiceId: string;
  clientId: string;
  onUploadComplete?: (receiptUrl: string) => void;
}

export function ReceiptUpload({ invoiceId, clientId, onUploadComplete }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a JPG, PNG, or PDF file",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !transactionId.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a file and enter a transaction ID",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${invoiceId}-${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(filePath);

      const receiptUrl = urlData.publicUrl;

      // Log the upload activity
      await supabase.from('client_portal_access_logs').insert({
        client_id: clientId,
        action: 'receipt_uploaded',
        resource_type: 'invoice',
        resource_id: invoiceId,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          transactionId,
          notes,
        },
      });

      setUploaded(true);
      toast({
        title: "Receipt Uploaded",
        description: "Your payment receipt has been submitted successfully",
      });

      if (onUploadComplete) {
        onUploadComplete(receiptUrl);
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setFile(null);
        setTransactionId("");
        setNotes("");
        setUploaded(false);
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload receipt. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  if (uploaded) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Receipt Uploaded Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Our team will verify your payment shortly
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Payment Receipt
        </CardTitle>
        <CardDescription>
          Submit your payment receipt for verification and record keeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <Label>Receipt File (JPG, PNG, or PDF)</Label>
          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Max file size: 5MB
                </p>
              </div>
              <Input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileSelect}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <Label htmlFor="transaction-id">
            Transaction ID / Reference Number *
          </Label>
          <Input
            id="transaction-id"
            placeholder="Enter transaction reference"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any relevant payment details or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || !transactionId.trim() || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Receipt
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
