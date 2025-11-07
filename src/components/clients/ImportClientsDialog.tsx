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
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import { getStateCode } from "@/lib/stateCodeMapping";

interface ImportClientsDialogProps {
  onImportComplete: () => void;
}

interface PreviewRecord {
  row: number;
  data: any;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
}

export function ImportClientsDialog({ onImportComplete }: ImportClientsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateClientId = (state: string, existingCount: number): string => {
    const stateCode = getStateCode(state);
    const sequence = String(existingCount + 1).padStart(4, "0");
    return `${stateCode}-${sequence}`;
  };

  const validateRecord = (row: any, rowNum: number): PreviewRecord => {
    const issues: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';

    const name = row.name || row.Name || row.CLIENT_NAME;
    const email = row.email || row.Email || row.EMAIL;
    const state = row.state || row.State || row.STATE || "";
    const gstNumber = row.gst_number || row.GST || row.GSTIN || null;

    // Required field validation
    if (!name) {
      issues.push('Missing name');
      status = 'error';
    }

    if (!state) {
      issues.push('Missing state (needed for ID generation)');
      status = 'error';
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push('Invalid email format');
      status = status === 'error' ? 'error' : 'warning';
    }

    // GST validation
    if (gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)) {
      issues.push('Invalid GST format');
      status = status === 'error' ? 'error' : 'warning';
    }

    return {
      row: rowNum,
      data: {
        name,
        email,
        phone: row.phone || row.Phone || row.PHONE || null,
        company: row.company || row.Company || row.COMPANY || null,
        gst_number: gstNumber,
        address: row.address || row.Address || row.ADDRESS || null,
        city: row.city || row.City || row.CITY || null,
        state,
        contact_person: row.contact_person || row['Contact Person'] || row.CONTACT_PERSON || null,
        notes: row.notes || row.Notes || row.NOTES || null,
      },
      status,
      issues,
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate all records
      const validated = jsonData.map((row: any, index: number) => 
        validateRecord(row, index + 2) // +2 for Excel row (header is row 1)
      );

      setPreviewRecords(validated);
      setFileName(file.name);
      setShowPreview(true);
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Parse Failed",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmImport = async (updatedRecords: PreviewRecord[]) => {
    setIsImporting(true);
    
    // Filter only valid records from the updated data
    const validRecords = updatedRecords.filter(r => r.status === 'valid');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errorDetails: string[] = [];
    const skippedDetails: string[] = [];

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      console.log(`Starting import of ${validRecords.length} valid rows...`);

      for (const record of validRecords) {
        try {
          const { name, email, state, gst_number } = record.data;

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
              console.log(`Row ${record.row}: Skipped - Duplicate email (${email})`);
              skippedCount++;
              isDuplicate = true;
              continue;
            }
          }

          if (gst_number) {
            const { data: existingByGST } = await supabase
              .from('clients')
              .select('id, name, gst_number')
              .eq('gst_number', gst_number)
              .maybeSingle();

            if (existingByGST) {
              skippedDetails.push(`${name} (duplicate GST: ${gst_number})`);
              console.log(`Row ${record.row}: Skipped - Duplicate GST (${gst_number})`);
              skippedCount++;
              isDuplicate = true;
              continue;
            }
          }

          if (isDuplicate) continue;

          // Get count of existing clients with same state for ID generation
          const stateCode = getStateCode(state);
          const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .ilike('id', `${stateCode}%`);

          const clientId = generateClientId(state, count || 0);

          const client = {
            id: clientId,
            ...record.data,
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
            errorDetails.push(`Row ${record.row} (${name}): ${error.message}`);
            console.error(`Row ${record.row}: Failed - ${error.message}`, client);
            errorCount++;
          } else {
            console.log(`Row ${record.row}: Successfully imported (ID: ${clientId}, Name: ${name})`);
            successCount++;
          }
        } catch (err: any) {
          errorDetails.push(`Row ${record.row}: ${err.message}`);
          console.error(`Row ${record.row}: Error - ${err.message}`, record);
          errorCount++;
        }
      }

      // Log import to database
      await supabase.from('import_logs').insert({
        entity_type: 'clients',
        imported_by: user?.id,
        file_name: fileName,
        total_records: updatedRecords.length,
        success_count: successCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        errors: errorDetails,
        skipped_records: skippedDetails,
      });

      console.log('Import Summary:', { successCount, skippedCount, errorCount });
      
      const totalProcessed = successCount + skippedCount + errorCount;
      
      toast({
        title: "Import Complete",
        description: (
          <div className="space-y-1">
            <p>✅ Imported: {successCount}</p>
            {skippedCount > 0 && <p>⏭️ Skipped: {skippedCount} (already exist)</p>}
            {errorCount > 0 && <p>❌ Failed: {errorCount}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Processed {totalProcessed} of {updatedRecords.length} rows
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

      setShowPreview(false);
      setIsOpen(false);
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "An error occurred during import. Please try again.",
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
    <>
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
                  Choose Excel File
                </Button>
              </label>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx and .xls formats
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Records will be validated before import
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImportPreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        records={previewRecords}
        onConfirm={handleConfirmImport}
        isImporting={isImporting}
      />
    </>
  );
}
