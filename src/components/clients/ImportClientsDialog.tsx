import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface ImportClientsDialogProps {
  onImportComplete: () => void;
}

export function ImportClientsDialog({ onImportComplete }: ImportClientsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateClientId = (state: string, existingCount: number): string => {
    const stateCode = state?.substring(0, 2).toUpperCase() || "XX";
    const sequence = String(existingCount + 1).padStart(4, "0");
    return `${stateCode}-${sequence}`;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];
      const skippedDetails: string[] = [];

      console.log(`Starting import of ${jsonData.length} rows...`);

      for (const row of jsonData as any[]) {
        const rowNum = jsonData.indexOf(row) + 1;
        try {
          const name = row.name || row.Name || row.CLIENT_NAME;
          const email = row.email || row.Email || row.EMAIL;
          const state = row.state || row.State || row.STATE || "";
          
          if (!name) {
            errorDetails.push(`Row ${rowNum}: Missing client name`);
            errorCount++;
            continue;
          }

          // Check for duplicate by email or GST number
          let isDuplicate = false;
          
          if (email) {
            const { data: existingByEmail } = await supabase
              .from('clients')
              .select('id, name, email')
              .eq('email', email)
              .maybeSingle();

            if (existingByEmail) {
              skippedDetails.push(`${name} (duplicate email: ${email})`);
              console.log(`Row ${rowNum}: Skipped - Duplicate email (${email})`);
              skippedCount++;
              isDuplicate = true;
              continue;
            }
          }

          const gstNumber = row.gst_number || row.GST || row.GSTIN || null;
          if (gstNumber) {
            const { data: existingByGST } = await supabase
              .from('clients')
              .select('id, name, gst_number')
              .eq('gst_number', gstNumber)
              .maybeSingle();

            if (existingByGST) {
              skippedDetails.push(`${name} (duplicate GST: ${gstNumber})`);
              console.log(`Row ${rowNum}: Skipped - Duplicate GST (${gstNumber})`);
              skippedCount++;
              isDuplicate = true;
              continue;
            }
          }

          if (isDuplicate) continue;

          // Get count of existing clients with same state for ID generation
          const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .ilike('id', `${state.substring(0, 2).toUpperCase()}%`);

          const clientId = generateClientId(state, count || 0);

          const client = {
            id: clientId,
            name,
            email: email || null,
            phone: row.phone || row.Phone || row.PHONE || null,
            company: row.company || row.Company || row.COMPANY || null,
            gst_number: gstNumber,
            address: row.address || row.Address || row.ADDRESS || null,
            city: row.city || row.City || row.CITY || null,
            state,
            contact_person: row.contact_person || row['Contact Person'] || row.CONTACT_PERSON || null,
            notes: row.notes || row.Notes || row.NOTES || null,
            billing_address_line1: row.billing_address_line1 || row['Billing Address Line 1'] || null,
            billing_address_line2: row.billing_address_line2 || row['Billing Address Line 2'] || null,
            billing_city: row.billing_city || row['Billing City'] || null,
            billing_state: row.billing_state || row['Billing State'] || null,
            billing_pincode: row.billing_pincode || row['Billing Pincode'] || null,
            shipping_same_as_billing: row.shipping_same_as_billing === true || row.shipping_same_as_billing === 'true' || row.shipping_same_as_billing === 'TRUE' || false,
          };

          // Remove null/undefined values
          Object.keys(client).forEach(key => {
            if (client[key as keyof typeof client] === null || client[key as keyof typeof client] === undefined) {
              delete client[key as keyof typeof client];
            }
          });

          const { error } = await supabase
            .from('clients')
            .insert(client);

          if (error) {
            errorDetails.push(`Row ${rowNum} (${name}): ${error.message}`);
            console.error(`Row ${rowNum}: Failed - ${error.message}`, client);
            errorCount++;
          } else {
            console.log(`Row ${rowNum}: Successfully imported (ID: ${clientId}, Name: ${name})`);
            successCount++;
          }
        } catch (err: any) {
          errorDetails.push(`Row ${rowNum}: ${err.message}`);
          console.error(`Row ${rowNum}: Error - ${err.message}`, row);
          errorCount++;
        }
      }

      console.log('Import Summary:', { successCount, skippedCount, errorCount });
      if (errorDetails.length > 0) {
        console.error('Failed imports:', errorDetails);
      }
      if (skippedDetails.length > 0) {
        console.log('Skipped clients:', skippedDetails);
      }

      const totalProcessed = successCount + skippedCount + errorCount;
      
      toast({
        title: "Import Complete",
        description: (
          <div className="space-y-1">
            <p>✅ Imported: {successCount}</p>
            {skippedCount > 0 && <p>⏭️ Skipped: {skippedCount} (already exist)</p>}
            {errorCount > 0 && <p>❌ Failed: {errorCount}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Processed {totalProcessed} of {jsonData.length} rows
            </p>
            {errorCount > 0 && (
              <p className="text-xs text-destructive mt-1">
                Check console for error details
              </p>
            )}
          </div>
        ),
        variant: errorCount > 0 ? "destructive" : "default",
      });

      setIsOpen(false);
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import Clients</DialogTitle>
          <DialogDescription className="text-base">
            Upload an Excel file (.xlsx) with your client data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/20 transition-all duration-200">
            <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-primary/60" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="client-file-upload"
            />
            <label htmlFor="client-file-upload" className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="mb-3"
              >
                {isImporting ? "Importing..." : "Choose Excel File"}
              </Button>
            </label>
            <p className="text-sm text-muted-foreground">
              Supports .xlsx and .xls formats
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Existing records will be skipped automatically
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
