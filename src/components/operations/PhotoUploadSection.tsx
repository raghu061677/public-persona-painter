import { useState, useCallback, useEffect } from "react";
import { Upload, X, FileImage, Zap, CheckCircle2, ImagePlus, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { uploadOperationsProofBatch } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { addWatermarkBatch, createPreviewUrl, revokePreviewUrls } from "@/lib/imageWatermark";
import { PhotoEditorDialog } from "./PhotoEditorDialog";
import { logActivity } from "@/utils/activityLogger";

interface PhotoUploadSectionProps {
  campaignId: string;
  assetId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  tag?: string;
  originalSize?: number;
  compressedSize?: number;
}

interface PreviewFile {
  file: File;
  previewUrl: string;
}

export function PhotoUploadSection({ campaignId, assetId, onUploadComplete }: PhotoUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>();
  const [orgName, setOrgName] = useState<string>();

  // Load organization settings for watermark
  useEffect(() => {
    const loadOrgSettings = async () => {
      const { data } = await supabase
        .from('organization_settings')
        .select('logo_url, organization_name')
        .single();
      
      if (data) {
        setLogoUrl(data.logo_url || undefined);
        setOrgName(data.organization_name || undefined);
      }
    };
    loadOrgSettings();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewFiles.length > 0) {
        revokePreviewUrls(previewFiles.map(p => p.previewUrl));
      }
    };
  }, [previewFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const handleFiles = async (files: File[]) => {
    if (files.length > 20) {
      toast({
        title: "Too Many Files",
        description: "You can upload up to 20 images at once",
        variant: "destructive",
      });
      return;
    }

    // Create preview URLs
    const previews: PreviewFile[] = files.map(file => ({
      file,
      previewUrl: createPreviewUrl(file),
    }));

    setPreviewFiles(previews);
    setShowPreview(true);
  };

  const handleConfirmUpload = async () => {
    const files = previewFiles.map(p => p.file);
    setShowPreview(false);
    setIsProcessing(true);

    // Check photo quality for small batches
    const shouldCheckQuality = files.length <= 4;

    try {
      // Step 1: Add watermarks
      toast({
        title: "Processing Images",
        description: shouldCheckQuality ? "Adding watermarks and checking quality..." : "Adding watermarks and preparing for upload...",
      });

      const watermarkedFiles = await addWatermarkBatch(
        files,
        logoUrl,
        orgName,
        (index, progress) => {
          // Optional: show watermarking progress
        }
      );

      // Step 2: Initialize upload state
      const initialFiles: UploadingFile[] = watermarkedFiles.map(file => ({
        file,
        progress: 0,
        status: 'uploading' as const,
        originalSize: file.size,
      }));
      
      setUploadingFiles(initialFiles);
      setIsUploading(true);
      setIsProcessing(false);

      const results = await uploadOperationsProofBatch(
        campaignId,
        assetId,
        watermarkedFiles,
        (fileIndex, progress) => {
          setUploadingFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              progress: progress.progress,
              status: progress.progress === 100 ? 'complete' : 'uploading',
            };
            return updated;
          });
        }
      );

      // Run AI quality check on uploaded photos (async, non-blocking)
      if (shouldCheckQuality && results.length > 0) {
        setTimeout(async () => {
          try {
            for (const result of results) {
              const { data: qualityData } = await supabase.functions.invoke('ai-photo-quality', {
                body: { 
                  photoUrl: result.url,
                  photoType: result.tag || 'general'
                }
              });
              
              if (qualityData && !qualityData.passed) {
                toast({
                  title: `Photo Quality Warning - ${result.tag || 'photo'}`,
                  description: `Score: ${qualityData.score}/100. ${qualityData.issues?.join(', ') || 'Quality issues detected'}`,
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error('Quality check error:', error);
          }
        }, 2000);
      }

      // Log activity for each uploaded photo
      for (let i = 0; i < results.length; i++) {
        if (results[i]) {
          await logActivity(
            'upload',
            'operation_photo',
            assetId,
            `Proof photo: ${results[i].tag}`,
            { tag: results[i].tag, assetId, campaignId }
          );
        }
      }

      // Update with tags
      setUploadingFiles(prev => 
        prev.map((uf, i) => ({
          ...uf,
          tag: results[i]?.tag,
          status: 'complete' as const,
        }))
      );

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${watermarkedFiles.length} watermarked proof photo${watermarkedFiles.length !== 1 ? 's' : ''}`,
      });

      // Cleanup preview URLs
      revokePreviewUrls(previewFiles.map(p => p.previewUrl));
      setPreviewFiles([]);

      // Clear after 2 seconds
      setTimeout(() => {
        setUploadingFiles([]);
        onUploadComplete();
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
      
      setUploadingFiles(prev =>
        prev.map(uf => ({
          ...uf,
          status: 'error' as const,
        }))
      );
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    revokePreviewUrls(previewFiles.map(p => p.previewUrl));
    setPreviewFiles([]);
    setShowPreview(false);
  };

  const removePreviewFile = (index: number) => {
    const urlToRevoke = previewFiles[index].previewUrl;
    revokePreviewUrls([urlToRevoke]);
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Preview Dialog */}
      {showPreview && (
        <Card className="mb-4 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="h-5 w-5" />
                  Review Selected Photos
                </CardTitle>
                <CardDescription>
                  {previewFiles.length} photo{previewFiles.length !== 1 ? 's' : ''} selected. 
                  Watermark will be added automatically.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCancelPreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {previewFiles.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted">
                    <img
                      src={preview.previewUrl}
                      alt={preview.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePreviewFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    {preview.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(preview.file.size / 1024 / 1024).toFixed(2)}MB
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancelPreview}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPhotoEditor(true)}
                disabled={previewFiles.length === 0 || isProcessing}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Edit Photos
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={previewFiles.length === 0 || isProcessing}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : `Upload ${previewFiles.length}`}
              </Button>
            </div>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Photos will be watermarked with your company logo, timestamp, and "PROOF OF INSTALLATION" text.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Upload Proof Photos
        </CardTitle>
        <CardDescription>
          Upload 1-20 images. Auto-watermarking, compression & tag detection enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Photos will be auto-compressed, watermarked with company branding, and tagged based on GPS data or filename.
          </AlertDescription>
        </Alert>

        {/* Drag & Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            (isUploading || isProcessing || showPreview) && "opacity-50 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragging ? "Drop files here" : "Drag & drop photos here"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse (JPG, PNG - auto-compressed)
          </p>
          <input
            type="file"
            id="photo-upload"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={isUploading || isProcessing || showPreview}
          >
            Select Files
          </Button>
        </div>

        {/* Upload Progress List */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}</h4>
            {uploadingFiles.map((uploadFile, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {uploadFile.file.name}
                      </span>
                      {uploadFile.originalSize && uploadFile.status === 'complete' && (
                        <span className="text-xs text-muted-foreground">
                          {(uploadFile.originalSize / 1024 / 1024).toFixed(2)}MB
                          {uploadFile.compressedSize && 
                            ` → ${(uploadFile.compressedSize / 1024 / 1024).toFixed(2)}MB`
                          }
                        </span>
                      )}
                    </div>
                    {uploadFile.tag && (
                      <Badge variant="secondary" className="shrink-0">
                        {uploadFile.tag}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'complete' && (
                      <Badge className="bg-green-500">✓ Done</Badge>
                    )}
                    {uploadFile.status === 'error' && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    {uploadFile.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {uploadFile.status === 'uploading' && (
                  <div className="space-y-1">
                    <Progress value={uploadFile.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {uploadFile.progress}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

      <PhotoEditorDialog
        open={showPhotoEditor}
        onOpenChange={setShowPhotoEditor}
        photos={previewFiles.map(p => p.file)}
        onApplyEdits={(editedPhotos) => {
          // Update preview files with edited photos
          revokePreviewUrls(previewFiles.map(p => p.previewUrl));
          const newPreviews = editedPhotos.map(file => ({
            file,
            previewUrl: createPreviewUrl(file),
          }));
          setPreviewFiles(newPreviews);
        }}
      />
    </>
  );
}
