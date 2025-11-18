import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function PlatformReportCompanyUsage() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Usage Analytics</h1>
        <p className="text-muted-foreground">
          Monitor platform usage across all tenant companies
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Multi-Tenant Usage Metrics
          </CardTitle>
          <CardDescription>
            Track active users, assets, campaigns, and feature adoption per company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No usage data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Company usage analytics will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
