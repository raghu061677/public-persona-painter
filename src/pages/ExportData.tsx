import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Users, Calendar, Receipt } from "lucide-react";
import * as XLSX from "xlsx";

export default function ExportData() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (tableName: string, fileName: string) => {
    setLoading(tableName);
    try {
      const { data, error } = await supabase.from(tableName as any).select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data Found",
          description: `There is no data in the ${tableName} table to export.`,
        });
        return;
      }

      // Process data for Excel compatibility
      const processedData = data.map((item: any) => {
        const newItem: { [key: string]: any } = {};
        for (const key in item) {
          const value = item[key];
          // Convert dates to readable format
          if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            newItem[key] = new Date(value).toLocaleString();
          } 
          // Flatten JSON objects
          else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            for (const subKey in value) {
              newItem[`${key}_${subKey}`] = value[subKey];
            }
          }
          // Convert arrays to strings
          else if (Array.isArray(value)) {
            newItem[key] = value.join(', ');
          }
          else {
            newItem[key] = value;
          }
        }
        return newItem;
      });

      const worksheet = XLSX.utils.json_to_sheet(processedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
      XLSX.writeFile(workbook, `${fileName}.xlsx`);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} records from ${tableName}.`,
      });
    } catch (error: any) {
      console.error(`Error exporting ${tableName}:`, error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || `Could not export data from ${tableName}.`,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
          <p className="text-muted-foreground mt-1">
            Download your data in Excel (.xlsx) format.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Export Media Assets
            </CardTitle>
            <CardDescription>
              Download the complete list of all media assets in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("media_assets", "media-assets-export")}
              disabled={loading === "media_assets"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "media_assets" ? "Exporting..." : "Export Assets"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Export Clients
            </CardTitle>
            <CardDescription>
              Download the complete list of all your clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("clients", "clients-export")}
              disabled={loading === "clients"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "clients" ? "Exporting..." : "Export Clients"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Export Campaigns
            </CardTitle>
            <CardDescription>
              Download all campaign data including dates and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("campaigns", "campaigns-export")}
              disabled={loading === "campaigns"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "campaigns" ? "Exporting..." : "Export Campaigns"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Export Plans
            </CardTitle>
            <CardDescription>
              Download all plans/quotations with client details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("plans", "plans-export")}
              disabled={loading === "plans"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "plans" ? "Exporting..." : "Export Plans"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Export Invoices
            </CardTitle>
            <CardDescription>
              Download all invoice data with payment status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("invoices", "invoices-export")}
              disabled={loading === "invoices"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "invoices" ? "Exporting..." : "Export Invoices"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Export Expenses
            </CardTitle>
            <CardDescription>
              Download all expense records and vendor payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleExport("expenses", "expenses-export")}
              disabled={loading === "expenses"}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading === "expenses" ? "Exporting..." : "Export Expenses"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
