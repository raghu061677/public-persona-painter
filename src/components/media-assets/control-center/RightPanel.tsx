import { useState } from "react";
import { X, Info, Sparkles, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DetailsTab } from "./panel-tabs/DetailsTab";
import { AIAssistantTab } from "./panel-tabs/AIAssistantTab";
import { PlanBuilderTab } from "./panel-tabs/PlanBuilderTab";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset?: any;
  selectedAssets: any[];
  onRemoveFromSelection: (id: string) => void;
}

export function RightPanel({
  isOpen,
  onClose,
  selectedAsset,
  selectedAssets,
  onRemoveFromSelection,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState("details");

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-16 bottom-0 w-full sm:w-[480px] bg-card border-l border-border z-50",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Asset Control Panel</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
              <TabsTrigger value="details" className="gap-2">
                <Info className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="plan" className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Plan Builder
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="details" className="m-0 p-4">
                <DetailsTab asset={selectedAsset} />
              </TabsContent>

              <TabsContent value="ai" className="m-0 p-4">
                <AIAssistantTab selectedAssets={selectedAssets} />
              </TabsContent>

              <TabsContent value="plan" className="m-0 p-4">
                <PlanBuilderTab
                  selectedAssets={selectedAssets}
                  onRemoveAsset={onRemoveFromSelection}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
