import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function PlatformReportBilling() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Billing Reports</h1>
        <p className="text-muted-foreground">
          Subscription revenue and commission tracking
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Platform Revenue Analytics
          </CardTitle>
          <CardDescription>
            Track subscription fees, commissions, and platform revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No billing data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Platform billing reports will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
