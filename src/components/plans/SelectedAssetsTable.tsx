import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Sparkles, Loader2, Settings2 } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calcProRata, calcDiscount, calcProfit, validateNegotiatedPrice } from "@/utils/pricing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useColumnPrefs } from "@/hooks/use-column-prefs";

interface SelectedAssetsTableProps {
  assets: any[];
  assetPricing: Record<string, any>;
  onRemove: (assetId: string) => void;
  onPricingUpdate: (assetId: string, field: string, value: any) => void;
  durationDays?: number;
}

const ALL_COLUMNS = [
  'asset_id',
  'area',
  'location',
  'direction',
  'dimensions',
  'total_sqft',
  'illumination',
  'card_rate',
  'base_rate',
  'negotiated_price',
  'pro_rata',
  'discount',
  'profit',
  'printing',
  'mounting',
  'total',
];

const DEFAULT_VISIBLE = [
  'asset_id',
  'area',
  'location',
  'card_rate',
  'negotiated_price',
  'pro_rata',
  'discount',
  'profit',
  'printing',
  'mounting',
  'total',
];

const COLUMN_LABELS: Record<string, string> = {
  asset_id: 'Asset ID',
  area: 'Area',
  location: 'Location',
  direction: 'Direction',
  dimensions: 'Dimensions',
  total_sqft: 'Total Sq.Ft',
  illumination: 'Illumination',
  card_rate: 'Card Rate (₹/Mo)',
  base_rate: 'Base Rate (₹/Mo)',
  negotiated_price: 'Negotiated (₹/Mo)',
  pro_rata: 'Pro-Rata (₹)',
  discount: 'Discount',
  profit: 'Profit',
  printing: 'Printing (₹)',
  mounting: 'Mounting (₹)',
  total: 'Total (₹)',
};

export function SelectedAssetsTable({
  assets,
  assetPricing,
  onRemove,
  onPricingUpdate,
  durationDays = 30,
}: SelectedAssetsTableProps) {
  const [loadingRates, setLoadingRates] = useState<Set<string>>(new Set());
  
  const { visibleKeys, setVisibleKeys } = useColumnPrefs(
    'plan-assets',
    ALL_COLUMNS,
    DEFAULT_VISIBLE
  );

  const isColumnVisible = (col: string) => visibleKeys.includes(col);

  const toggleColumn = (col: string) => {
    if (visibleKeys.includes(col)) {
      setVisibleKeys(visibleKeys.filter(k => k !== col));
    } else {
      setVisibleKeys([...visibleKeys, col]);
    }
  };

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
    <div className="space-y-2">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              View Options
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Select columns to display:</h4>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {ALL_COLUMNS.map((col) => (
                  <div key={col} className="flex items-center space-x-2">
                    <Checkbox
                      id={col}
                      checked={isColumnVisible(col)}
                      onCheckedChange={() => toggleColumn(col)}
                    />
                    <label
                      htmlFor={col}
                      className="text-sm cursor-pointer select-none"
                    >
                      {COLUMN_LABELS[col]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {isColumnVisible('asset_id') && <TableHead>Asset ID</TableHead>}
              {isColumnVisible('area') && <TableHead>Area</TableHead>}
              {isColumnVisible('location') && <TableHead>Location</TableHead>}
              {isColumnVisible('direction') && <TableHead>Direction</TableHead>}
              {isColumnVisible('dimensions') && <TableHead>Dimensions</TableHead>}
              {isColumnVisible('total_sqft') && <TableHead>Sq.Ft</TableHead>}
              {isColumnVisible('illumination') && <TableHead>Illumination</TableHead>}
              {isColumnVisible('card_rate') && <TableHead>Card Rate</TableHead>}
              {isColumnVisible('base_rate') && <TableHead>Base Rate</TableHead>}
              {isColumnVisible('negotiated_price') && <TableHead className="w-48">Negotiated ({durationDays}d)</TableHead>}
              {isColumnVisible('pro_rata') && <TableHead>Pro-Rata</TableHead>}
              {isColumnVisible('discount') && <TableHead>Discount</TableHead>}
              {isColumnVisible('profit') && <TableHead>Profit</TableHead>}
              {isColumnVisible('printing') && <TableHead className="w-48">Printing</TableHead>}
              {isColumnVisible('mounting') && <TableHead className="w-48">Mounting</TableHead>}
              {isColumnVisible('total') && <TableHead className="text-right">Total</TableHead>}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                  No assets selected. Add assets from the table below.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => {
                const pricing = assetPricing[asset.id] || {};
                
                // Get rates from asset
                const cardRate = asset.card_rate || 0;
                const baseRate = asset.base_rent || asset.base_rate || 0;
                const negotiatedPrice = pricing.negotiated_price || cardRate;
                
                // Calculate pro-rata
                const proRata = calcProRata(negotiatedPrice, durationDays);
                
                // Calculate discount and profit
                const discount = calcDiscount(cardRate, negotiatedPrice);
                const profit = calcProfit(baseRate, negotiatedPrice);
                
                // Get charges
                const printing = pricing.printing_charges || 0;
                const mounting = pricing.mounting_charges || 0;
                const subtotal = proRata + printing + mounting;

                const formatNumberWithCommas = (num: number) => {
                  return num.toLocaleString('en-IN');
                };

                const parseFormattedNumber = (str: string) => {
                  return parseFloat(str.replace(/,/g, '')) || 0;
                };

                const handleNegotiatedChange = (value: string) => {
                  const numValue = parseFormattedNumber(value);
                  const validation = validateNegotiatedPrice(numValue, cardRate, baseRate);
                  if (!validation.isValid) {
                    toast({
                      title: "Invalid Price",
                      description: validation.message,
                      variant: "destructive",
                    });
                    return;
                  }
                  onPricingUpdate(asset.id, 'negotiated_price', numValue);
                };

                return (
                  <TableRow key={asset.id}>
                    {isColumnVisible('asset_id') && (
                      <TableCell className="font-medium">{asset.id}</TableCell>
                    )}
                    {isColumnVisible('area') && (
                      <TableCell className="text-sm">{asset.area}</TableCell>
                    )}
                    {isColumnVisible('location') && (
                      <TableCell className="text-sm">{asset.location}</TableCell>
                    )}
                    {isColumnVisible('direction') && (
                      <TableCell className="text-sm">{asset.direction || '-'}</TableCell>
                    )}
                    {isColumnVisible('dimensions') && (
                      <TableCell className="text-sm">
                        {asset.dimensions || '-'}
                      </TableCell>
                    )}
                    {isColumnVisible('total_sqft') && (
                      <TableCell className="text-sm">{asset.total_sqft || '-'}</TableCell>
                    )}
                    {isColumnVisible('illumination') && (
                      <TableCell className="text-sm">{asset.illumination || '-'}</TableCell>
                    )}
                    {isColumnVisible('card_rate') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{formatCurrency(cardRate)}</span>
                            </TooltipTrigger>
                            <TooltipContent>Market rate per month</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('base_rate') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{formatCurrency(baseRate)}</span>
                            </TooltipTrigger>
                            <TooltipContent>Internal cost per month</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('negotiated_price') && (
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="text"
                                  value={formatNumberWithCommas(negotiatedPrice)}
                                  onChange={(e) => handleNegotiatedChange(e.target.value)}
                                  className="h-10 w-40 text-base"
                                  placeholder={formatNumberWithCommas(cardRate)}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Client agreed price per month</p>
                                <p className="text-xs text-muted-foreground">Must be ≤ Card Rate and ≥ Base Rate</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 shrink-0"
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
                              <TooltipContent>Get AI rate suggestion</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    )}
                    {isColumnVisible('pro_rata') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help font-medium">{formatCurrency(proRata)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Pro-Rata = Negotiated ÷ 30 × Days</p>
                              <p className="text-xs">₹{negotiatedPrice.toFixed(0)} ÷ 30 × {durationDays} days</p>
                              <p className="text-xs">= ₹{proRata.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('discount') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  {formatCurrency(discount.value)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {discount.percent.toFixed(1)}%
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Discount = Card Rate − Negotiated</p>
                              <p className="text-xs">₹{cardRate.toFixed(0)} − ₹{negotiatedPrice.toFixed(0)} = ₹{discount.value.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('profit') && (
                      <TableCell className="text-right bg-muted/30">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className={`font-medium ${profit.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {formatCurrency(profit.value)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {profit.percent.toFixed(1)}%
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-semibold">Profit = Negotiated − Base Rate</p>
                              <p className="text-xs">₹{negotiatedPrice.toFixed(0)} − ₹{baseRate.toFixed(0)} = ₹{profit.value.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    {isColumnVisible('printing') && (
                      <TableCell>
                        <Input
                          type="text"
                          value={formatNumberWithCommas(printing)}
                          onChange={(e) => onPricingUpdate(asset.id, 'printing_charges', parseFormattedNumber(e.target.value))}
                          className="h-10 w-40 text-base"
                          placeholder="0"
                        />
                      </TableCell>
                    )}
                    {isColumnVisible('mounting') && (
                      <TableCell>
                        <Input
                          type="text"
                          value={formatNumberWithCommas(mounting)}
                          onChange={(e) => onPricingUpdate(asset.id, 'mounting_charges', parseFormattedNumber(e.target.value))}
                          className="h-10 w-40 text-base"
                          placeholder="0"
                        />
                      </TableCell>
                    )}
                    {isColumnVisible('total') && (
                      <TableCell className="text-right font-medium">
                        {formatCurrency(subtotal)}
                      </TableCell>
                    )}
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
    </div>
  );
}
