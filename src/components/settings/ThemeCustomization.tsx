import { useThemeStore } from "@/store/themeStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Palette, Type, ArrowUpDown, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ThemeCustomization() {
  const { fontFamily, fontSize, cardColors, setFontFamily, setFontSize, setCardColors } = useThemeStore();

  const fontOptions = [
    { value: "inter", label: "Inter (Default)", description: "Clean and modern" },
    { value: "poppins", label: "Poppins", description: "Geometric & friendly" },
    { value: "roboto", label: "Roboto", description: "Google's signature font" },
    { value: "open-sans", label: "Open Sans", description: "Neutral & professional" },
    { value: "lato", label: "Lato", description: "Warm & approachable" },
    { value: "montserrat", label: "Montserrat", description: "Bold & contemporary" },
    { value: "nunito", label: "Nunito", description: "Rounded & soft" },
    { value: "work-sans", label: "Work Sans", description: "Technical & precise" },
  ];

  const fontSizeOptions = [
    { value: "small", label: "Small (14px)", description: "Compact view" },
    { value: "medium", label: "Medium (16px)", description: "Default size" },
    { value: "large", label: "Large (18px)", description: "Comfortable reading" },
    { value: "extra-large", label: "Extra Large (20px)", description: "Maximum visibility" },
  ];

  const colorOptions = [
    { value: "blue", label: "Blue", color: "bg-blue-500" },
    { value: "green", label: "Green", color: "bg-green-500" },
    { value: "orange", label: "Orange", color: "bg-orange-500" },
    { value: "purple", label: "Purple", color: "bg-purple-500" },
    { value: "red", label: "Red", color: "bg-red-500" },
    { value: "amber", label: "Amber", color: "bg-amber-500" },
  ];

  const handleResetToDefaults = () => {
    setFontFamily("inter");
    setFontSize("medium");
    setCardColors({
      client: "blue",
      campaign: "green",
      financial: "orange",
      secondary: "purple",
    });
    toast({
      title: "Theme Reset",
      description: "All theme settings have been reset to defaults",
    });
  };

  return (
    <div className="space-y-6">
      {/* Font Settings */}
      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-purple-500" />
            Typography Settings
          </CardTitle>
          <CardDescription>
            Customize font family and size for better readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Family */}
          <div className="space-y-2">
            <Label htmlFor="font-family" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Font Family
            </Label>
            <Select value={fontFamily} onValueChange={(value: any) => setFontFamily(value)}>
              <SelectTrigger id="font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{font.label}</span>
                      <span className="text-xs text-muted-foreground">{font.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label htmlFor="font-size" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Font Size
            </Label>
            <Select value={fontSize} onValueChange={(value: any) => setFontSize(value)}>
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizeOptions.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{size.label}</span>
                      <span className="text-xs text-muted-foreground">{size.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Card Color Scheme */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-500" />
            Card Color Scheme
          </CardTitle>
          <CardDescription>
            Customize border colors for different card types across the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Information Cards */}
          <div className="space-y-2">
            <Label htmlFor="client-color">Client Information Cards</Label>
            <Select
              value={cardColors.client}
              onValueChange={(value) => setCardColors({ ...cardColors, client: value })}
            >
              <SelectTrigger id="client-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color.color}`} />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Period Cards */}
          <div className="space-y-2">
            <Label htmlFor="campaign-color">Campaign Period Cards</Label>
            <Select
              value={cardColors.campaign}
              onValueChange={(value) => setCardColors({ ...cardColors, campaign: value })}
            >
              <SelectTrigger id="campaign-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color.color}`} />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Financial Summary Cards */}
          <div className="space-y-2">
            <Label htmlFor="financial-color">Financial Summary Cards</Label>
            <Select
              value={cardColors.financial}
              onValueChange={(value) => setCardColors({ ...cardColors, financial: value })}
            >
              <SelectTrigger id="financial-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color.color}`} />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary/Other Cards */}
          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Cards (Plans, Reports)</Label>
            <Select
              value={cardColors.secondary}
              onValueChange={(value) => setCardColors({ ...cardColors, secondary: value })}
            >
              <SelectTrigger id="secondary-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color.color}`} />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleResetToDefaults}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
