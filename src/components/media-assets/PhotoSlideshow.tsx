import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize,
  X,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { PhotoValidationBadge } from "./PhotoValidationBadge";
import { PhotoValidationResult } from "@/lib/photoValidation";

interface ProofPhoto {
  url: string;
  tag: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  validation?: PhotoValidationResult;
}

interface PhotoSlideshowProps {
  photos: ProofPhoto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

export function PhotoSlideshow({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
}: PhotoSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !open) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3000); // 3 seconds per slide

    return () => clearInterval(timer);
  }, [isPlaying, open, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "Escape":
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onOpenChange(false);
          }
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [open, isFullscreen, currentIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  const getTagColor = (tag: string) => {
    if (tag.includes("Traffic")) return "bg-blue-500";
    if (tag.includes("Newspaper")) return "bg-purple-500";
    if (tag.includes("Geo")) return "bg-green-500";
    return "bg-gray-500";
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes("Traffic")) return "🚗";
    if (tag.includes("Newspaper")) return "📰";
    if (tag.includes("Geo")) return "📍";
    return "📷";
  };

  if (photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="relative h-full flex flex-col bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${getTagColor(currentPhoto.tag)} text-white`}>
                  {getTagIcon(currentPhoto.tag)} {currentPhoto.tag}
                </Badge>
                {currentPhoto.validation && (
                  <PhotoValidationBadge validation={currentPhoto.validation} />
                )}
                {currentPhoto.latitude && currentPhoto.longitude && (
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    GPS
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">
                  {currentIndex + 1} / {photos.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.tag}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-sm">
                {format(new Date(currentPhoto.uploaded_at), "MMM dd, yyyy HH:mm")}
              </p>
              {currentPhoto.latitude && currentPhoto.longitude && (
                <p className="text-white text-xs">
                  {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="w-px h-6 bg-white/20" />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <p className="text-center text-white/60 text-xs mt-4">
              ← → Navigate • Space Play/Pause • F Fullscreen • Esc Close
            </p>
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute left-0 right-0 bottom-24 z-10 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsPlaying(false);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-primary scale-110"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
