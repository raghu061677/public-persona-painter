import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

export default function PhotoLibrary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Library</h1>
        <p className="text-muted-foreground mt-2">
          Browse and manage campaign proof photos and asset images
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Image className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Photo Library Coming Soon</h3>
            <p className="text-muted-foreground">
              View and organize all campaign photos and asset images in one place
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
