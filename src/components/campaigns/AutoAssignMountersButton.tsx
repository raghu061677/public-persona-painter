import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Loader2 } from "lucide-react";

interface AutoAssignMountersButtonProps {
  campaignId: string;
  companyId: string;
  currentUserId: string;
  onSuccess?: () => void;
}

export function AutoAssignMountersButton({
  campaignId,
  companyId,
  currentUserId,
  onSuccess,
}: AutoAssignMountersButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAutoAssign = async () => {
    if (!confirm("Auto-assign mounters to all campaign assets? This will allocate installation tasks based on zone, workload, and availability.")) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('auto-assign-operations', {
        body: {
          campaign_id: campaignId,
          company_id: companyId,
          assigned_by: currentUserId,
        },
      });

      if (error) {
        throw error;
      }

      // Business-level errors returned as 200 to avoid FunctionsHttpError in the client
      if (data?.success === false) {
        toast({
          title: "Cannot Auto-Assign",
          description:
            data?.message || data?.error || "Auto-assignment could not be completed.",
          variant: "destructive",
        });
        return;
      }

      if (data.skipped) {
        toast({
          title: "Already Assigned",
          description: "Operations have already been assigned for this campaign",
        });
      } else {
        toast({
          title: "Success",
          description: `${data.assigned_count} operations auto-assigned successfully`,
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to auto-assign operations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleAutoAssign}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <Users className="mr-2 h-4 w-4" />
          Auto-Assign Mounters
        </>
      )}
    </Button>
  );
}
