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

      for (const row of jsonData as any[]) {
        try {
          const asset = {
            id: row.id || row.ID || row['Asset ID'],
            media_type: row.media_type || row['Media Type'],
            location: row.location || row.Location,
            area: row.area || row.Area,
            city: row.city || row.City,
            district: row.district || row.District,
            state: row.state || row.State,
            dimensions: row.dimensions || row.Dimensions,
            total_sqft: parseFloat(row.total_sqft || row['Total Sqft'] || 0),
            card_rate: parseFloat(row.card_rate || row['Card Rate'] || 0),
            base_rent: parseFloat(row.base_rent || row['Base Rent'] || 0),
            gst_percent: parseFloat(row.gst_percent || row['GST %'] || 18),
            status: row.status || row.Status || 'Available',
            category: row.category || row.Category || 'OOH',
          };

          const { error } = await supabase
            .from('media_assets')
            .upsert(asset, { onConflict: 'id' });

          if (error) {
            console.error('Error importing asset:', error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Error processing row:', err);
          errorCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} assets. ${errorCount} errors.`,
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
