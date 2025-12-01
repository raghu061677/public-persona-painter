import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { parseDimensions } from "@/utils/mediaAssets";

interface MediaAsset {
  id: string;
  media_asset_code?: string | null;
  primary_photo_url: string | null;
  dimensions: string | null;
  total_sqft: number | null;
  latitude: number | null;
  longitude: number | null;
  illumination_type: string | null;
  is_multi_face: boolean | null;
  faces: any;
  municipal_authority: string | null;
  municipal_id: string | null;
}

interface Photo {
  id: string;
  asset_id: string;
  photo_url: string;
}

export default function MediaAssetsValidation() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);
  const [serverReport, setServerReport] = useState<any | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: assetsData } = await supabase.from("media_assets").select("*");
    const { data: photosData } = await supabase.from("media_photos").select("*");

    const grouped: Record<string, Photo[]> = {};
    photosData?.forEach((p) => {
      if (!grouped[p.asset_id]) grouped[p.asset_id] = [];
      grouped[p.asset_id].push(p);
    });

    setPhotosMap(grouped);
    setAssets(assetsData || []);
    setLoading(false);
  }

  function validate(asset: MediaAsset) {
    const errors: string[] = [];
    const photos = photosMap[asset.id] || [];

    // Rule 1: Primary photo exists
    if (!asset.primary_photo_url) errors.push("Missing primary_photo_url");

    // Rule 2: At least 1 gallery photo
    if (photos.length === 0) errors.push("No photos in media_photos");

    // Rule 3: Dimensions valid
    if (!asset.dimensions || !/^\d+[xX]\d+(-\d+[xX]\d+)*$/.test(asset.dimensions)) {
      errors.push("Invalid dimensions format");
    }

    // Rule 4: Sqft validation
    if (asset.dimensions) {
      const parsed = parseDimensions(asset.dimensions);
      if (parsed.totalSqft !== asset.total_sqft) {
        errors.push(
          `total_sqft mismatch (expected ${parsed.totalSqft}, got ${asset.total_sqft})`
        );
      }
    }

    // Rule 5: Latitude/Longitude check
    if (!asset.latitude || !asset.longitude) {
      errors.push("Missing latitude or longitude");
    }

    // Rule 6: Illumination type check
    if (!asset.illumination_type) errors.push("Missing illumination_type");

    // Rule 7: Multi-face consistency check
    if (asset.is_multi_face) {
      const facesArray = Array.isArray(asset.faces) ? asset.faces : [];
      if (facesArray.length < 2) {
        errors.push("is_multi_face = true but faces[] is invalid");
      }
    }

    // Rule 8: Municipal ID for regulated assets
    if (asset.municipal_authority && !asset.municipal_id) {
      errors.push("Municipal authority present but municipal_id missing");
    }

    return errors;
  }

  async function runServerValidation() {
    setServerLoading(true);
    setServerReport(null);

    const { data, error } = await supabase.functions.invoke(
      "validate-media-assets"
    );

    setServerLoading(false);
    if (error) {
      setServerReport({ error: error.message });
    } else {
      setServerReport(data);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Media Assets Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runServerValidation} disabled={serverLoading}>
            {serverLoading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : null}
            Run Full Server Validation
          </Button>

          {serverReport && (
            <pre className="mt-4 p-4 bg-muted rounded text-sm overflow-auto">
              {JSON.stringify(serverReport, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {assets.map((asset) => {
          const errors = validate(asset);
          const hasErrors = errors.length > 0;

          return (
            <Card key={asset.id} className={hasErrors ? "border-red-500" : ""}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{asset.media_asset_code || asset.id}</span>
                  {hasErrors ? (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-4" /> {errors.length} Issues
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="mr-1 h-4" /> OK
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              {hasErrors && (
                <CardContent>
                  <ul className="list-disc pl-6 text-red-600 text-sm">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
