import { useState, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { uploadOperationsProofs } from "@/lib/operations/uploadProofs";
import { cn } from "@/lib/utils";

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
}

export function PhotoUploadSection({ campaignId, assetId, onUploadComplete }: PhotoUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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

    // Initialize uploading state
    const initialFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    setUploadingFiles(initialFiles);
    setIsUploading(true);

    try {
      const results = await uploadOperationsProofs(
        campaignId,
        assetId,
        files,
        (fileIndex, progress) => {
          setUploadingFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              progress,
              status: progress === 100 ? 'complete' : 'uploading',
            };
            return updated;
          });
        }
      );

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
        description: `Successfully uploaded ${files.length} proof photo${files.length !== 1 ? 's' : ''}`,
      });

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
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Proof Photos</CardTitle>
        <CardDescription>
          Upload 1-20 images (Traffic, Newspaper, Geo-tagged). Auto-detection enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isUploading && "opacity-50 pointer-events-none"
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
            or click to browse (JPG, PNG up to 10MB each)
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
            disabled={isUploading}
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
                    <span className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </span>
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
  );
}
