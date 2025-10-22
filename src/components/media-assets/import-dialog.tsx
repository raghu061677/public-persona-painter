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

interface ImportDialogProps {
  onImportComplete: () => void;
}

export function ImportDialog({ onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      for (const row of jsonData as any[]) {
        try {
          // Helper function to safely parse numeric values
          const parseNumeric = (value: any, defaultVal: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultVal;
            const num = parseFloat(String(value).replace(/,/g, ''));
            return isNaN(num) ? defaultVal : num;
          };

          const asset = {
            id: row.id || row.ID || row['Asset ID'],
            media_type: row.media_type || row['Media Type'],
            location: row.location || row.Location,
            area: row.area || row.Area,
            city: row.city || row.City,
            district: row.district || row.District,
            state: row.state || row.State,
            dimensions: row.dimensions || row.Dimensions,
            total_sqft: parseNumeric(row.total_sqft || row['Total Sqft'] || row['Total Sq Ft'], 0),
            card_rate: parseNumeric(row.card_rate || row['Card Rate'], 0),
            base_rent: parseNumeric(row.base_rent || row['Base Rent'], 0),
            gst_percent: parseNumeric(row.gst_percent || row['GST %'] || row['GST Percent'], 18),
            status: row.status || row.Status || 'Available',
            category: row.category || row.Category || 'OOH',
            illumination: row.illumination || row.Illumination || null,
            direction: row.direction || row.Direction || null,
            latitude: parseNumeric(row.latitude || row.Latitude, null),
            longitude: parseNumeric(row.longitude || row.Longitude, null),
            ownership: row.ownership || row.Ownership || 'own',
            printing_charges: parseNumeric(row.printing_charges || row['Printing Charges'], 0),
            mounting_charges: parseNumeric(row.mounting_charges || row['Mounting Charges'], 0),
          };

          // Remove null/undefined values to prevent database errors
          Object.keys(asset).forEach(key => {
            if (asset[key as keyof typeof asset] === null || asset[key as keyof typeof asset] === undefined) {
              delete asset[key as keyof typeof asset];
            }
          });

          // Check if record already exists
          const { data: existing } = await supabase
            .from('media_assets')
            .select('id')
            .eq('id', asset.id)
            .maybeSingle();

          if (existing) {
            console.log(`Row ${jsonData.indexOf(row) + 1}: Skipped - Record already exists (ID: ${asset.id})`);
            skippedCount++;
            continue;
          }

          // Insert only if it doesn't exist
          const { error } = await supabase
            .from('media_assets')
            .insert(asset);

          if (error) {
            console.error(`Row ${jsonData.indexOf(row) + 1}: Failed - ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.error(`Row ${jsonData.indexOf(row) + 1}: Error - ${err.message}`);
          errorCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} assets. ${skippedCount} skipped (already exist). ${errorCount} errors.`,
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
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Media Assets</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) with media asset data. The file should have columns for ID, Media Type, Location, City, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                type="button"
                variant="outline"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                {isImporting ? "Importing..." : "Choose File"}
              </Button>
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Supports .xlsx and .xls files
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
