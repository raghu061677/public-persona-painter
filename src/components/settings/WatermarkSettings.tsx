import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WatermarkPreview } from './WatermarkPreview';

export function WatermarkSettings() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    watermark_position: 'bottom-left',
    watermark_opacity: 0.6,
    watermark_text: 'PROOF OF INSTALLATION',
    watermark_include_logo: true,
    watermark_include_timestamp: true,
    watermark_font_size: 14,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('watermark_position, watermark_opacity, watermark_text, watermark_include_logo, watermark_include_timestamp, watermark_font_size')
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          watermark_position: data.watermark_position || 'bottom-left',
          watermark_opacity: data.watermark_opacity || 0.6,
          watermark_text: data.watermark_text || 'PROOF OF INSTALLATION',
          watermark_include_logo: data.watermark_include_logo ?? true,
          watermark_include_timestamp: data.watermark_include_timestamp ?? true,
          watermark_font_size: data.watermark_font_size || 14,
        });
      }
    } catch (error) {
      console.error('Error loading watermark settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasRole('admin')) {
      toast({
        title: 'Permission denied',
        description: 'Only admins can update watermark settings',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organization_settings')
        .update(settings)
        .eq('id', (await supabase.from('organization_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Watermark settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving watermark settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save watermark settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WatermarkPreview
        position={settings.watermark_position}
        opacity={settings.watermark_opacity}
        text={settings.watermark_text}
        includeLogo={settings.watermark_include_logo}
        includeTimestamp={settings.watermark_include_timestamp}
        fontSize={settings.watermark_font_size}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Watermark Settings
          </CardTitle>
          <CardDescription>
            Configure how watermarks appear on proof photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Position */}
        <div className="space-y-2">
          <Label>Watermark Position</Label>
          <Select
            value={settings.watermark_position}
            onValueChange={(value) => setSettings({ ...settings, watermark_position: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
              <SelectItem value="top-left">Top Left</SelectItem>
              <SelectItem value="top-right">Top Right</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Watermark Opacity</Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(settings.watermark_opacity * 100)}%
            </span>
          </div>
          <Slider
            value={[settings.watermark_opacity * 100]}
            onValueChange={([value]) => setSettings({ ...settings, watermark_opacity: value / 100 })}
            min={10}
            max={100}
            step={5}
          />
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Font Size</Label>
            <span className="text-sm text-muted-foreground">{settings.watermark_font_size}px</span>
          </div>
          <Slider
            value={[settings.watermark_font_size]}
            onValueChange={([value]) => setSettings({ ...settings, watermark_font_size: value })}
            min={10}
            max={30}
            step={1}
          />
        </div>

        {/* Watermark Text */}
        <div className="space-y-2">
          <Label>Watermark Text</Label>
          <Input
            value={settings.watermark_text}
            onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
            placeholder="PROOF OF INSTALLATION"
          />
        </div>

        {/* Include Logo */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Include Company Logo</Label>
            <p className="text-sm text-muted-foreground">
              Add your organization logo to the watermark
            </p>
          </div>
          <Switch
            checked={settings.watermark_include_logo}
            onCheckedChange={(checked) => setSettings({ ...settings, watermark_include_logo: checked })}
          />
        </div>

        {/* Include Timestamp */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Include Timestamp</Label>
            <p className="text-sm text-muted-foreground">
              Add date and time to the watermark
            </p>
          </div>
          <Switch
            checked={settings.watermark_include_timestamp}
            onCheckedChange={(checked) => setSettings({ ...settings, watermark_include_timestamp: checked })}
          />
        </div>

          <Button onClick={handleSave} disabled={saving || !hasRole('admin')} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Watermark Settings'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
