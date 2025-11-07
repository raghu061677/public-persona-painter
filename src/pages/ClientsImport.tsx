import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { ImportClientsDialog } from "@/components/clients/ImportClientsDialog";
import { ImportHistoryDialog } from "@/components/clients/ImportHistoryDialog";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

export default function ClientsImport() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        name: "ABC Advertising Ltd",
        email: "info@abcads.com",
        phone: "+91 9876543210",
        company: "ABC Advertising Ltd",
        gst_number: "29ABCDE1234F1Z5",
        address: "123 MG Road, Commercial Complex",
        city: "Bangalore",
        state: "Karnataka",
        contact_person: "John Doe",
        notes: "Premium client - Regular campaigns",
        billing_address_line1: "123 MG Road",
        billing_address_line2: "Commercial Complex, 2nd Floor",
        billing_city: "Bangalore",
        billing_state: "Karnataka",
        billing_pincode: "560001",
        shipping_same_as_billing: "true"
      },
      {
        name: "XYZ Media Solutions",
        email: "contact@xyzmedia.com",
        phone: "+91 9123456789",
        company: "XYZ Media Solutions Pvt Ltd",
        gst_number: "36XYZAB5678C2Z3",
        address: "456 Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        contact_person: "Jane Smith",
        notes: "New client - First campaign",
        billing_address_line1: "456 Banjara Hills",
        billing_address_line2: "Road No 12",
        billing_city: "Hyderabad",
        billing_state: "Telangana",
        billing_pincode: "500034",
        shipping_same_as_billing: "false"
      },
      {
        name: "PQR Outdoor Marketing",
        email: "sales@pqroutdoor.in",
        phone: "+91 9988776655",
        company: "PQR Outdoor Marketing",
        gst_number: "27PQRST9012D3Z1",
        address: "789 Andheri West",
        city: "Mumbai",
        state: "Maharashtra",
        contact_person: "Rajesh Kumar",
        notes: "",
        billing_address_line1: "789 Andheri West",
        billing_address_line2: "Near Railway Station",
        billing_city: "Mumbai",
        billing_state: "Maharashtra",
        billing_pincode: "400058",
        shipping_same_as_billing: "true"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 25 }, // name
      { wch: 25 }, // email
      { wch: 18 }, // phone
      { wch: 30 }, // company
      { wch: 18 }, // gst_number
      { wch: 35 }, // address
      { wch: 15 }, // city
      { wch: 15 }, // state
      { wch: 20 }, // contact_person
      { wch: 30 }, // notes
      { wch: 35 }, // billing_address_line1
      { wch: 35 }, // billing_address_line2
      { wch: 15 }, // billing_city
      { wch: 15 }, // billing_state
      { wch: 12 }, // billing_pincode
      { wch: 20 }, // shipping_same_as_billing
    ];

    XLSX.writeFile(workbook, "clients_import_sample.xlsx");
    
    toast({
      title: "Sample file downloaded",
      description: "Use this template to prepare your client data for import.",
    });
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

          <div className="flex justify-center gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleDownloadSample}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Sample File
            </Button>
            <ImportHistoryDialog />
            <ImportClientsDialog onImportComplete={handleImportComplete} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
