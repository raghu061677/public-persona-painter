import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';

interface WatermarkPreviewProps {
  position: string;
  opacity: number;
  text: string;
  includeLogo: boolean;
  includeTimestamp: boolean;
  fontSize: number;
  logoUrl?: string;
}

export function WatermarkPreview({
  position,
  opacity,
  text,
  includeLogo,
  includeTimestamp,
  fontSize,
  logoUrl,
}: WatermarkPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sample background (simulated photo)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(1, '#64748b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placeholder photo icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', canvas.width / 2, canvas.height / 2);

    // Calculate watermark position
    const padding = 20;
    let x = padding;
    let y = padding;
    let align: CanvasTextAlign = 'left';

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + fontSize;
        align = 'left';
        break;
      case 'top-right':
        x = canvas.width - padding;
        y = padding + fontSize;
        align = 'right';
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        align = 'left';
        break;
      case 'bottom-right':
        x = canvas.width - padding;
        y = canvas.height - padding;
        align = 'right';
        break;
      case 'center':
        x = canvas.width / 2;
        y = canvas.height / 2;
        align = 'center';
        break;
    }

    // Draw watermark
    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw semi-transparent background for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize * 1.5;
    
    let bgX = x;
    if (align === 'right') bgX = x - textWidth - 10;
    else if (align === 'center') bgX = x - textWidth / 2 - 5;
    
    ctx.fillRect(bgX - 5, y - textHeight + 5, textWidth + 20, textHeight);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, x, y);

    // Draw timestamp if enabled
    if (includeTimestamp) {
      const timestamp = new Date().toLocaleString();
      ctx.font = `${Math.floor(fontSize * 0.6)}px sans-serif`;
      ctx.fillText(timestamp, x, y + fontSize * 0.8);
    }

    // Draw logo placeholder if enabled
    if (includeLogo) {
      const logoSize = fontSize * 1.5;
      let logoX = x;
      if (align === 'right') logoX = x - logoSize - 10;
      else if (align === 'center') logoX = x - logoSize / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(logoX, y - logoSize - 10, logoSize, logoSize);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.font = `${Math.floor(logoSize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOGO', logoX + logoSize / 2, y - logoSize / 2 - 10);
    }

    ctx.restore();
  }, [position, opacity, text, includeLogo, includeTimestamp, fontSize, logoUrl]);

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="border rounded-md overflow-hidden bg-muted">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Preview shows how watermark will appear on proof photos
        </p>
      </div>
    </Card>
  );
}
