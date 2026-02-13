import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Unlock, Loader2 } from "lucide-react";

interface PlanReleaseHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planClientId: string;
  /** All asset IDs in the plan */
  allAssetIds: string[];
  /** Currently selected asset IDs */
  selectedAssetIds: string[];
  onSuccess?: () => void;
}

type ScopeOption = "selected" | "all";

export function PlanReleaseHoldDialog({
  open,
  onOpenChange,
  planId,
  planClientId,
  allAssetIds,
  selectedAssetIds,
  onSuccess,
}: PlanReleaseHoldDialogProps) {
  const { company } = useCompany();
  const [scope, setScope] = useState<ScopeOption>(
    selectedAssetIds.length > 0 ? "selected" : "all"
  );
  const [releasing, setReleasing] = useState(false);

  const targetAssetIds = useMemo(() => {
    return scope === "selected" && selectedAssetIds.length > 0
      ? selectedAssetIds
      : allAssetIds;
  }, [scope, selectedAssetIds, allAssetIds]);

  const handleRelease = async () => {
    if (!company?.id || targetAssetIds.length === 0) return;
    setReleasing(true);

    try {
      // Release holds matching this plan — use notes filter as primary match
      // (source_plan_id may not be in PostgREST cache yet)
      const { data, error } = await supabase
        .from("asset_holds")
        .update({ status: "RELEASED" })
        .eq("company_id", company.id)
        .eq("status", "ACTIVE")
        .in("asset_id", targetAssetIds)
        .ilike("notes", `%${planId}%`)
        .select("id");

      if (error) throw error;

      const releasedCount = data?.length || 0;
      toast({
        title: "Holds released",
        description: `${releasedCount} hold(s) released`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Release Plan Holds
          </DialogTitle>
          <DialogDescription>
            Release active holds created from Plan <strong>{planId}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="font-medium">Scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as ScopeOption)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="rel-selected" disabled={selectedAssetIds.length === 0} />
                <label htmlFor="rel-selected" className="text-sm cursor-pointer">
                  Selected assets
                  {selectedAssetIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs">{selectedAssetIds.length}</Badge>
                  )}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="rel-all" />
                <label htmlFor="rel-all" className="text-sm cursor-pointer">
                  All plan assets
                  <Badge variant="secondary" className="ml-1.5 text-xs">{allAssetIds.length}</Badge>
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={releasing}>
            Cancel
          </Button>
          <Button onClick={handleRelease} disabled={releasing || targetAssetIds.length === 0}>
            {releasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Release ({targetAssetIds.length} assets)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
