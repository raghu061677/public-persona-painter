import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FetchBillButtonProps {
  assetId: string;
  serviceNumber?: string | null;
  uniqueServiceNumber?: string | null;
  onSuccess?: () => void;
}

export function FetchBillButton({ 
  assetId, 
  serviceNumber, 
  uniqueServiceNumber,
  onSuccess 
}: FetchBillButtonProps) {
  const [fetching, setFetching] = useState(false);

  const handleFetchBill = async () => {
    if (!uniqueServiceNumber && !serviceNumber) {
      toast({
        title: "Service Number Required",
        description: "Please add a service number to this asset first",
        variant: "destructive",
      });
      return;
    }

    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tgspdcl-bill', {
        body: { 
          uniqueServiceNumber: uniqueServiceNumber || serviceNumber,
          assetId: assetId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Bill Fetched Successfully",
          description: data.message || "Bill details have been updated",
        });
        onSuccess?.();
      } else {
        throw new Error(data?.error || 'Failed to fetch bill');
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch bill from TGSPDCL",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  return (
    <Button 
      onClick={handleFetchBill} 
      disabled={fetching || (!serviceNumber && !uniqueServiceNumber)}
      size="sm"
    >
      {fetching ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Fetching...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Fetch Bill
        </>
      )}
    </Button>
  );
}
