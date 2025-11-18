import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

export default function ReportProofExecution() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof-of-Execution Reports</h1>
        <p className="text-muted-foreground">
          Campaign execution and proof photo analytics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Execution Proof Analytics
          </CardTitle>
          <CardDescription>
            Track installation completion and proof photo submission rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Execution reports will appear here once campaigns are active
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
