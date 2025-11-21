import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeCustomization } from "@/components/settings/ThemeCustomization";
import { ColorLegend } from "@/components/settings/ColorLegend";
import { Palette, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ThemeSettings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Palette className="h-8 w-8" />
          Theme Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Customize the appearance and color scheme of your application
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Theme settings are saved automatically and apply instantly across your workspace.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Appearance Customization</CardTitle>
          <CardDescription>
            Configure fonts, colors, and visual elements to match your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeCustomization />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Reference Guide</CardTitle>
          <CardDescription>
            Understanding the color coding system used throughout the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ColorLegend />
        </CardContent>
      </Card>
    </div>
  );
}
