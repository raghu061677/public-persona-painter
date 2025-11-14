import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
}

export function PhotoLightbox({ photos, initialIndex, isOpen, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentPhoto.photo_url;
    link.download = `photo-${currentPhoto.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* Download Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-16 text-white hover:bg-white/10"
        onClick={handleDownload}
      >
        <Download className="h-6 w-6" />
      </Button>

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
        className="relative max-w-7xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentPhoto.photo_url}
          alt={currentPhoto.category}
          className="w-full h-full object-contain"
        />
        
        {/* Photo Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
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
      </div>
    </div>
  );
}
