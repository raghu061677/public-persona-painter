import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Wand2, RotateCw } from 'lucide-react';
import { PhotoEditSettings, editPhotosBatch } from '@/lib/photoEditor';

interface PhotoEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: File[];
  onApplyEdits: (editedPhotos: File[]) => void;
}

export function PhotoEditorDialog({
  open,
  onOpenChange,
  photos,
  onApplyEdits,
}: PhotoEditorDialogProps) {
  const [settings, setSettings] = useState<PhotoEditSettings>({
    brightness: 0,
    contrast: 0,
    rotation: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const editedPhotos = await editPhotosBatch(photos, settings);
      onApplyEdits(editedPhotos);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to edit photos:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSettings({
      brightness: 0,
      contrast: 0,
      rotation: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Edit Photos ({photos.length} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          {photos.length > 0 && (
            <Card className="p-4">
              <img
                src={URL.createObjectURL(photos[0])}
                alt="Preview"
                className="w-full h-48 object-contain rounded"
              />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Preview of first image
              </p>
            </Card>
          )}

          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Brightness</Label>
              <span className="text-sm text-muted-foreground">{settings.brightness}</span>
            </div>
            <Slider
              value={[settings.brightness]}
              onValueChange={([value]) => setSettings({ ...settings, brightness: value })}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contrast</Label>
              <span className="text-sm text-muted-foreground">{settings.contrast}</span>
            </div>
            <Slider
              value={[settings.contrast]}
              onValueChange={([value]) => setSettings({ ...settings, contrast: value })}
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              Rotation
            </Label>
            <Select
              value={settings.rotation.toString()}
              onValueChange={(value) => setSettings({ ...settings, rotation: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No Rotation</SelectItem>
                <SelectItem value="90">90° Clockwise</SelectItem>
                <SelectItem value="180">180°</SelectItem>
                <SelectItem value="270">270° Clockwise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Apply to All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
