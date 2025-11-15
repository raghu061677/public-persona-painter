import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, FileText, FileSpreadsheet, Download } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { useState } from "react";

interface PlanBuilderTabProps {
  selectedAssets: any[];
  onRemoveAsset: (id: string) => void;
}

export function PlanBuilderTab({ selectedAssets, onRemoveAsset }: PlanBuilderTabProps) {
  const [brandName, setBrandName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const totalAmount = selectedAssets.reduce(
    (sum, asset) => sum + (Number(asset.card_rate) || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Selected Assets Count */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Selected Assets</h4>
            <Badge variant="secondary">{selectedAssets.length} items</Badge>
          </div>

          {/* Assets List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {asset.area}, {asset.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {formatCurrency(asset.card_rate)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onRemoveAsset(asset.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {selectedAssets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No assets selected. Select assets to build a plan.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Details Form */}
      {selectedAssets.length > 0 && (
        <>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="brand" className="text-xs">
                  Brand Name
                </Label>
                <Input
                  id="brand"
                  placeholder="Enter brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start" className="text-xs">
                    Start Date
                  </Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end" className="text-xs">
                    End Date
                  </Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="budget" className="text-xs">
                  Budget (Optional)
                </Label>
                <Input
                  id="budget"
                  placeholder="Enter budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="font-semibold text-sm mb-3">Estimated Totals</h4>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (18%)</span>
                <span className="font-medium">
                  {formatCurrency(totalAmount * 0.18)}
                </span>
              </div>

              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Grand Total</span>
                <span className="font-bold text-lg">
                  {formatCurrency(totalAmount * 1.18)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2" variant="default">
              <FileText className="h-4 w-4" />
              Generate PPT
            </Button>
            <Button className="w-full gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
            <Button className="w-full gap-2" variant="outline">
              <Download className="h-4 w-4" />
              Create Quotation
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
