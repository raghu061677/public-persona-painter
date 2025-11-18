import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

export default function OperationsCreatives() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creative Assets Received</h1>
        <p className="text-muted-foreground">
          Track client creatives for campaign execution
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Creative Submissions
          </CardTitle>
          <CardDescription>
            Monitor creative asset submissions from clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No creative assets yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Client creative submissions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
