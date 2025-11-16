import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDocumentGeneration() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateInvoicePDF = async (invoiceId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been created successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate PDF",
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const generateProofPPT = async (campaignId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proof-ppt', {
        body: { campaignId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Presentation Generated",
        description: `Created ${data.slideCount} slides with campaign proofs`,
      });

      return data;
    } catch (error: any) {
      console.error('Error generating proof PPT:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate presentation",
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const generateCampaignExcel = async (campaignId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-excel', {
        body: { campaignId },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Report Generated",
        description: `Excel report with ${data.assetCount} assets created`,
      });

      return data;
    } catch (error: any) {
      console.error('Error generating campaign Excel:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generating,
    generateInvoicePDF,
    generateProofPPT,
    generateCampaignExcel,
  };
}
