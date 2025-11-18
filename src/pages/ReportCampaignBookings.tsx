import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function ReportCampaignBookings() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign-wise Bookings</h1>
        <p className="text-muted-foreground">
          Analyze bookings by campaign
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Campaign Booking Analytics
          </CardTitle>
          <CardDescription>
            View booking details and performance per campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Campaign booking reports will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
