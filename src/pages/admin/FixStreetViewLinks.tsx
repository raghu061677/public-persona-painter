import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ROUTES } from "@/config/routes";
import { RefreshCw, CheckCircle2, AlertCircle, MapPin } from "lucide-react";
import { validateAndFixStreetViewUrl, isValidStreetViewUrl } from "@/lib/streetview";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssetIssue {
  id: string;
  area: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  google_street_view_url: string | null;
  issue: string;
  canFix: boolean;
}

export default function FixStreetViewLinks() {
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [assets, setAssets] = useState<AssetIssue[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    missing: 0,
    broken: 0,
    valid: 0,
    noCoordinates: 0,
  });

  const scanAssets = async () => {
    setIsScanning(true);
    setProgress(0);
    
    try {
      const { data: allAssets, error } = await supabase
        .from('media_assets')
        .select('id, area, location, latitude, longitude, google_street_view_url')
        .order('id');

      if (error) throw error;
      if (!allAssets) return;

      const issues: AssetIssue[] = [];
      let statsObj = {
        total: allAssets.length,
        missing: 0,
        broken: 0,
        valid: 0,
        noCoordinates: 0,
      };

      allAssets.forEach((asset, index) => {
        setProgress(((index + 1) / allAssets.length) * 100);

        const hasCoordinates = !!asset.latitude && !!asset.longitude;
        const hasUrl = !!asset.google_street_view_url;
        const isValid = isValidStreetViewUrl(asset.google_street_view_url);

        if (!hasCoordinates) {
          statsObj.noCoordinates++;
          issues.push({
            ...asset,
            issue: 'Missing coordinates',
            canFix: false,
          });
        } else if (!hasUrl) {
          statsObj.missing++;
          issues.push({
            ...asset,
            issue: 'Missing Street View URL',
            canFix: true,
          });
        } else if (!isValid) {
          statsObj.broken++;
          issues.push({
            ...asset,
            issue: 'Invalid/Broken URL',
            canFix: true,
          });
        } else {
          statsObj.valid++;
        }
      });

      setAssets(issues);
      setStats(statsObj);

      toast({
        title: "Scan Complete",
        description: `Found ${issues.length} assets with Street View issues`,
      });
    } catch (error) {
      console.error('Error scanning assets:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan assets",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setProgress(0);
    }
  };

  const fixAllAssets = async () => {
    const fixableAssets = assets.filter(a => a.canFix);
    
    if (fixableAssets.length === 0) {
      toast({
        title: "Nothing to Fix",
        description: "No fixable assets found",
      });
      return;
    }

    setIsFixing(true);
    setProgress(0);

    let fixed = 0;
    let failed = 0;

    for (let i = 0; i < fixableAssets.length; i++) {
      const asset = fixableAssets[i];
      setProgress(((i + 1) / fixableAssets.length) * 100);

      try {
        const newUrl = validateAndFixStreetViewUrl(
          asset.google_street_view_url,
          asset.latitude,
          asset.longitude
        );

        if (newUrl) {
          const { error } = await supabase
            .from('media_assets')
            .update({ google_street_view_url: newUrl })
            .eq('id', asset.id);

          if (error) throw error;
          fixed++;
        }
      } catch (error) {
        console.error(`Failed to fix asset ${asset.id}:`, error);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsFixing(false);
    setProgress(0);

    toast({
      title: "Fix Complete",
      description: `Fixed ${fixed} assets, ${failed} failed`,
    });

    // Rescan to update the list
    await scanAssets();
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <PageHeader
        title="Fix Street View Links"
        description="Scan and fix broken or missing Google Street View URLs for all media assets"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Admin Tools", path: "/admin/tools" },
          { label: "Fix Street View Links" },
        ]}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid URLs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.missing + stats.broken}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Coordinates</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.noCoordinates}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Scan all assets for Street View issues and fix them automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={scanAssets}
              disabled={isScanning || isFixing}
              className="flex-1"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan All Assets'}
            </Button>

            <Button
              onClick={fixAllAssets}
              disabled={isScanning || isFixing || assets.filter(a => a.canFix).length === 0}
              variant="default"
              className="flex-1"
            >
              <CheckCircle2 className={`mr-2 h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
              {isFixing ? 'Fixing...' : `Fix All Issues (${assets.filter(a => a.canFix).length})`}
            </Button>
          </div>

          {(isScanning || isFixing) && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues Table */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assets with Issues ({assets.length})</CardTitle>
            <CardDescription>
              Assets that have missing, broken, or invalid Street View URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.id}</TableCell>
                      <TableCell>{asset.area}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{asset.location}</TableCell>
                      <TableCell>
                        <Badge variant={asset.canFix ? "default" : "secondary"}>
                          {asset.issue}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.latitude && asset.longitude
                          ? `${asset.latitude.toFixed(4)}, ${asset.longitude.toFixed(4)}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {asset.canFix ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Can Fix
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Manual Fix Required
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
