import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WidgetFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: WidgetFilters;
  onApplyFilters: (filters: WidgetFilters) => void;
}

export interface WidgetFilters {
  city?: string;
  clientId?: string;
  assetType?: string;
}

export function WidgetFiltersDialog({ 
  open, 
  onOpenChange, 
  filters,
  onApplyFilters 
}: WidgetFiltersDialogProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  
  const [selectedCity, setSelectedCity] = useState<string | undefined>(filters.city);
  const [selectedClient, setSelectedClient] = useState<string | undefined>(filters.clientId);
  const [selectedAssetType, setSelectedAssetType] = useState<string | undefined>(filters.assetType);

  useEffect(() => {
    if (open) {
      loadFilterOptions();
    }
  }, [open]);

  const loadFilterOptions = async () => {
    try {
      // Load cities from media_assets
      const { data: assetData } = await supabase
        .from('media_assets' as any)
        .select('city, media_type')
        .not('city', 'is', null) as any;

      if (assetData) {
        const uniqueCities = [...new Set(assetData.map((a: any) => a.city))];
        const uniqueTypes = [...new Set(assetData.map((a: any) => a.media_type))];
        setCities(uniqueCities.filter(Boolean) as string[]);
        setAssetTypes(uniqueTypes.filter(Boolean) as string[]);
      }

      // Load clients
      const { data: clientData } = await supabase
        .from('clients' as any)
        .select('id, name')
        .order('name') as any;

      if (clientData) {
        setClients(clientData);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      city: selectedCity,
      clientId: selectedClient,
      assetType: selectedAssetType
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedCity(undefined);
    setSelectedClient(undefined);
    setSelectedAssetType(undefined);
  };

  const activeFilterCount = [selectedCity, selectedClient, selectedAssetType].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Widget Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* City Filter */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCity && selectedCity !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCity(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Client Filter */}
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <div className="flex gap-2">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && selectedClient !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedClient(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Asset Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="assetType">Asset Type</Label>
            <div className="flex gap-2">
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger id="assetType">
                  <SelectValue placeholder="All asset types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All asset types</SelectItem>
                  {assetTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAssetType && selectedAssetType !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAssetType(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
