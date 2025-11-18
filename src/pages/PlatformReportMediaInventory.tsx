import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function PlatformReportMediaInventory() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Media Inventory</h1>
        <p className="text-muted-foreground">
          Platform-wide media asset overview
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            All Tenant Assets
          </CardTitle>
          <CardDescription>
            View and analyze media assets across all companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Map className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No inventory data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Global media inventory will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
