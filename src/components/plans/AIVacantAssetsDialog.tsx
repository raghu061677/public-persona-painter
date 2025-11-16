import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AIVacantAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectAssets: (assetIds: string[]) => void;
}

export function AIVacantAssetsDialog({ open, onClose, onSelectAssets }: AIVacantAssetsDialogProps) {
  const [requirements, setRequirements] = useState({
    city: "",
    area: "",
    mediaType: "",
    budget: ""
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const handleGetRecommendations = async () => {
    if (!requirements.city) {
      toast({
        title: "City Required",
        description: "Please enter at least a city name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-vacant-assets', {
        body: { 
          requirements: {
            ...requirements,
            budget: requirements.budget ? parseFloat(requirements.budget) : undefined
          }
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        toast({
          title: "Recommendations Ready",
          description: `Found ${data.recommendations.length} suitable assets`,
        });
      }
    } catch (error: any) {
      console.error('AI recommendations error:', error);
      toast({
        title: "Failed to Get Recommendations",
        description: error.message || "AI service unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const assetIds = recommendations.map(r => r.asset.id);
    onSelectAssets(assetIds);
    toast({
      title: "Assets Added",
      description: `Added ${assetIds.length} recommended assets to plan`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Asset Recommendations
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={requirements.city}
                onChange={(e) => setRequirements(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Hyderabad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={requirements.area}
                onChange={(e) => setRequirements(prev => ({ ...prev, area: e.target.value }))}
                placeholder="e.g., Kukatpally"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaType">Media Type</Label>
              <Input
                id="mediaType"
                value={requirements.mediaType}
                onChange={(e) => setRequirements(prev => ({ ...prev, mediaType: e.target.value }))}
                placeholder="e.g., hoarding, billboard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                value={requirements.budget}
                onChange={(e) => setRequirements(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="e.g., 100000"
              />
            </div>
          </div>

          <Button onClick={handleGetRecommendations} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting AI Recommendations...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get AI Recommendations
              </>
            )}
          </Button>

          {recommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Top {recommendations.length} Recommendations</h3>
                <Button size="sm" onClick={handleSelectAll}>
                  Add All to Plan
                </Button>
              </div>
              {recommendations.map((rec, index) => (
                <Card key={rec.asset.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{rec.asset.id} - {rec.asset.location}</p>
                        <p className="text-sm text-muted-foreground">
                          {rec.asset.city}, {rec.asset.area} | {rec.asset.media_type}
                        </p>
                        <p className="text-sm mt-2">{rec.reasoning}</p>
                      </div>
                      <Badge variant="secondary">Score: {rec.score}/100</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
