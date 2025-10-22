import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground mt-2">
          Export data to Excel, CSV, or PDF formats
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Media Assets</CardTitle>
            <CardDescription>
              Download all media assets with specifications and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Campaigns</CardTitle>
            <CardDescription>
              Download campaign reports with asset details and status
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Financial Data</CardTitle>
            <CardDescription>
              Export invoices, expenses, and financial reports
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Clients</CardTitle>
            <CardDescription>
              Download client database with contact and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
