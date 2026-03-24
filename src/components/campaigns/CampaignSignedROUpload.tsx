import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Eye, Download, RefreshCw, CheckCircle2, Loader2, FileText, ExternalLink } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface CampaignSignedROUploadProps {
  campaignId: string;
  planId: string | null;
  /** RO from plan (legacy) */
  planSignedRoUrl: string | null;
  planSignedRoUploadedAt: string | null;
  /** RO uploaded directly on campaign */
  campaignSignedRoUrl: string | null;
  campaignSignedRoUploadedAt: string | null;
  onUploadComplete: () => void;
  onViewPlan?: () => void;
  canEdit?: boolean;
}

export function CampaignSignedROUpload({
  campaignId,
  planId,
  planSignedRoUrl,
  planSignedRoUploadedAt,
  campaignSignedRoUrl,
  campaignSignedRoUploadedAt,
  onUploadComplete,
  onViewPlan,
  canEdit = true,
}: CampaignSignedROUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use campaign-level RO if available, otherwise fall back to plan RO
  const hasRo = !!(campaignSignedRoUrl || planSignedRoUrl);
  const roUploadedAt = campaignSignedRoUploadedAt || planSignedRoUploadedAt;
  const isFromPlan = !campaignSignedRoUrl && !!planSignedRoUrl;

  const campaignStoragePath = `campaigns/${campaignId}/documents/signed_ro.pdf`;
  const planStoragePath = planId ? `plans/${planId}/documents/signed_ro.pdf` : null;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(campaignStoragePath, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(campaignStoragePath, 60 * 60 * 24 * 365);

      const signedUrl = urlData?.signedUrl || campaignStoragePath;

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          signed_ro_url: signedUrl,
          signed_ro_uploaded_at: new Date().toISOString(),
          signed_ro_uploaded_by: user.id,
        } as any)
        .eq("id", campaignId);

      if (updateError) throw updateError;

      toast({ title: "Signed RO Uploaded", description: "Signed Release Order uploaded to campaign successfully." });
      onUploadComplete();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload Failed", description: err.message || "Failed to upload signed Release Order.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async () => {
    const path = campaignSignedRoUrl ? campaignStoragePath : planStoragePath;
    if (!path) return;
    try {
      const { data } = await supabase.storage.from("client-documents").download(path);
      if (data) {
        const url = URL.createObjectURL(data);
        window.open(url, "_blank");
      } else {
        toast({ title: "Could not load document", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not load document", variant: "destructive" });
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const path = campaignSignedRoUrl ? campaignStoragePath : planStoragePath;
      if (!path) return;
      const { data } = await supabase.storage.from("client-documents").download(path);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `signed_release_order_${campaignId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast({ title: "Download failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-green-500 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          Signed Release Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasRo ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <Badge variant="secondary">Client Authorized</Badge>
              {isFromPlan && (
                <Badge variant="outline" className="text-xs">From Plan</Badge>
              )}
            </div>
            {roUploadedAt && (
              <p className="text-xs text-muted-foreground">
                Signed on {formatDate(roUploadedAt)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              {onViewPlan && planId && (
                <Button variant="outline" size="sm" onClick={onViewPlan}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Plan
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {isFromPlan ? "Upload Campaign RO" : "Replace"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-3">No signed Release Order uploaded</p>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Signed RO (PDF)
              </Button>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
      </CardContent>
    </Card>
  );
}
