import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Upload, Image as ImageIcon } from "lucide-react";

export function BrandingSettings() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [heroPreview, setHeroPreview] = useState<string>("");

  useEffect(() => {
    loadOrgSettings();
  }, []);

  const loadOrgSettings = async () => {
    const { data } = await supabase
      .from("organization_settings")
      .select("*")
      .single();

    if (data) {
      setOrgSettings(data);
      setOrgName(data.organization_name || "");
      setLogoPreview(data.logo_url || "");
      setHeroPreview(data.hero_image_url || "");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleHeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroFile(file);
      setHeroPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!orgSettings) return;

    setUploading(true);
    try {
      let logoUrl = orgSettings.logo_url;
      let heroUrl = orgSettings.hero_image_url;

      if (logoFile) {
        // Convert logo to base64
        const reader = new FileReader();
        logoUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      if (heroFile) {
        // Convert hero image to base64
        const reader = new FileReader();
        heroUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(heroFile);
        });
      }

      const { error } = await supabase
        .from("organization_settings")
        .update({
          organization_name: orgName,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
        })
        .eq("id", orgSettings.id);

      if (error) throw error;

      toast({
        title: "Branding updated",
        description: "Your organization branding has been updated successfully.",
      });

      await loadOrgSettings();
      setLogoFile(null);
      setHeroFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Organization Details</CardTitle>
          </div>
          <CardDescription>
            Update your organization name and basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="mt-2"
            />
          </div>
          <Button onClick={handleSave} disabled={uploading}>
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <CardTitle>Logo & Hero Image</CardTitle>
          </div>
          <CardDescription>
            Upload your organization logo and hero image for branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label htmlFor="logo">Organization Logo</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px]">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-32 object-contain mb-4"
                  />
                ) : (
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="max-w-xs"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="hero">Hero Image</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px]">
                {heroPreview ? (
                  <img
                    src={heroPreview}
                    alt="Hero preview"
                    className="max-h-32 object-contain mb-4"
                  />
                ) : (
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                )}
                <Input
                  id="hero"
                  type="file"
                  accept="image/*"
                  onChange={handleHeroChange}
                  className="max-w-xs"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Save Branding"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
