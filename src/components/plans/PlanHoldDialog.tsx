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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format, addDays } from "date-fns";

interface PlanHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planClientId: string;
  planClientName: string;
  planStartDate: Date;
  planEndDate: Date;
  /** All asset IDs in the plan */
  allAssetIds: string[];
  /** Currently selected asset IDs (checkbox selection) */
  selectedAssetIds: string[];
  onSuccess?: () => void;
}

type DurationPreset = "2_days" | "7_days" | "manual";
type ScopeOption = "selected" | "all";

export function PlanHoldDialog({
  open,
  onOpenChange,
  planId,
  planClientId,
  planClientName,
  planStartDate,
  planEndDate,
  allAssetIds,
  selectedAssetIds,
  onSuccess,
}: PlanHoldDialogProps) {
  const { company } = useCompany();

  const [holdType, setHoldType] = useState("SOFT_HOLD");
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("2_days");
  const [scope, setScope] = useState<ScopeOption>(
    selectedAssetIds.length > 0 ? "selected" : "all"
  );
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: { assetId: string; error: string }[] } | null>(null);

  // Determine target asset IDs
  const targetAssetIds = useMemo(() => {
    return scope === "selected" && selectedAssetIds.length > 0
      ? selectedAssetIds
      : allAssetIds;
  }, [scope, selectedAssetIds, allAssetIds]);

  // Compute hold dates based on preset
  const computedDates = useMemo(() => {
    const now = new Date();
    // If plan starts in the future, use plan start; otherwise use today
    const baseStart = planStartDate > now ? planStartDate : now;
    const startStr = format(baseStart, "yyyy-MM-dd");

    switch (durationPreset) {
      case "2_days":
        return { start: startStr, end: format(addDays(baseStart, 2), "yyyy-MM-dd") };
      case "7_days":
        return { start: startStr, end: format(addDays(baseStart, 7), "yyyy-MM-dd") };
      case "manual":
        return {
          start: manualStartDate || format(planStartDate, "yyyy-MM-dd"),
          end: manualEndDate || format(planEndDate, "yyyy-MM-dd"),
        };
    }
  }, [durationPreset, planStartDate, planEndDate, manualStartDate, manualEndDate]);

  // Initialize manual dates when switching to manual
  const handleDurationChange = (val: DurationPreset) => {
    setDurationPreset(val);
    if (val === "manual" && !manualStartDate) {
      const now = new Date();
      const baseStart = planStartDate > now ? planStartDate : now;
      setManualStartDate(format(baseStart, "yyyy-MM-dd"));
      setManualEndDate(format(planEndDate, "yyyy-MM-dd"));
    }
  };

  const handleSubmit = async () => {
    if (!company?.id) return;
    if (targetAssetIds.length === 0) {
      toast({ title: "No assets to hold", variant: "destructive" });
      return;
    }

    setSaving(true);
    setResults(null);

    const { data: { user } } = await supabase.auth.getUser();
    const holdNotes = notes || `Approval hold for Plan ${planId}`;

    let successCount = 0;
    const failedList: { assetId: string; error: string }[] = [];

    // Insert holds one by one to capture per-asset trigger errors
    for (const assetId of targetAssetIds) {
      const { error } = await supabase.from("asset_holds").insert({
        company_id: company.id,
        asset_id: assetId,
        client_id: planClientId || null,
        client_name: planClientName || null,
        hold_type: holdType,
        start_date: computedDates.start,
        end_date: computedDates.end,
        notes: holdNotes,
        source: "plan",
        source_plan_id: planId || null,
        created_by: user?.id || null,
      } as any);

      if (error) {
        failedList.push({
          assetId,
          error: error.message?.includes("overlapping")
            ? "Overlapping hold or booking exists"
            : error.message || "Insert failed",
        });
      } else {
        successCount++;
      }
    }

    setResults({ success: successCount, failed: failedList });

    if (successCount > 0) {
      toast({
        title: "Holds created",
        description: `${successCount} asset(s) held${failedList.length > 0 ? `, ${failedList.length} skipped` : ""}`,
      });
      onSuccess?.();
    } else {
      toast({
        title: "No holds created",
        description: "All assets failed — see details below",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const handleClose = () => {
    setResults(null);
    setNotes("");
    setDurationPreset("2_days");
    setHoldType("SOFT_HOLD");
    onOpenChange(false);
  };

  const canHold = planClientId && targetAssetIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Hold Assets for Client Approval
          </DialogTitle>
          <DialogDescription>
            Reserve assets from Plan <strong>{planId}</strong> for{" "}
            <strong>{planClientName || "client"}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-5 py-2">
            {/* Scope */}
            <div className="space-y-2">
              <Label className="font-medium">Scope</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as ScopeOption)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="scope-selected" disabled={selectedAssetIds.length === 0} />
                  <label htmlFor="scope-selected" className="text-sm cursor-pointer">
                    Hold selected assets
                    {selectedAssetIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-xs">{selectedAssetIds.length}</Badge>
                    )}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <label htmlFor="scope-all" className="text-sm cursor-pointer">
                    Hold all plan assets
                    <Badge variant="secondary" className="ml-1.5 text-xs">{allAssetIds.length}</Badge>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Hold Type */}
            <div className="space-y-2">
              <Label className="font-medium">Hold Type</Label>
              <Select value={holdType} onValueChange={setHoldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPTION">Option (soft, low priority)</SelectItem>
                  <SelectItem value="SOFT_HOLD">Soft Hold</SelectItem>
                  <SelectItem value="HARD_BLOCK">Hard Block (reserved)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="font-medium">Hold Duration</Label>
              <div className="flex gap-2">
                {(["2_days", "7_days", "manual"] as DurationPreset[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={durationPreset === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDurationChange(preset)}
                  >
                    {preset === "2_days" ? "2 Days" : preset === "7_days" ? "7 Days" : "Manual Dates"}
                  </Button>
                ))}
              </div>

              {durationPreset === "manual" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={manualStartDate}
                      onChange={(e) => setManualStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={manualEndDate}
                      onChange={(e) => setManualEndDate(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {computedDates.start} → {computedDates.end}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Approval hold for Plan ${planId}`}
                rows={2}
              />
            </div>

            {!planClientId && (
              <p className="text-sm text-destructive">
                ⚠ Select a client in the plan first to create holds.
              </p>
            )}
          </div>
        ) : (
          /* Results view */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{results.success} hold(s) created</span>
            </div>
            {results.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{results.failed.length} failed</span>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 text-xs space-y-1">
                  {results.failed.map((f, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-mono">{f.assetId}</span>
                      <span className="text-muted-foreground">{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !canHold}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Hold ({targetAssetIds.length} assets)
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
