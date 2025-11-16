import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { ImportClientsDialog } from "@/components/clients/ImportClientsDialog";
import { ImportHistoryDialog } from "@/components/clients/ImportHistoryDialog";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ROUTES } from "@/config/routes";
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
      <PageHeader
        title="Import Clients"
        description="Upload client data from Excel files"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Clients", path: ROUTES.CLIENTS },
          { label: "Import" },
        ]}
        showBackButton
        backPath={ROUTES.CLIENTS}
        actions={
          <>
            <ImportHistoryDialog key={refreshKey} />
            <Button onClick={handleDownloadSample} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Sample
            </Button>
            <ImportClientsDialog onImportComplete={handleImportComplete} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
          <CardDescription>
            Follow these steps to import your client data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Step 1: Download Sample File</h4>
            <p className="text-sm text-muted-foreground">
              Click the "Download Sample" button to get a template Excel file with the correct format.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Step 2: Prepare Your Data</h4>
            <p className="text-sm text-muted-foreground">
              Fill in your client data using the sample file as a template. Required fields are:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
              <li>name - Client name (required)</li>
              <li>state - State code (required for ID generation)</li>
              <li>email - Valid email address</li>
              <li>phone - 10-digit phone number</li>
              <li>gst_number - Valid GST format (optional)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Step 3: Import the File</h4>
            <p className="text-sm text-muted-foreground">
              Click "Import Clients" and select your prepared Excel file. The system will:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
              <li>Validate all data fields</li>
              <li>Auto-generate client IDs based on state</li>
              <li>Check for duplicate records</li>
              <li>Show a preview before final import</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Step 4: Review & Confirm</h4>
            <p className="text-sm text-muted-foreground">
              Review the import summary showing successful imports, errors, and skipped records.
              You can view detailed logs in the Import History.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
