import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Eye, Download, RefreshCw, CheckCircle2, Loader2, FileText } from "lucide-react";

interface ClientPODocumentUploadProps {
  campaignId: string;
  documentUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export function ClientPODocumentUpload({ campaignId, documentUrl, onUploadComplete }: ClientPODocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storagePath = `campaigns/${campaignId}/documents/client_po.pdf`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid File", description: "Only PDF files are accepted.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      const signedUrl = urlData?.signedUrl || storagePath;

      // Update campaign record
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ client_po_document_url: signedUrl } as any)
        .eq("id", campaignId);

      if (updateError) throw updateError;

      toast({ title: "PO/WO Document Uploaded", description: "Client PO/Work Order document uploaded successfully." });
      onUploadComplete(signedUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload Failed", description: err.message || "Failed to upload document.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async () => {
    const { data } = await supabase.storage.from("client-documents").createSignedUrl(storagePath, 3600);
    window.open(data?.signedUrl || documentUrl || "", "_blank");
  };

  const handleDownload = async () => {
    const { data } = await supabase.storage.from("client-documents").download(storagePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `client_po_${campaignId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-2">
      {documentUrl ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            PO/WO Document Uploaded
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleView}>
            <Eye className="mr-1 h-3 w-3" /> View
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownload}>
            <Download className="mr-1 h-3 w-3" /> Download
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            Replace
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload PO/WO Copy (PDF)
        </Button>
      )}
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
