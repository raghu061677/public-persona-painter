import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ImportClientsDialog } from "@/components/clients/ImportClientsDialog";

export default function ClientsImport() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/admin/import')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Clients</h1>
          <p className="text-muted-foreground mt-1">
            Bulk upload client data from Excel spreadsheets
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Excel File Requirements</CardTitle>
          <CardDescription>
            Your Excel file should contain the following columns (case-insensitive):
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Required Columns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>name / Name / CLIENT_NAME</li>
                <li>state / State / STATE (for ID generation)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Optional Columns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>email / Email / EMAIL</li>
                <li>phone / Phone / PHONE</li>
                <li>company / Company / COMPANY</li>
                <li>gst_number / GST / GSTIN</li>
                <li>address / Address / ADDRESS</li>
                <li>city / City / CITY</li>
                <li>contact_person / Contact Person</li>
                <li>notes / Notes / NOTES</li>
                <li>billing_address_line1, billing_city, etc.</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Client IDs will be auto-generated based on state (e.g., TS-0001, KA-0002)</li>
              <li>Duplicate records (same email or GST number) will be skipped</li>
              <li>The system supports .xlsx and .xls file formats</li>
              <li>All imported data will be validated before insertion</li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <ImportClientsDialog onImportComplete={handleImportComplete} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
