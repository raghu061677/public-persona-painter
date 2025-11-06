import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { TableSettings, DateFormat, CurrencyFormat } from "@/hooks/use-table-settings";
import { Separator } from "@/components/ui/separator";

interface TableSettingsPanelProps {
  settings: TableSettings;
  onUpdateSettings: (updates: Partial<TableSettings>) => void;
  onResetSettings: () => void;
}

export function TableSettingsPanel({
  settings,
  onUpdateSettings,
  onResetSettings,
}: TableSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    onResetSettings();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Table Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Table Settings</DialogTitle>
          <DialogDescription>
            Customize your table display preferences. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pagination Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Pagination</h4>
            <div className="space-y-2">
              <Label htmlFor="pageSize">Default Page Size</Label>
              <Select
                value={settings.defaultPageSize.toString()}
                onValueChange={(value) =>
                  onUpdateSettings({ defaultPageSize: parseInt(value) })
                }
              >
                <SelectTrigger id="pageSize" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="200">200 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Auto-Refresh Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Auto-Refresh</h4>
            <div className="space-y-2">
              <Label htmlFor="autoRefresh">Refresh Interval</Label>
              <Select
                value={settings.autoRefreshInterval.toString()}
                onValueChange={(value) =>
                  onUpdateSettings({ autoRefreshInterval: parseInt(value) })
                }
              >
                <SelectTrigger id="autoRefresh" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every minute</SelectItem>
                  <SelectItem value="300">Every 5 minutes</SelectItem>
                  <SelectItem value="600">Every 10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Date Format Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Date & Time</h4>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value: DateFormat) =>
                  onUpdateSettings({ dateFormat: value })
                }
              >
                <SelectTrigger id="dateFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  <SelectItem value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showTimestamps" className="cursor-pointer">
                Show timestamps
              </Label>
              <Switch
                id="showTimestamps"
                checked={settings.showTimestamps}
                onCheckedChange={(checked) =>
                  onUpdateSettings({ showTimestamps: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Currency Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Currency Display</h4>
            <div className="space-y-2">
              <Label htmlFor="currencyFormat">Number Format</Label>
              <Select
                value={settings.currencyFormat}
                onValueChange={(value: CurrencyFormat) =>
                  onUpdateSettings({ currencyFormat: value })
                }
              >
                <SelectTrigger id="currencyFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="en-IN">Indian (12,34,567.89)</SelectItem>
                  <SelectItem value="en-US">US (1,234,567.89)</SelectItem>
                  <SelectItem value="en-GB">UK (1,234,567.89)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Select
                value={settings.currencySymbol}
                onValueChange={(value) =>
                  onUpdateSettings({ currencySymbol: value })
                }
              >
                <SelectTrigger id="currencySymbol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="₹">₹ (Rupee)</SelectItem>
                  <SelectItem value="$">$ (Dollar)</SelectItem>
                  <SelectItem value="€">€ (Euro)</SelectItem>
                  <SelectItem value="£">£ (Pound)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compactNumbers" className="cursor-pointer">
                Compact large numbers (1.2L, 3.5Cr)
              </Label>
              <Switch
                id="compactNumbers"
                checked={settings.compactNumbers}
                onCheckedChange={(checked) =>
                  onUpdateSettings({ compactNumbers: checked })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={() => setIsOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
