import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function ImportData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import data from Excel, CSV, or other formats
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Import Media Assets</CardTitle>
            <CardDescription>
              Upload an Excel or CSV file with media asset details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset File
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Clients</CardTitle>
            <CardDescription>
              Bulk import client information from a spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Client File
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Campaigns</CardTitle>
            <CardDescription>
              Import campaign data with associated assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Campaign File
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
