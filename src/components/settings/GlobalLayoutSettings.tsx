import { Settings, Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAllLayoutSettings } from "@/hooks/use-layout-settings";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

/**
 * Global Layout Settings Panel
 * Allows users to manage layout preferences across all pages
 * with import/export functionality
 */
export function GlobalLayoutSettings() {
  const { allSettings, resetAllSettings, exportSettings, importSettings } = useAllLayoutSettings();
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    exportSettings();
    toast({
      title: "Settings Exported",
      description: "Your layout preferences have been downloaded",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importSettings(file);
        toast({
          title: "Settings Imported",
          description: "Your layout preferences have been restored",
        });
        setOpen(false);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('Reset all layout settings to defaults?')) {
      resetAllSettings();
      toast({
        title: "Settings Reset",
        description: "All layout preferences have been reset to defaults",
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Layout Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Global Layout Settings</DialogTitle>
          <DialogDescription>
            Manage your layout preferences across all pages. Settings are saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Dashboard Settings */}
          <div className="space-y-3">
            <h4 className="font-medium">Dashboard</h4>
            <div className="space-y-2 pl-4">
              {Object.entries(allSettings.dashboard || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`dashboard-${key}`} className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^show /, '')}
                  </Label>
                  <Switch
                    id={`dashboard-${key}`}
                    checked={value as boolean}
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Plans Settings */}
          <div className="space-y-3">
            <h4 className="font-medium">Plans</h4>
            <div className="space-y-2 pl-4">
              {Object.entries(allSettings.plans || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`plans-${key}`} className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^show /, '')}
                  </Label>
                  <Switch
                    id={`plans-${key}`}
                    checked={value as boolean}
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Other Pages */}
          {['campaigns', 'clients', 'invoices', 'media-assets'].map(pageId => (
            allSettings[pageId] && (
              <div key={pageId} className="space-y-3">
                <h4 className="font-medium capitalize">{pageId.replace('-', ' ')}</h4>
                <div className="space-y-2 pl-4">
                  {Object.entries(allSettings[pageId]).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={`${pageId}-${key}`} className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^show /, '')}
                      </Label>
                      <Switch
                        id={`${pageId}-${key}`}
                        checked={value as boolean}
                        disabled
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleImport} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="destructive" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
