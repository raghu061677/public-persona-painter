import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, TwoColumnRow } from "@/components/settings/zoho-style";
import { ClientPortalPreview } from "@/components/settings/ClientPortalPreview";
import { WatermarkCustomizer } from "@/components/settings/WatermarkCustomizer";

export default function CompanyBranding() {
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
        .from('companies' as any)
        .update({
          logo_url: logoUrl,
          theme_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      await refreshCompany();

      toast({
        title: "Branding updated",
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
    <SettingsContentWrapper>
      <SectionHeader
        title="Branding"
        description="Customize your organization's visual identity and brand elements"
      />

      <SettingsCard
        title="Logo & Colors"
        description="Upload your logo and choose your brand colors"
      >
        <InputRow label="Organization Logo" description="Recommended size: 200x60px">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px]">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="max-h-24 object-contain mb-4" />
            ) : (
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="max-w-xs"
            />
          </div>
        </InputRow>

        <TwoColumnRow
          leftColumn={
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          }
          rightColumn={
            <div>
              <Label htmlFor="secondary_color">Accent Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          }
        />

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Preview"
        description="See how your branding looks in the client portal and documents"
      >
        <ClientPortalPreview
          companyName={company?.name || 'Company Name'}
          logoUrl={logoPreview || ''}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </SettingsCard>

      <SettingsCard
        title="Document Watermark"
        description="Customize watermarks for PDF exports and reports"
      >
        <WatermarkCustomizer />
      </SettingsCard>
    </SettingsContentWrapper>
  );
}
