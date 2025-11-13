import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface LogoUploadSectionProps {
  currentLogoUrl?: string;
  onLogoUpdate: (url: string) => void;
}

export function LogoUploadSection({ currentLogoUrl, onLogoUpdate }: LogoUploadSectionProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            resolve(blob);
          },
          'image/png',
          1
        );
      });
    },
    []
  );

  const handleUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      toast({
        title: 'Error',
        description: 'Please select and crop an image first',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const fileName = `logo-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, croppedBlob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(uploadData.path);

      // Update organization settings
      const { data: settings, error: settingsError } = await supabase
        .from('organization_settings')
        .select('id')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      if (settings) {
        const { error: updateError } = await supabase
          .from('organization_settings')
          .update({ logo_url: urlData.publicUrl })
          .eq('id', settings.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('organization_settings')
          .insert({ logo_url: urlData.publicUrl });

        if (insertError) throw insertError;
      }

      onLogoUpdate(urlData.publicUrl);
      setImgSrc('');
      setCrop(undefined);
      setCompletedCrop(undefined);

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentLogoUrl) return;

    try {
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('id')
        .limit(1)
        .single();

      if (settings) {
        const { error } = await supabase
          .from('organization_settings')
          .update({ logo_url: null })
          .eq('id', settings.id);

        if (error) throw error;
      }

      onLogoUpdate('');
      toast({
        title: 'Success',
        description: 'Logo removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove logo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          <CardTitle>Company Logo</CardTitle>
        </div>
        <CardDescription>
          Upload and crop your company logo for watermarks and PPT branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLogoUrl && !imgSrc && (
          <div className="space-y-2">
            <Label>Current Logo</Label>
            <div className="relative inline-block">
              <img
                src={currentLogoUrl}
                alt="Company logo"
                className="max-w-xs max-h-32 rounded border"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="logo-upload">Upload New Logo</Label>
          <input
            ref={fileInputRef}
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose Image
          </Button>
        </div>

        {imgSrc && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Crop Logo</Label>
              <div className="max-h-96 overflow-auto border rounded-md p-2">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop preview"
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || !completedCrop}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Logo'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImgSrc('');
                  setCrop(undefined);
                  setCompletedCrop(undefined);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
