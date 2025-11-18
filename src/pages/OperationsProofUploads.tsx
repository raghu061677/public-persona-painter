import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

export default function OperationsProofUploads() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof Photo Uploads</h1>
        <p className="text-muted-foreground">
          Review and manage installation proof photos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Proof Photo Gallery
          </CardTitle>
          <CardDescription>
            View all uploaded proof photos for campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No proof photos uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Installation proof photos will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
