import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MediaAssetsMap() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch assets",
        variant: "destructive",
      });
    } else {
      setAssets(data || []);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/media-assets')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>

        <h1 className="text-3xl font-bold mb-8">Media Assets Map</h1>

        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">🗺️</div>
              <p className="text-xl font-medium">Map View Coming Soon</p>
              <p className="text-muted-foreground">
                Interactive map with {assets.length} geotagged assets will be available here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
