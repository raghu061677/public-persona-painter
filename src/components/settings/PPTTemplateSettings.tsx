import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Palette, FileText } from "lucide-react";

export function PPTTemplateSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ppt_template_name: "Modern Professional",
    ppt_primary_color: "#1E40AF",
    ppt_secondary_color: "#10B981",
    ppt_accent_color: "#F59E0B",
    ppt_layout_style: "modern",
    ppt_include_company_logo: true,
    ppt_watermark_enabled: true,
    ppt_footer_text: "Confidential - For Client Review Only",
    auto_generate_ppt_on_completion: false,
    notify_manager_on_ppt_generation: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          ppt_template_name: data.ppt_template_name || "Modern Professional",
          ppt_primary_color: data.ppt_primary_color || "#1E40AF",
          ppt_secondary_color: data.ppt_secondary_color || "#10B981",
          ppt_accent_color: data.ppt_accent_color || "#F59E0B",
          ppt_layout_style: data.ppt_layout_style || "modern",
          ppt_include_company_logo: data.ppt_include_company_logo !== false,
          ppt_watermark_enabled: data.ppt_watermark_enabled !== false,
          ppt_footer_text: data.ppt_footer_text || "Confidential - For Client Review Only",
          auto_generate_ppt_on_completion: data.auto_generate_ppt_on_completion || false,
          notify_manager_on_ppt_generation: data.notify_manager_on_ppt_generation !== false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load PPT template settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from("organization_settings")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("organization_settings")
          .update(settings)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert([settings]);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "PPT template settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>PPT Template Customization</CardTitle>
          </div>
          <CardDescription>
            Customize the appearance and branding of auto-generated PowerPoint presentations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={settings.ppt_template_name}
                onChange={(e) =>
                  setSettings({ ...settings, ppt_template_name: e.target.value })
                }
                placeholder="Modern Professional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="layout-style">Layout Style</Label>
              <Select
                value={settings.ppt_layout_style}
                onValueChange={(value) =>
                  setSettings({ ...settings, ppt_layout_style: value })
                }
              >
                <SelectTrigger id="layout-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.ppt_primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_primary_color: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={settings.ppt_primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_primary_color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.ppt_secondary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_secondary_color: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={settings.ppt_secondary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_secondary_color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={settings.ppt_accent_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_accent_color: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={settings.ppt_accent_color}
                  onChange={(e) =>
                    setSettings({ ...settings, ppt_accent_color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer-text">Footer Text</Label>
            <Input
              id="footer-text"
              value={settings.ppt_footer_text}
              onChange={(e) =>
                setSettings({ ...settings, ppt_footer_text: e.target.value })
              }
              placeholder="Confidential - For Client Review Only"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Company Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Add your organization logo to every slide
                </p>
              </div>
              <Switch
                checked={settings.ppt_include_company_logo}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, ppt_include_company_logo: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Watermark</Label>
                <p className="text-sm text-muted-foreground">
                  Add watermark to proof photos
                </p>
              </div>
              <Switch
                checked={settings.ppt_watermark_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, ppt_watermark_enabled: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Auto-Generation Settings</CardTitle>
          </div>
          <CardDescription>
            Configure automatic PPT generation when campaign proofs are complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate on Completion</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate PPT when all campaign proofs are uploaded and verified
              </p>
            </div>
            <Switch
              checked={settings.auto_generate_ppt_on_completion}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_generate_ppt_on_completion: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notify Manager</Label>
              <p className="text-sm text-muted-foreground">
                Send notification to campaign manager when PPT is generated
              </p>
            </div>
            <Switch
              checked={settings.notify_manager_on_ppt_generation}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notify_manager_on_ppt_generation: checked })
              }
              disabled={!settings.auto_generate_ppt_on_completion}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Template Settings
        </Button>
      </div>
    </div>
  );
}
