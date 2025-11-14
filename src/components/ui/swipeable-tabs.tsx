import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSwipe } from "@/hooks/use-swipe";
import { cn } from "@/lib/utils";

interface SwipeableTabsProps {
  tabs: {
    value: string;
    label: string;
    content: React.ReactNode;
  }[];
  defaultValue?: string;
  className?: string;
}

export function SwipeableTabs({ tabs, defaultValue, className }: SwipeableTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || tabs[0]?.value);
  const [touchStartX, setTouchStartX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const currentIndex = tabs.findIndex((tab) => tab.value === activeTab);

  const goToNextTab = () => {
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].value);
    }
  };

  const goToPrevTab = () => {
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].value);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipedLeft: goToNextTab,
    onSwipedRight: goToPrevTab,
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <div {...swipeHandlers} className="relative">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn(
              "transition-opacity duration-200",
              activeTab === tab.value ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            )}
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
