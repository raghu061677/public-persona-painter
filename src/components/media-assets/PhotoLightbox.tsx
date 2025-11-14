import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface PhotoLightboxProps {
  photos: Array<{
    id: string;
    photo_url: string;
    category: string;
    uploaded_at: string;
  }>;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  assetData?: {
    location: string;
    direction: string;
    dimension: string;
    total_sqft: number;
    illumination_type?: string;
    city?: string;
    area?: string;
  };
}

export function PhotoLightbox({ photos, initialIndex, isOpen, onClose, assetData }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const touchStartDistance = useRef<number>(0);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    resetZoom();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    resetZoom();
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.5));
  };

  useEffect(() => {
    setCurrentIndex(initialIndex);
    resetZoom();
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isOpen) return;
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen, currentIndex]);

  // Touch handlers for pinch-to-zoom
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        touchStartDistance.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        
        const delta = (distance - touchStartDistance.current) * 0.01;
        setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
        touchStartDistance.current = distance;
      }
    };

    const container = imageRef.current;
    if (container && isOpen) {
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      
      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [isOpen]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    if (!assetData) {
      // Fallback: download without watermark if no asset data
      const link = document.createElement("a");
      link.href = currentPhoto.photo_url;
      link.download = `photo-${currentPhoto.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      toast({
        title: "Preparing download...",
        description: "Adding watermark to image",
      });

      // Create a canvas to composite the watermark
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = currentPhoto.photo_url;
      });

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Watermark styling
      const padding = 30;
      const lineHeight = 28;
      const panelHeight = assetData.illumination_type ? 190 : 170;
      const panelWidth = 380;
      
      // Draw semi-transparent overlay panel (bottom-right)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(
        canvas.width - panelWidth - padding,
        canvas.height - panelHeight - padding,
        panelWidth,
        panelHeight
      );

      // Draw accent border
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Emerald accent
      ctx.lineWidth = 3;
      ctx.strokeRect(
        canvas.width - panelWidth - padding,
        canvas.height - panelHeight - padding,
        panelWidth,
        panelHeight
      );

      let y = canvas.height - panelHeight - padding + 35;
      const x = canvas.width - panelWidth - padding + 20;

      // Helper function to draw text
      const drawText = (label: string, value: string, yPos: number) => {
        // Label
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(label, x, yPos);
        
        // Value
        ctx.font = '16px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(value, x + 100, yPos);
      };

      // Draw asset details
      if (assetData.city && assetData.area) {
        drawText('Location:', `${assetData.city} - ${assetData.area}`, y);
        y += lineHeight;
      }

      if (assetData.location) {
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const locationText = assetData.location.length > 40 
          ? assetData.location.substring(0, 37) + '...'
          : assetData.location;
        ctx.fillText(locationText, x + 100, y);
        y += lineHeight;
      }

      if (assetData.direction) {
        drawText('Direction:', assetData.direction, y);
        y += lineHeight;
      }

      if (assetData.dimension) {
        drawText('Size:', assetData.dimension, y);
        y += lineHeight;
      }

      if (assetData.total_sqft) {
        drawText('Area:', `${assetData.total_sqft.toFixed(2)} sq.ft`, y);
        y += lineHeight;
      }

      if (assetData.illumination_type) {
        drawText('Illumination:', assetData.illumination_type, y);
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = assetData.city && assetData.area
          ? `${assetData.city}-${assetData.area}-${currentPhoto.category}-${format(new Date(), 'yyyyMMdd')}.png`
          : `photo-${currentPhoto.id}-watermarked.png`;
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download complete!",
          description: "Image with watermark saved",
        });
      }, 'image/png');

    } catch (error) {
      console.error('Error downloading with watermark:', error);
      toast({
        title: "Download failed",
        description: "Could not add watermark to image",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Mounting: "bg-blue-500",
      Display: "bg-green-500",
      Proof: "bg-purple-500",
      Monitoring: "bg-orange-500",
      General: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-16 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={resetZoom}
          disabled={scale === 1}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleZoomIn}
          disabled={scale >= 5}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={handleDownload}
        >
          <Download className="h-6 w-6" />
        </Button>
      </div>

      {/* Previous Button */}
      {photos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Next Button */}
      {photos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Image Container */}
      <div 
        ref={imageRef}
        className="relative max-w-7xl max-h-[90vh] w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={currentPhoto.photo_url}
          alt={currentPhoto.category}
          className="w-full h-full object-contain transition-transform"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center',
          }}
          draggable={false}
        />
        
        {/* Photo Info Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Badge className={getCategoryColor(currentPhoto.category)}>
                {currentPhoto.category}
              </Badge>
              <p className="text-white text-sm">
                {format(new Date(currentPhoto.uploaded_at), 'PPP')}
              </p>
            </div>
            {photos.length > 1 && (
              <p className="text-white text-sm">
                {currentIndex + 1} / {photos.length}
              </p>
            )}
          </div>
        </div>

        {/* Asset Details Panel - Top Right */}
        {assetData && (
          <div className="absolute top-20 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg max-w-xs">
            <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">
              Asset Information
            </h3>
            <div className="space-y-2.5">
              {assetData.city && assetData.area && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Location</span>
                  <span className="text-sm font-medium text-foreground">
                    {assetData.city} - {assetData.area}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {assetData.location}
                  </span>
                </div>
              )}
              
              {assetData.direction && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Direction</span>
                  <span className="text-sm font-medium text-foreground">{assetData.direction}</span>
                </div>
              )}
              
              {assetData.dimension && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Dimension</span>
                  <span className="text-sm font-medium text-foreground">{assetData.dimension}</span>
                </div>
              )}
              
              {assetData.total_sqft && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total Area</span>
                  <span className="text-sm font-medium text-foreground">
                    {assetData.total_sqft.toFixed(2)} sq.ft
                  </span>
                </div>
              )}
              
              {assetData.illumination_type && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Illumination</span>
                  <span className="text-sm font-medium text-foreground">
                    {assetData.illumination_type}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
