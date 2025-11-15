import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, FileText, Target, MapPin, TrendingUp } from "lucide-react";

interface AIAssistantTabProps {
  selectedAssets: any[];
}

export function AIAssistantTab({ selectedAssets }: AIAssistantTabProps) {
  const aiSuggestions = [
    {
      icon: FileText,
      title: "Summarize Selection",
      description: "Generate client-ready summary of filtered assets",
      prompt: "Summarize these assets for a client presentation",
    },
    {
      icon: Target,
      title: "Campaign Suggestions",
      description: "AI-powered campaign plan for selected inventory",
      prompt: "Suggest campaign plan for these assets",
    },
    {
      icon: MapPin,
      title: "Location Analysis",
      description: "Analyze geographic coverage and opportunities",
      prompt: "Analyze location coverage of selected assets",
    },
    {
      icon: TrendingUp,
      title: "Pricing Optimization",
      description: "Smart pricing recommendations based on market data",
      prompt: "Suggest optimal pricing for these assets",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
        <h3 className="font-semibold text-lg mb-1">AI Assistant</h3>
        <p className="text-sm text-muted-foreground">
          {selectedAssets.length > 0
            ? `${selectedAssets.length} assets selected`
            : "Select assets to get AI-powered insights"}
        </p>
      </div>

      <div className="space-y-3">
        {aiSuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Card
              key={suggestion.title}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={selectedAssets.length === 0}
                    >
                      Run Analysis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-semibold text-sm">AI Smart Filters</h4>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7">
              Night visibility only
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              Metro corridor
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              High traffic zones
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              Premium locations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
