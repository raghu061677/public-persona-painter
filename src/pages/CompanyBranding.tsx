import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/supabase-wrapper";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette, Eye, Loader2 } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, TwoColumnRow } from "@/components/settings/zoho-style";
import { ClientPortalPreview } from "@/components/settings/ClientPortalPreview";
import { WatermarkCustomizer } from "@/components/settings/WatermarkCustomizer";
import { CompanyLogo } from "@/components/branding/CompanyLogo";
import { applyCompanyBranding, hexToHSL } from "@/lib/branding";

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
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be under 2MB",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreview = () => {
    if (company) {
      applyCompanyBranding({
        name: company.name,
        logo_url: logoPreview,
        theme_color: primaryColor,
        secondary_color: secondaryColor,
      });
      
      toast({
        title: 'Preview Applied',
        description: 'Check the sidebar and interface for live preview',
      });
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

      // Apply colors immediately for live preview
      applyCompanyBranding({
        name: company.name,
        logo_url: logoUrl,
        theme_color: primaryColor,
        secondary_color: secondaryColor,
      });

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
        <InputRow label="Organization Logo" description="Recommended size: 200x60px (PNG, SVG, or JPG). Max 2MB">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px] hover:border-primary/50 transition-colors">
            <div className="mb-4 flex items-center justify-center w-32 h-24 bg-muted rounded">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <CompanyLogo logoUrl={null} companyName={company?.name} size="lg" />
              )}
            </div>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                <span>Upload Logo</span>
              </div>
            </Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
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
