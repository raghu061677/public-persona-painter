import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Image as ImageIcon } from "lucide-react";

export function CompanyBrandingSettings() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(company?.theme_color || '#1e40af');
  const [secondaryColor, setSecondaryColor] = useState(company?.secondary_color || '#10b981');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);

  useEffect(() => {
    if (company) {
      setPrimaryColor(company.theme_color || '#1e40af');
      setSecondaryColor(company.secondary_color || '#10b981');
      setLogoPreview(company.logo_url || null);
    }
  }, [company]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      let logoUrl = company.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${company.id}-logo-${Date.now()}.${fileExt}`;
        const filePath = `${company.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      // Update company branding
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          logo_url: logoUrl,
          theme_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      await refreshCompany();

      toast({
        title: "✅ Branding updated",
        description: "Your company branding has been saved successfully",
      });

      // Apply colors immediately
      document.documentElement.style.setProperty('--primary', hexToHSL(primaryColor));
      document.documentElement.style.setProperty('--secondary', hexToHSL(secondaryColor));

    } catch (error: any) {
      console.error("Error updating branding:", error);
      toast({
        title: "Failed to update branding",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <CardTitle>Company Branding</CardTitle>
        </div>
        <CardDescription>
          Customize your company's logo and brand colors across the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview && (
              <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: Square image, at least 200x200px, PNG or SVG format
              </p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div className="space-y-3">
          <Label htmlFor="primary-color">Primary Brand Color</Label>
          <div className="flex items-center gap-4">
            <Input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1e40af"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for main buttons, links, and primary UI elements
          </p>
        </div>

        {/* Secondary Color */}
        <div className="space-y-3">
          <Label htmlFor="secondary-color">Secondary/Accent Color</Label>
          <div className="flex items-center gap-4">
            <Input
              id="secondary-color"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#10b981"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for success states, secondary buttons, and accents
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm font-medium mb-3">Preview</p>
          <div className="flex gap-2">
            <Button style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
              Primary Button
            </Button>
            <Button 
              variant="outline" 
              style={{ borderColor: secondaryColor, color: secondaryColor }}
            >
              Secondary Button
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Branding"}
        </Button>
      </CardContent>
    </Card>
  );
}
