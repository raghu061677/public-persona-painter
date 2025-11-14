import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WatermarkSettings {
  id?: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  background_color: string;
  text_color: string;
  border_color: string;
  show_logo: boolean;
  logo_url?: string;
  fields_to_show: string[];
  panel_width: number;
  panel_padding: number;
  font_size: number;
}

const AVAILABLE_FIELDS = [
  { value: 'location', label: 'City & Area' },
  { value: 'address', label: 'Address/Landmark' },
  { value: 'direction', label: 'Direction' },
  { value: 'dimension', label: 'Dimension' },
  { value: 'area', label: 'Total Area (sq.ft)' },
  { value: 'illumination', label: 'Illumination Type' },
];

export function WatermarkCustomizer() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>({
    position: 'bottom-right',
    background_color: 'rgba(0, 0, 0, 0.75)',
    text_color: 'rgba(255, 255, 255, 1)',
    border_color: 'rgba(16, 185, 129, 0.8)',
    show_logo: false,
    fields_to_show: ['location', 'address', 'direction', 'dimension', 'area', 'illumination'],
    panel_width: 380,
    panel_padding: 30,
    font_size: 16,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companyUser } = await supabase
        .from('company_users' as any)
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) return;
      setCompanyId((companyUser as any).company_id);

      // Fetch watermark settings
      const { data, error } = await supabase
        .from('watermark_settings' as any)
        .select('*')
        .eq('company_id', (companyUser as any).company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          id: (data as any).id,
          position: (data as any).position as any,
          background_color: (data as any).background_color,
          text_color: (data as any).text_color,
          border_color: (data as any).border_color,
          show_logo: (data as any).show_logo,
          logo_url: (data as any).logo_url || undefined,
          fields_to_show: (data as any).fields_to_show as string[],
          panel_width: (data as any).panel_width,
          panel_padding: (data as any).panel_padding,
          font_size: (data as any).font_size,
        });
      }
    } catch (error) {
      console.error('Error fetching watermark settings:', error);
      toast({
        title: "Error",
        description: "Failed to load watermark settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        ...settings,
      };

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('watermark_settings' as any)
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('watermark_settings' as any)
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: (data as any)?.id }));
      }

      toast({
        title: "Settings Saved",
        description: "Watermark settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving watermark settings:', error);
      toast({
        title: "Error",
        description: "Failed to save watermark settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldToggle = (field: string) => {
    setSettings(prev => ({
      ...prev,
      fields_to_show: prev.fields_to_show.includes(field)
        ? prev.fields_to_show.filter(f => f !== field)
        : [...prev.fields_to_show, field]
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Watermark Customization</CardTitle>
          <CardDescription>
            Configure how asset information appears on downloaded photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Position */}
          <div className="space-y-2">
            <Label>Watermark Position</Label>
            <Select
              value={settings.position}
              onValueChange={(value: any) => setSettings(prev => ({ ...prev, position: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.background_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                  placeholder="rgba(0, 0, 0, 0.75)"
                />
                <div 
                  className="w-12 h-10 rounded border border-border"
                  style={{ backgroundColor: settings.background_color }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.text_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, text_color: e.target.value }))}
                  placeholder="rgba(255, 255, 255, 1)"
                />
                <div 
                  className="w-12 h-10 rounded border border-border"
                  style={{ backgroundColor: settings.text_color }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Border Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.border_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, border_color: e.target.value }))}
                  placeholder="rgba(16, 185, 129, 0.8)"
                />
                <div 
                  className="w-12 h-10 rounded border border-border"
                  style={{ backgroundColor: settings.border_color }}
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Show Company Logo</Label>
              <Switch
                checked={settings.show_logo}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_logo: checked }))}
              />
            </div>
            {settings.show_logo && (
              <Input
                type="url"
                value={settings.logo_url || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            )}
          </div>

          {/* Fields to Display */}
          <div className="space-y-3">
            <Label>Fields to Display</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_FIELDS.map((field) => (
                <div key={field.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.value}
                    checked={settings.fields_to_show.includes(field.value)}
                    onCheckedChange={() => handleFieldToggle(field.value)}
                  />
                  <label
                    htmlFor={field.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Panel Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Panel Width: {settings.panel_width}px</Label>
              <Slider
                value={[settings.panel_width]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, panel_width: value }))}
                min={300}
                max={600}
                step={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Panel Padding: {settings.panel_padding}px</Label>
              <Slider
                value={[settings.panel_padding]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, panel_padding: value }))}
                min={10}
                max={60}
                step={5}
              />
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label>Font Size: {settings.font_size}px</Label>
            <Slider
              value={[settings.font_size]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, font_size: value }))}
              min={12}
              max={24}
              step={1}
            />
          </div>

          {/* Preview Badge */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Preview</Label>
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                Position: {settings.position}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your watermark will appear in the {settings.position.replace('-', ' ')} corner with the selected colors and fields.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button onClick={fetchSettings} variant="outline">
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
