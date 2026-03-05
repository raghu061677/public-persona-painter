import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, Download, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface SignedRODocumentCardProps {
  planId: string;
  signedRoUrl: string | null;
  signedRoUploadedAt: string | null;
  /** Optional: navigate to the source plan */
  onViewPlan?: () => void;
  /** Compact mode for embedding in tables or smaller sections */
  compact?: boolean;
}

export function SignedRODocumentCard({
  planId,
  signedRoUrl,
  signedRoUploadedAt,
  onViewPlan,
  compact = false,
}: SignedRODocumentCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleView = async () => {
    if (!signedRoUrl) return;
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
    setDownloading(true);
    try {
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
      } else {
        toast({ title: "Download failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (!signedRoUrl) {
    if (compact) return null;
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-4 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No signed Release Order</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Signed RO
        </Badge>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleView}>
          <Eye className="mr-1 h-3 w-3" />
          View
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownload} disabled={downloading}>
          <Download className="mr-1 h-3 w-3" />
          Download
        </Button>
        {onViewPlan && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewPlan}>
            <ExternalLink className="mr-1 h-3 w-3" />
            Plan
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          Signed Release Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <Badge variant="secondary">Client Authorized</Badge>
        </div>
        {signedRoUploadedAt && (
          <p className="text-xs text-muted-foreground">
            Signed on {formatDate(signedRoUploadedAt)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          {onViewPlan && (
            <Button variant="outline" size="sm" onClick={onViewPlan}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
