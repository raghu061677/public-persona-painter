import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useGenerateQrForAsset(assetId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSingle = async (id?: string) => {
    const targetId = id || assetId;
    if (!targetId) {
      setError("No asset ID provided");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-asset-qr',
        {
          body: { asset_id: targetId }
        }
      );

      if (invokeError) throw invokeError;

      if (data?.qr_code_url) {
        setQrUrl(data.qr_code_url);
        toast({
          title: "QR Code Generated",
          description: `QR code created for asset ${targetId}`,
        });
        return data;
      }

      throw new Error("No QR URL returned");
    } catch (err: any) {
      const errorMsg = err.message || "QR generation failed";
      setError(errorMsg);
      toast({
        title: "Generation Failed",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-all-asset-qr',
        {
          body: {}
        }
      );

      if (invokeError) throw invokeError;

      toast({
        title: "Bulk QR Generation Complete",
        description: `Generated: ${data?.succeeded || 0}, Failed: ${data?.failed || 0}`,
      });

      return data;
    } catch (err: any) {
      const errorMsg = err.message || "Bulk QR generation failed";
      setError(errorMsg);
      toast({
        title: "Generation Failed",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { 
    loading, 
    error, 
    qrUrl, 
    setQrUrl, 
    generateSingle, 
    generateAll 
  };
}
