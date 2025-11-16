import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

interface BeforeAfterComparisonProps {
  beforeImage: string;
  afterImage: string;
  location: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterComparison({
  beforeImage,
  afterImage,
  location,
  beforeLabel = "Before Installation",
  afterLabel = "After Installation",
}: BeforeAfterComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{location}</h3>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {beforeLabel}
            </Badge>
            <Badge variant="default" className="text-xs">
              {afterLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="relative aspect-video bg-muted">
        {/* Container for comparison */}
        <div className="relative w-full h-full overflow-hidden">
          {/* After image (base layer) */}
          <div className="absolute inset-0">
            <img
              src={afterImage}
              alt={afterLabel}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
              {afterLabel}
            </div>
          </div>

          {/* Before image (clipped layer) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-muted-foreground/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
              {beforeLabel}
            </div>
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-primary">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-primary" />
                <div className="w-0.5 h-4 bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider control */}
      <div className="p-4 space-y-2">
        <Slider
          value={[sliderPosition]}
          onValueChange={(value) => setSliderPosition(value[0])}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Drag to compare</span>
          <span>{sliderPosition}%</span>
        </div>
      </div>
    </Card>
  );
}
