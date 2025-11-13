import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Save, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface PhotoEditorProps {
  open: boolean;
  imageUrl: string;
  fileName: string;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

export function PhotoEditor({ open, imageUrl, fileName, onSave, onCancel }: PhotoEditorProps) {
  const [crop, setCrop] = useState<Crop>();
  const [rotation, setRotation] = useState(0);
  const [quality, setQuality] = useState(80);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = useCallback(async () => {
    if (!imgRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate dimensions based on crop
    const cropPixel = crop as PixelCrop | undefined;
    const cropX = cropPixel ? cropPixel.x * scaleX : 0;
    const cropY = cropPixel ? cropPixel.y * scaleY : 0;
    const cropWidth = cropPixel ? cropPixel.width * scaleX : image.naturalWidth;
    const cropHeight = cropPixel ? cropPixel.height * scaleY : image.naturalHeight;

    // Handle rotation
    if (rotation === 90 || rotation === 270) {
      canvas.width = cropHeight;
      canvas.height = cropWidth;
    } else {
      canvas.width = cropWidth;
      canvas.height = cropHeight;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cropWidth / 2, -cropHeight / 2);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    ctx.restore();

    // Convert to blob and compress
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        const file = new File([blob], fileName, { type: "image/jpeg" });
        
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: quality / 100,
          });
          
          onSave(compressedFile);
        } catch (error) {
          console.error("Compression error:", error);
          onSave(file);
        }
      },
      "image/jpeg",
      quality / 100
    );
  }, [crop, rotation, quality, fileName, onSave]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <ReactCrop crop={crop} onChange={setCrop} aspect={undefined}>
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Edit"
                style={{ transform: `rotate(${rotation}deg)`, maxHeight: "400px" }}
                className="w-full"
              />
            </ReactCrop>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Rotate</label>
              <Button onClick={handleRotate} variant="outline" size="sm" className="w-full">
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate 90°
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Quality: {quality}%
              </label>
              <Slider
                value={[quality]}
                onValueChange={([value]) => setQuality(value)}
                min={50}
                max={100}
                step={10}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
