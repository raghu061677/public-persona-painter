import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SelectedAssetsTableProps {
  assets: any[];
  assetPricing: Record<string, any>;
  onRemove: (assetId: string) => void;
  onPricingUpdate: (assetId: string, field: string, value: any) => void;
  durationDays?: number;
}

export function SelectedAssetsTable({
  assets,
  assetPricing,
  onRemove,
  onPricingUpdate,
  durationDays = 30,
}: SelectedAssetsTableProps) {
  const [loadingRates, setLoadingRates] = useState<Set<string>>(new Set());

  const getSuggestion = async (assetId: string, asset: any) => {
    setLoadingRates(prev => new Set(prev).add(assetId));
    
    try {
      const { data, error } = await supabase.functions.invoke('rate-suggester', {
        body: {
          assetId,
          location: asset.location,
          mediaType: asset.media_type,
          city: asset.city,
          area: asset.area,
        },
      });

      if (error) throw error;

      toast({
        title: "AI Rate Suggestion",
        description: (
          <div className="space-y-2">
            <p className="font-medium">
              Range: ₹{data.stats.minPrice.toFixed(0)} - ₹{data.stats.maxPrice.toFixed(0)}
            </p>
            <p className="text-sm">{data.suggestion}</p>
            <p className="text-xs text-muted-foreground">
              Based on {data.stats.sampleCount} similar bookings
            </p>
          </div>
        ),
        duration: 8000,
      });

      // Optionally auto-fill with average price
      if (data.stats.avgPrice > 0) {
        onPricingUpdate(assetId, 'sales_price', Math.round(data.stats.avgPrice));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get rate suggestion",
        variant: "destructive",
      });
    } finally {
      setLoadingRates(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset ID</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Monthly Rate</TableHead>
            <TableHead className="w-40">Prorata ({durationDays}d)</TableHead>
            <TableHead className="w-32">Discount</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-32">Printing</TableHead>
            <TableHead className="w-32">Mounting</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No assets selected. Add assets from the table below.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset) => {
              const pricing = assetPricing[asset.id] || {};
              const monthlyRate = asset.card_rate || 0; // Monthly rate from media asset
              
              // Calculate prorata based on days (Monthly Rate / 30 * Duration Days)
              // If duration is 30 days or more, use monthly rate, otherwise calculate prorata
              const prorataRate = durationDays >= 30 
                ? monthlyRate 
                : Math.round((monthlyRate / 30) * durationDays);
              const salesPrice = pricing.sales_price || prorataRate;
              
              const discountType = pricing.discount_type || 'Percent';
              const discountValue = pricing.discount_value || 0;
              const printing = pricing.printing_charges || 0;
              const mounting = pricing.mounting_charges || 0;
              
              const discountAmount = discountType === 'Percent'
                ? (salesPrice * discountValue) / 100
                : discountValue;
              
              const netPrice = salesPrice - discountAmount;
              const subtotal = netPrice + printing + mounting;

              return (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.id}</TableCell>
                  <TableCell className="text-sm">{asset.location}</TableCell>
                  <TableCell className="text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <span className="font-medium">{formatCurrency(monthlyRate)}</span>
                            <span className="text-xs text-muted-foreground block">per month</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Prorata Calculation:</p>
                            <p className="text-xs">Monthly: {formatCurrency(monthlyRate)}</p>
                            <p className="text-xs">Per Day: {formatCurrency(monthlyRate / 30)}</p>
                            <p className="text-xs font-semibold text-primary">
                              {durationDays} days: {formatCurrency(prorataRate)}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              type="number"
                              value={salesPrice}
                              onChange={(e) => onPricingUpdate(asset.id, 'sales_price', parseFloat(e.target.value) || 0)}
                              className="h-9"
                              placeholder={prorataRate.toFixed(0)}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Auto-calculated: {formatCurrency(prorataRate)}</p>
                            <p className="text-xs text-muted-foreground">Override if negotiated</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              onClick={() => getSuggestion(asset.id, asset)}
                              disabled={loadingRates.has(asset.id)}
                            >
                              {loadingRates.has(asset.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Get AI rate suggestion</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => onPricingUpdate(asset.id, 'discount_value', parseFloat(e.target.value) || 0)}
                      className="h-9"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={discountType}
                      onValueChange={(v) => onPricingUpdate(asset.id, 'discount_type', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percent">%</SelectItem>
                        <SelectItem value="Flat">₹</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={printing}
                      onChange={(e) => onPricingUpdate(asset.id, 'printing_charges', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={mounting}
                      onChange={(e) => onPricingUpdate(asset.id, 'mounting_charges', parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(subtotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemove(asset.id)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
