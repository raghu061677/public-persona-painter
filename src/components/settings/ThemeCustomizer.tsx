import * as React from "react";
import { useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Palette, Type, Box, Zap, RotateCcw, Download, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const ThemeCustomizer: React.FC = () => {
  const { theme, fontFamily, fontSize, setTheme, setFontFamily, setFontSize } = useThemeStore();
  
  const [customColors, setCustomColors] = useState({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    secondary: getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    background: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
    foreground: getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim(),
  });

  const [borderRadius, setBorderRadius] = useState(
    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 8
  );

  const themes = [
    { value: 'light', label: 'Light', preview: 'bg-white border-2' },
    { value: 'dark', label: 'Dark', preview: 'bg-slate-900 border-2' },
    { value: 'brand-blue', label: 'Blue', preview: 'bg-blue-600 border-2' },
    { value: 'brand-green', label: 'Green', preview: 'bg-green-600 border-2' },
  ];

  const fonts = [
    { value: 'inter', label: 'Inter' },
    { value: 'poppins', label: 'Poppins' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'open-sans', label: 'Open Sans' },
    { value: 'lato', label: 'Lato' },
    { value: 'montserrat', label: 'Montserrat' },
    { value: 'nunito', label: 'Nunito' },
    { value: 'work-sans', label: 'Work Sans' },
  ];

  const fontSizes = [
    { value: 'small', label: 'Small (14px)' },
    { value: 'medium', label: 'Medium (16px)' },
    { value: 'large', label: 'Large (18px)' },
    { value: 'extra-large', label: 'Extra Large (20px)' },
  ];

  const applyCustomColor = (property: string, value: string) => {
    // Convert hex to HSL
    const hsl = hexToHSL(value);
    document.documentElement.style.setProperty(`--${property}`, hsl);
    setCustomColors(prev => ({ ...prev, [property]: hsl }));
  };

  const applyBorderRadius = (value: number) => {
    document.documentElement.style.setProperty('--radius', `${value}px`);
    setBorderRadius(value);
  };

  const resetToDefaults = () => {
    setTheme('light');
    setFontFamily('inter');
    setFontSize('medium');
    setBorderRadius(8);
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--secondary');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--radius');
    toast({
      title: "Theme reset",
      description: "All customizations have been reset to defaults.",
    });
  };

  const exportTheme = () => {
    const themeConfig = {
      theme,
      fontFamily,
      fontSize,
      customColors,
      borderRadius,
    };
    const blob = new Blob([JSON.stringify(themeConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Theme exported",
      description: "Your theme configuration has been downloaded.",
    });
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.theme) setTheme(config.theme);
        if (config.fontFamily) setFontFamily(config.fontFamily);
        if (config.fontSize) setFontSize(config.fontSize);
        if (config.borderRadius) applyBorderRadius(config.borderRadius);
        if (config.customColors) {
          Object.entries(config.customColors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value as string);
          });
          setCustomColors(config.customColors);
        }
        toast({
          title: "Theme imported",
          description: "Your theme configuration has been applied.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: "Invalid theme configuration file.",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Theme Customizer</h2>
          <p className="text-muted-foreground">Customize the look and feel of your application</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={exportTheme}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importTheme}
              />
            </label>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">
            <Palette className="w-4 h-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="w-4 h-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="layout">
            <Box className="w-4 h-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Zap className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Presets</CardTitle>
              <CardDescription>Choose a predefined theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value as any)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:scale-105",
                      theme === t.value ? "ring-2 ring-primary" : "opacity-70"
                    )}
                  >
                    <div className={cn("w-full h-20 rounded mb-2", t.preview)} />
                    <p className="text-sm font-medium">{t.label}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Colors</CardTitle>
              <CardDescription>Fine-tune individual color tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(customColors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <Label className="w-32 capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input
                    type="color"
                    value={hslToHex(value)}
                    onChange={(e) => applyCustomColor(key, e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      document.documentElement.style.setProperty(`--${key}`, e.target.value);
                      setCustomColors(prev => ({ ...prev, [key]: e.target.value }));
                    }}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Font Family</CardTitle>
              <CardDescription>Choose your preferred font</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fontFamily} onValueChange={(value) => setFontFamily(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((font) => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.label }}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Font Size</CardTitle>
              <CardDescription>Adjust the base font size</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fontSize} onValueChange={(value) => setFontSize(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
              <CardDescription>Adjust the roundness of UI elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider
                value={[borderRadius]}
                onValueChange={(value) => applyBorderRadius(value[0])}
                min={0}
                max={24}
                step={1}
              />
              <div className="text-sm text-center text-muted-foreground">
                {borderRadius}px
              </div>
              <div className="flex gap-4 justify-center">
                <div className="w-20 h-20 bg-primary" style={{ borderRadius: `${borderRadius}px` }} />
                <div className="w-20 h-20 bg-secondary" style={{ borderRadius: `${borderRadius}px` }} />
                <div className="w-20 h-20 bg-accent" style={{ borderRadius: `${borderRadius}px` }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>See how your customizations look</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description text</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">This is example content in a card.</p>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
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
}

function hslToHex(hsl: string): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return '#000000';

  const h = parseInt(parts[1]) / 360;
  const s = parseInt(parts[2]) / 100;
  const l = parseInt(parts[3]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
