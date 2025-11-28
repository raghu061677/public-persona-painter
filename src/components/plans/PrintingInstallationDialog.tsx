import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { CheckCircle2 } from "lucide-react";

interface PrintingInstallationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: any[];
  planId: string;
  onSuccess: () => void;
}

export function PrintingInstallationDialog({
  open,
  onOpenChange,
  selectedItems,
  planId,
  onSuccess,
}: PrintingInstallationDialogProps) {
  const [printingMode, setPrintingMode] = useState<"sqft" | "unit">("sqft");
  const [printingRate, setPrintingRate] = useState("");
  const [installationMode, setInstallationMode] = useState<"sqft" | "unit">("sqft");
  const [installationRate, setInstallationRate] = useState("");
  const [loading, setLoading] = useState(false);

  const calculateCost = (
    mode: "sqft" | "unit",
    rate: number,
    sqft: number
  ): number => {
    if (mode === "sqft") {
      return Math.round((sqft * rate) * 100) / 100;
    }
    return Math.round(rate * 100) / 100;
  };

  const handleApply = async () => {
    if (!printingRate && !installationRate) {
      toast({
        title: "Error",
        description: "Please enter at least one rate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updates = selectedItems.map((item) => {
        const sqft = item.total_sqft || 0;
        const printRate = parseFloat(printingRate) || 0;
        const installRate = parseFloat(installationRate) || 0;

        return {
          id: item.plan_item_id,
          printing_mode: printingMode,
          printing_rate: printRate,
          printing_cost: printRate > 0 ? calculateCost(printingMode, printRate, sqft) : 0,
          installation_mode: installationMode,
          installation_rate: installRate,
          installation_cost: installRate > 0 ? calculateCost(installationMode, installRate, sqft) : 0,
        };
      });

      // Update each item
      for (const update of updates) {
        const { error } = await supabase
          .from("plan_items")
          .update({
            printing_mode: update.printing_mode,
            printing_rate: update.printing_rate,
            printing_cost: update.printing_cost,
            installation_mode: update.installation_mode,
            installation_rate: update.installation_rate,
            installation_cost: update.installation_cost,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Updated ${selectedItems.length} asset(s) with printing & installation costs`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const previewCost = (sqft: number, mode: "sqft" | "unit", rate: string) => {
    const rateNum = parseFloat(rate) || 0;
    if (rateNum === 0) return "—";
    return formatCurrency(calculateCost(mode, rateNum, sqft));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Printing & Installation Cost Engine</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bulk Settings Section */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg border">
            {/* Printing Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Printing
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Pricing Mode</Label>
                  <Select
                    value={printingMode}
                    onValueChange={(v: "sqft" | "unit") => setPrintingMode(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqft">Per Sq.Ft (₹ × Sq.Ft)</SelectItem>
                      <SelectItem value="unit">Flat Rate (₹ per unit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {printingMode === "sqft" ? "Rate per Sq.Ft (₹)" : "Flat Rate (₹)"}
                  </Label>
                  <Input
                    type="number"
                    value={printingRate}
                    onChange={(e) => setPrintingRate(e.target.value)}
                    placeholder={printingMode === "sqft" ? "e.g., 25" : "e.g., 5000"}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Installation Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Installation / Mounting
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Pricing Mode</Label>
                  <Select
                    value={installationMode}
                    onValueChange={(v: "sqft" | "unit") => setInstallationMode(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqft">Per Sq.Ft (₹ × Sq.Ft)</SelectItem>
                      <SelectItem value="unit">Flat Rate (₹ per unit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {installationMode === "sqft" ? "Rate per Sq.Ft (₹)" : "Flat Rate (₹)"}
                  </Label>
                  <Input
                    type="number"
                    value={installationRate}
                    onChange={(e) => setInstallationRate(e.target.value)}
                    placeholder={installationMode === "sqft" ? "e.g., 15" : "e.g., 3000"}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Assets Preview */}
          <div>
            <h3 className="font-semibold mb-3">
              Selected Assets ({selectedItems.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Sq.Ft</TableHead>
                    <TableHead>Illumination</TableHead>
                    <TableHead className="text-right">Printing Cost</TableHead>
                    <TableHead className="text-right">Installation Cost</TableHead>
                    <TableHead className="text-right">Total Add-On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => {
                    const printCost = previewCost(item.total_sqft || 0, printingMode, printingRate);
                    const installCost = previewCost(item.total_sqft || 0, installationMode, installationRate);
                    const total = (
                      (parseFloat(printingRate) > 0 ? calculateCost(printingMode, parseFloat(printingRate) || 0, item.total_sqft || 0) : 0) +
                      (parseFloat(installationRate) > 0 ? calculateCost(installationMode, parseFloat(installationRate) || 0, item.total_sqft || 0) : 0)
                    );

                    return (
                      <TableRow key={item.asset_id}>
                        <TableCell className="font-medium">{item.asset_id}</TableCell>
                        <TableCell className="text-sm">{item.dimensions || "—"}</TableCell>
                        <TableCell className="text-sm">{item.total_sqft || "—"}</TableCell>
                        <TableCell className="text-sm">{item.illumination || "—"}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {printCost}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {installCost}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {total > 0 ? formatCurrency(total) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={loading || (!printingRate && !installationRate)}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Applying..." : "Apply to Selected Assets"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
