import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { uploadAssetProof } from "@/lib/photos";
import { useCompany } from "@/contexts/CompanyContext";

interface PhotoUploadSectionProps {
  assetId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  tag: string;
  status: 'uploading' | 'success' | 'error';
  preview: string;
}

export function PhotoUploadSection({ assetId, onUploadComplete }: PhotoUploadSectionProps) {
  const { company } = useCompany();
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (!company?.id) {
      toast({
        title: "Error",
        description: "Company context not available",
        variant: "destructive",
      });
      return;
    }

    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
      }
      return isValid;
    });

    if (validFiles.length === 0) return;
    if (validFiles.length > 10) {
      toast({
        title: "Too Many Files",
        description: "You can upload up to 10 images at once",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    // Initialize uploading state for all files
    const initialUploads: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      tag: 'Detecting...',
      status: 'uploading' as const,
      preview: URL.createObjectURL(file),
    }));

    setUploadingFiles(initialUploads);

    // Upload files sequentially
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      
      try {
        // Update progress to show processing
        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { ...item, progress: 30, tag: 'Analyzing...' } : item
        ));

        const result = await uploadAssetProof(company.id, assetId, file, (progress) => {
          setUploadingFiles(prev => prev.map((item, idx) => 
            idx === i ? { ...item, progress: 30 + (progress.progress * 0.7) } : item
          ));
        });

        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            progress: 100, 
            status: 'success',
            tag: result.tag 
          } : item
        ));
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: 'error',
            tag: 'Failed' 
          } : item
        ));
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    
    // Clear after a delay
    setTimeout(() => {
      setUploadingFiles([]);
      onUploadComplete();
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${validFiles.length} proof photo(s)`,
      });
    }, 2000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  }, [assetId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    processFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes('Traffic')) return '🚗';
    if (tag.includes('Newspaper')) return '📰';
    if (tag.includes('Geo')) return '📍';
    return '📷';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site & Proof Photos</CardTitle>
        <CardDescription>
          Upload multiple proof images (Traffic, Newspaper, Geo-Tagged). System will auto-detect image type. These photos can be used in Plan module presentations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
            id="proof-upload"
            disabled={uploading}
          />
          <label htmlFor="proof-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Tap to upload from gallery or camera
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload up to 10 images (JPG, PNG)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                asChild
              >
                <span>Choose Files</span>
              </Button>
            </div>
          </label>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadingFiles.map((item, index) => (
              <div
                key={index}
                className="relative group border rounded-lg overflow-hidden"
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                  {item.status === 'uploading' && (
                    <>
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                      <div className="w-3/4 bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-white h-1.5 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </>
                  )}
                  {item.status === 'success' && (
                    <div className="text-white text-center">
                      <div className="text-2xl">{getTagIcon(item.tag)}</div>
                      <div className="text-xs mt-1">{item.tag}</div>
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="text-red-400 text-center">
                      <X className="h-6 w-6 mx-auto" />
                      <div className="text-xs mt-1">Failed</div>
                    </div>
                  )}
                </div>
                {item.status === 'uploading' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                  <p className="text-xs text-white truncate">{item.file.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
