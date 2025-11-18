import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function ReportFinancialSummary() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Summary</h1>
        <p className="text-muted-foreground">
          Comprehensive financial overview and insights
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </CardTitle>
          <CardDescription>
            Revenue, expenses, and profitability analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Financial summary reports will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
