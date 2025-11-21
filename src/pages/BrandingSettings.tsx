/**
 * Company Branding Settings Page
 * Allows admins to customize company theme and logo
 */

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/supabase-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Palette, Eye } from 'lucide-react';
import { CompanyLogo } from '@/components/branding/CompanyLogo';
import { applyCompanyBranding } from '@/lib/branding';
import { Separator } from '@/components/ui/separator';

export default function BrandingSettings() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    theme_color: '#1e40af',
    secondary_color: '#10b981',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        theme_color: company.theme_color || '#1e40af',
        secondary_color: company.secondary_color || '#10b981',
      });
      if (company.logo_url) {
        setLogoPreview(company.logo_url);
      }
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

  const convertLogoToBase64 = async (): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const reader = new FileReader();
      return await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });
    } catch (error) {
      console.error('Logo conversion error:', error);
      return null;
    }
  };

  const handlePreview = () => {
    if (company) {
      applyCompanyBranding({
        name: company.name,
        logo_url: logoPreview || company.logo_url || null,
        theme_color: formData.theme_color,
        secondary_color: formData.secondary_color,
      });
      
      toast({
        title: 'Preview Applied',
        description: 'Check the sidebar and UI for theme changes',
      });
    }
  };

  const handleSave = async () => {
    if (!company) return;

    setIsLoading(true);
    try {
      // Convert new logo to base64 if changed
      let logoUrl = company.logo_url;
      if (logoFile) {
        const base64Logo = await convertLogoToBase64();
        if (base64Logo) {
          logoUrl = base64Logo;
        }
      }

      // Update company settings
      const { error } = await supabase
        .from('companies')
        .update({
          logo_url: logoUrl,
          theme_color: formData.theme_color,
          secondary_color: formData.secondary_color,
        })
        .eq('id', company.id);

      if (error) throw error;

      // Refresh company data to apply new branding
      await refreshCompany();

      toast({
        title: 'Branding Updated',
        description: 'Your company branding has been saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Branding</h1>
        <p className="text-muted-foreground mt-2">
          Customize your company's appearance across the platform and client portal
        </p>
      </div>

      <Separator />

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Upload your company logo. Recommended size: 200x200px (PNG or SVG)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-24 h-24 bg-muted rounded-lg border-2 border-dashed border-border">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <CompanyLogo 
                  logoUrl={null}
                  companyName={company.name}
                  size="lg"
                />
              )}
            </div>
            
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors w-fit">
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
              <p className="text-xs text-muted-foreground mt-2">
                Supports PNG, JPG, SVG. Max size: 2MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Customize the color scheme for your company's interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="theme_color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="theme_color"
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  className="w-20 h-12 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons, links, and primary UI elements
              </p>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-20 h-12 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for accents, success states, and highlights
              </p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="p-6 rounded-lg border space-y-4" style={{
            background: `linear-gradient(135deg, ${formData.theme_color}, ${formData.secondary_color})`
          }}>
            <div className="text-white text-center">
              <h3 className="text-xl font-bold mb-2">Preview</h3>
              <p className="text-white/90 text-sm">
                This is how your brand colors will appear in gradients
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <div 
                className="h-12 w-12 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: formData.theme_color }}
              />
              <div 
                className="h-12 w-12 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: formData.secondary_color }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={isLoading}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Branding'
          )}
        </Button>
      </div>

      {/* Client Portal Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Client Portal Branding</CardTitle>
          <CardDescription>
            This is how your branding will appear to clients in the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Mock Portal Header */}
            <div 
              className="p-6 text-white"
              style={{ 
                background: `linear-gradient(135deg, ${formData.theme_color}, ${formData.secondary_color})` 
              }}
            >
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain bg-white/10 rounded p-2"
                  />
                ) : (
                  <CompanyLogo 
                    logoUrl={null}
                    companyName={company.name}
                    size="lg"
                    className="text-white"
                  />
                )}
                <div>
                  <h3 className="font-bold text-xl">{company.name}</h3>
                  <p className="text-white/80 text-sm">Client Portal</p>
                </div>
              </div>
            </div>
            
            {/* Mock Portal Content */}
            <div className="p-6 bg-background space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="h-20 w-20 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: formData.theme_color }}
                >
                  3
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold">Sample Data</p>
                </div>
              </div>
              
              <Button 
                className="w-full"
                style={{ 
                  backgroundColor: formData.theme_color,
                  color: 'white'
                }}
              >
                View Campaign Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
