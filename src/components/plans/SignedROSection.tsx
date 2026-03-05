import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Eye, FileText, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface SignedROSectionProps {
  planId: string;
  signedRoUrl: string | null;
  signedRoUploadedAt: string | null;
  signedRoUploadedBy: string | null;
  onUploadComplete: () => void;
  canEdit: boolean;
}

export function SignedROSection({
  planId,
  signedRoUrl,
  signedRoUploadedAt,
  signedRoUploadedBy,
  onUploadComplete,
  canEdit,
}: SignedROSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch uploader name
  useState(() => {
    if (signedRoUploadedBy) {
      supabase
        .from("company_users")
        .select("name, email")
        .eq("user_id", signedRoUploadedBy)
        .maybeSingle()
        .then(({ data }) => {
          setUploaderName(data?.name || data?.email || signedRoUploadedBy);
        });
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Only PDF files are accepted.",
        variant: "destructive",
      });
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const storagePath = `plans/${planId}/documents/signed_ro.pdf`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

      const signedUrl = urlData?.signedUrl || storagePath;

      // Update plan record
      const { error: updateError } = await supabase
        .from("plans")
        .update({
          signed_ro_url: signedUrl,
          signed_ro_uploaded_at: new Date().toISOString(),
          signed_ro_uploaded_by: user.id,
        } as any)
        .eq("id", planId);

      if (updateError) throw updateError;

      toast({
        title: "Signed RO Uploaded",
        description: "Signed Release Order has been uploaded successfully.",
      });

      onUploadComplete();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload signed Release Order.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async () => {
    if (!signedRoUrl) return;
    // Re-generate signed URL for viewing
    const storagePath = `plans/${planId}/documents/signed_ro.pdf`;
    const { data } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      window.open(signedRoUrl, "_blank");
    }
  };

  const handleDownload = async () => {
    const storagePath = `plans/${planId}/documents/signed_ro.pdf`;
    const { data } = await supabase.storage
      .from("client-documents")
      .download(storagePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed_release_order_${planId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-500 shadow-sm mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Client Authorization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {signedRoUrl ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                Signed Release Order Uploaded
              </Badge>
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              {signedRoUploadedAt && (
                <p>Uploaded: {formatDate(signedRoUploadedAt)}</p>
              )}
              {uploaderName && (
                <p>By: {uploaderName}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Replace
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No signed Release Order uploaded yet
            </p>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload Signed RO (PDF)
              </Button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
}
