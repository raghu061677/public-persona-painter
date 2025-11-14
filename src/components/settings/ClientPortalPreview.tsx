import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Image as ImageIcon } from "lucide-react";
import { useEffect, useRef } from "react";

interface ClientPortalPreviewProps {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

export function ClientPortalPreview({ 
  logoUrl, 
  primaryColor, 
  secondaryColor,
  companyName 
}: ClientPortalPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      const hsl = hexToHSL(primaryColor);
      const secondaryHsl = hexToHSL(secondaryColor);
      
      previewRef.current.style.setProperty('--preview-primary', hsl);
      previewRef.current.style.setProperty('--preview-secondary', secondaryHsl);
    }
  }, [primaryColor, secondaryColor]);

  const hexToHSL = (hex: string): string => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `${h} ${s}% ${lPercent}%`;
  };

  return (
    <div 
      ref={previewRef}
      className="border-2 border-dashed border-border rounded-lg overflow-hidden"
      style={{
        ['--preview-primary' as string]: hexToHSL(primaryColor),
        ['--preview-secondary' as string]: hexToHSL(secondaryColor),
      }}
    >
      <div 
        className="py-6 px-4 md:px-8"
        style={{ 
          backgroundColor: `hsl(var(--preview-primary))`,
          color: 'white'
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={companyName}
              className="h-12 w-auto object-contain bg-white/10 rounded p-1"
            />
          ) : (
            <div className="h-12 w-12 bg-white/10 rounded flex items-center justify-center">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{companyName || "Your Company"}</h1>
            <p className="text-white/80 text-sm">Client Portal</p>
          </div>
        </div>
        <p className="text-white/90">View your campaigns, proofs, and invoices</p>
      </div>

      <div className="bg-background p-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Sample Campaign</CardTitle>
                <CardDescription>Jan 1, 2025 - Jan 31, 2025</CardDescription>
              </div>
              <Badge 
                style={{ 
                  backgroundColor: `hsl(var(--preview-secondary))`,
                  color: 'white'
                }}
              >
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Assets</p>
                <p className="font-semibold">15</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-semibold">₹2,50,000</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                style={{ 
                  backgroundColor: `hsl(var(--preview-primary))`,
                  color: 'white'
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button size="sm" variant="outline">
                <ImageIcon className="h-4 w-4 mr-1" />
                View Proofs
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">INV-2025-001</CardTitle>
                <CardDescription>Jan 15, 2025</CardDescription>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-semibold">₹2,50,000</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance Due</p>
                <p className="text-lg font-semibold text-destructive">₹1,25,000</p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
