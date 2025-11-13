import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Play,
  Wrench,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationIssue {
  assetId: string;
  assetLocation: string;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  imageCount: number;
  formatType: 'new' | 'old' | 'mixed' | 'empty';
  brokenUrls: string[];
  fixable: boolean;
}

export default function MediaAssetsValidation() {
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ValidationIssue[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    valid: 0,
    warnings: 0,
    errors: 0,
  });

  const checkImageAccessibility = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const validateImageFormat = (images: any): {
    formatType: 'new' | 'old' | 'mixed' | 'empty';
    issues: string[];
    imageCount: number;
  } => {
    if (!images || (typeof images === 'object' && Object.keys(images).length === 0)) {
      return { formatType: 'empty', issues: ['No images uploaded'], imageCount: 0 };
    }

    const hasNewFormat = images.photos && Array.isArray(images.photos);
    const hasOldFormat = 
      images.geoTaggedPhoto || 
      images.newspaperPhoto || 
      images.trafficPhoto1 || 
      images.trafficPhoto2;

    const issues: string[] = [];
    let imageCount = 0;

    if (hasNewFormat && hasOldFormat) {
      issues.push('Mixed format detected - has both old and new structure');
      imageCount = images.photos?.length || 0;
      return { formatType: 'mixed', issues, imageCount };
    }

    if (hasOldFormat) {
      issues.push('Using deprecated image format - needs migration');
      imageCount = [
        images.geoTaggedPhoto,
        images.newspaperPhoto,
        images.trafficPhoto1,
        images.trafficPhoto2,
      ].filter(Boolean).length;
      return { formatType: 'old', issues, imageCount };
    }

    if (hasNewFormat) {
      imageCount = images.photos.length;
      
      // Validate photo structure
      images.photos.forEach((photo: any, index: number) => {
        if (!photo.url) {
          issues.push(`Photo ${index + 1}: Missing URL`);
        }
        if (!photo.tag) {
          issues.push(`Photo ${index + 1}: Missing tag`);
        }
        if (!photo.uploaded_at) {
          issues.push(`Photo ${index + 1}: Missing upload timestamp`);
        }
      });

      return { 
        formatType: 'new', 
        issues: issues.length > 0 ? issues : [], 
        imageCount 
      };
    }

    return { formatType: 'empty', issues: ['Unknown image format'], imageCount: 0 };
  };

  const validateAsset = async (asset: any): Promise<ValidationIssue> => {
    const { formatType, issues, imageCount } = validateImageFormat(asset.images);
    const brokenUrls: string[] = [];

    // Check URL accessibility for new format
    if (formatType === 'new' && asset.images?.photos) {
      for (const photo of asset.images.photos) {
        if (photo.url) {
          const isAccessible = await checkImageAccessibility(photo.url);
          if (!isAccessible) {
            brokenUrls.push(photo.url);
            issues.push(`Image not accessible: ${photo.tag}`);
          }
        }
      }
    }

    // Check URL accessibility for old format
    if (formatType === 'old') {
      const oldPhotos = [
        { key: 'geoTaggedPhoto', label: 'Geo-Tagged Photo' },
        { key: 'newspaperPhoto', label: 'Newspaper Photo' },
        { key: 'trafficPhoto1', label: 'Traffic Photo 1' },
        { key: 'trafficPhoto2', label: 'Traffic Photo 2' },
      ];

      for (const { key, label } of oldPhotos) {
        if (asset.images[key]?.url) {
          const isAccessible = await checkImageAccessibility(asset.images[key].url);
          if (!isAccessible) {
            brokenUrls.push(asset.images[key].url);
            issues.push(`Image not accessible: ${label}`);
          }
        }
      }
    }

    let status: 'valid' | 'warning' | 'error' = 'valid';
    if (brokenUrls.length > 0 || formatType === 'empty') {
      status = 'error';
    } else if (formatType === 'old' || formatType === 'mixed' || issues.length > 0) {
      status = 'warning';
    }

    const fixable = formatType === 'old' || formatType === 'mixed';

    return {
      assetId: asset.id,
      assetLocation: `${asset.location}, ${asset.city}`,
      status,
      issues,
      imageCount,
      formatType,
      brokenUrls,
      fixable,
    };
  };

  const startValidation = async () => {
    try {
      setValidating(true);
      setProgress(0);
      setResults([]);

      const { data: assets, error } = await supabase
        .from('media_assets')
        .select('id, location, city, images')
        .order('id');

      if (error) throw error;

      const totalAssets = assets?.length || 0;
      const validationResults: ValidationIssue[] = [];

      for (let i = 0; i < totalAssets; i++) {
        const asset = assets[i];
        const result = await validateAsset(asset);
        validationResults.push(result);
        setProgress(Math.round(((i + 1) / totalAssets) * 100));
        setResults([...validationResults]);
      }

      // Calculate summary
      const newSummary = {
        total: validationResults.length,
        valid: validationResults.filter(r => r.status === 'valid').length,
        warnings: validationResults.filter(r => r.status === 'warning').length,
        errors: validationResults.filter(r => r.status === 'error').length,
      };
      setSummary(newSummary);

      toast({
        title: "Validation Complete",
        description: `Scanned ${totalAssets} assets. Found ${newSummary.errors} errors, ${newSummary.warnings} warnings.`,
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const fixOldFormat = async (assetId: string) => {
    try {
      const { data: asset, error: fetchError } = await supabase
        .from('media_assets')
        .select('images')
        .eq('id', assetId)
        .single();

      if (fetchError) throw fetchError;

      const photos = [];
      const oldImages = asset.images as any;

      const mapping = [
        { key: 'geoTaggedPhoto', tag: 'Geo-Tagged Photo' },
        { key: 'newspaperPhoto', tag: 'Newspaper Photo' },
        { key: 'trafficPhoto1', tag: 'Traffic Photo 1' },
        { key: 'trafficPhoto2', tag: 'Traffic Photo 2' },
      ];

      for (const { key, tag } of mapping) {
        if (oldImages[key]?.url) {
          photos.push({
            url: oldImages[key].url,
            tag,
            uploaded_at: oldImages[key].uploaded_at || new Date().toISOString(),
            latitude: oldImages[key].latitude,
            longitude: oldImages[key].longitude,
          });
        }
      }

      const { error: updateError } = await supabase
        .from('media_assets')
        .update({ images: { photos } })
        .eq('id', assetId);

      if (updateError) throw updateError;

      toast({
        title: "Format Fixed",
        description: `Asset ${assetId} migrated to new format`,
      });

      // Re-validate this asset
      const { data: updatedAsset } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (updatedAsset) {
        const newResult = await validateAsset(updatedAsset);
        setResults(results.map(r => r.assetId === assetId ? newResult : r));
      }
    } catch (error: any) {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Asset ID', 'Location', 'Status', 'Format Type', 'Image Count', 'Issues'].join(','),
      ...results.map(r => [
        r.assetId,
        r.assetLocation,
        r.status,
        r.formatType,
        r.imageCount,
        r.issues.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-assets-validation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-500">Valid</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const getFormatBadge = (formatType: string) => {
    const colors = {
      new: 'bg-green-500',
      old: 'bg-orange-500',
      mixed: 'bg-yellow-500',
      empty: 'bg-gray-500',
    };
    return <Badge className={colors[formatType as keyof typeof colors]}>{formatType.toUpperCase()}</Badge>;
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Media Assets Validation</h1>
        <p className="text-muted-foreground">
          Scan and validate all media assets for image accessibility and proper formatting
        </p>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Valid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Controls</CardTitle>
          <CardDescription>
            Start a new validation scan or export current results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={startValidation}
              disabled={validating}
              className="gap-2"
            >
              {validating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Validation
                </>
              )}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>

          {validating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Scanning assets...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              Detailed validation results for all scanned assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.assetId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          {getStatusBadge(result.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{result.assetId}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {result.assetLocation}
                      </TableCell>
                      <TableCell>{getFormatBadge(result.formatType)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.imageCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] space-y-1">
                          {result.issues.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No issues</span>
                          ) : (
                            result.issues.map((issue, i) => (
                              <div key={i} className="text-sm text-red-600">• {issue}</div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.fixable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fixOldFormat(result.assetId)}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Fix Format
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
