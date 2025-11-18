import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck } from "lucide-react";

export default function OperationsPrinting() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Printing Status</h1>
        <p className="text-muted-foreground">
          Monitor printing progress for campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Printing Queue
          </CardTitle>
          <CardDescription>
            Track printing status for all active campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No printing jobs in queue</p>
            <p className="text-sm text-muted-foreground mt-2">
              Printing tasks will appear here once campaigns start
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
