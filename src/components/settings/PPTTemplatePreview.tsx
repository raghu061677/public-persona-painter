import { Card } from '@/components/ui/card';
import { Presentation } from 'lucide-react';

interface PPTTemplatePreviewProps {
  layout: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export function PPTTemplatePreview({
  layout,
  primaryColor,
  secondaryColor,
  accentColor,
  isSelected,
  onClick,
}: PPTTemplatePreviewProps) {
  const layoutDescriptions: Record<string, string> = {
    modern: 'Bold gradients with clean typography',
    classic: 'Traditional professional layout',
    minimalist: 'Simple and elegant design',
    corporate: 'Formal business presentation',
  };

  const renderPreview = () => {
    switch (layout) {
      case 'modern':
        return (
          <div className="w-full h-full p-4 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            />
            <div className="relative z-10 space-y-3">
              <div className="h-3 rounded" style={{ backgroundColor: primaryColor, width: '70%' }} />
              <div className="h-2 rounded bg-muted" style={{ width: '50%' }} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="aspect-video rounded border" style={{ borderColor: accentColor }} />
                <div className="aspect-video rounded border" style={{ borderColor: accentColor }} />
              </div>
            </div>
          </div>
        );
      case 'classic':
        return (
          <div className="w-full h-full p-4 bg-background">
            <div className="border-t-4" style={{ borderColor: primaryColor }}>
              <div className="p-3 space-y-2">
                <div className="h-3 rounded bg-foreground" style={{ width: '60%' }} />
                <div className="h-2 rounded bg-muted" style={{ width: '40%' }} />
                <div className="mt-3 space-y-1">
                  <div className="h-2 rounded bg-muted" />
                  <div className="h-2 rounded bg-muted" style={{ width: '90%' }} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'minimalist':
        return (
          <div className="w-full h-full p-4 bg-background">
            <div className="space-y-4">
              <div className="h-2 rounded" style={{ backgroundColor: primaryColor, width: '40%' }} />
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="aspect-video rounded bg-muted" />
                <div className="aspect-video rounded bg-muted" />
              </div>
              <div className="h-1 rounded bg-muted mt-4" style={{ width: '30%' }} />
            </div>
          </div>
        );
      case 'corporate':
        return (
          <div className="w-full h-full p-4" style={{ backgroundColor: primaryColor }}>
            <div className="bg-background p-3 rounded space-y-2">
              <div className="flex items-center gap-2">
                <Presentation className="h-4 w-4" style={{ color: secondaryColor }} />
                <div className="h-2 rounded" style={{ backgroundColor: secondaryColor, width: '50%' }} />
              </div>
              <div className="space-y-1 mt-3">
                <div className="h-2 rounded bg-muted" />
                <div className="h-2 rounded bg-muted" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-3 space-y-2">
        <div className="aspect-video bg-muted rounded-md overflow-hidden border">
          {renderPreview()}
        </div>
        <div className="space-y-1">
          <h4 className="font-medium capitalize">{layout}</h4>
          <p className="text-xs text-muted-foreground">{layoutDescriptions[layout]}</p>
        </div>
      </div>
    </Card>
  );
}
