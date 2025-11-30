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
      // Get current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to import assets",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) {
        toast({
          title: "Error",
          description: "Company not found for user",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

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
          // Helper function to safely parse numeric values
          const parseNumeric = (value: any, defaultVal: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultVal;
            const num = parseFloat(String(value).replace(/,/g, ''));
            return isNaN(num) ? defaultVal : num;
          };

          const assetId = row.id || row.ID || row['Asset ID'];
          
          if (!assetId) {
            errorDetails.push(`Row ${rowNum}: Missing Asset ID`);
            errorCount++;
            continue;
          }

          const asset = {
            id: assetId,
            media_type: row.media_type || row['Media Type'],
            location: row.location || row.Location,
            area: row.area || row.Area,
            city: row.city || row.City,
            district: row.district || row.District,
            state: row.state || row.State,
            dimensions: row.dimensions || row.Dimensions,
            total_sqft: parseNumeric(row.total_sqft || row['Total Sqft'] || row['Total Sq Ft'], 0),
            card_rate: parseNumeric(row.card_rate || row['Card Rate'], 0),
            base_rate: parseNumeric(row.base_rate || row.base_rent || row['Base Rate'] || row['Base Rent'], 0),
            gst_percent: parseNumeric(row.gst_percent || row['GST %'] || row['GST Percent'], 18),
            status: row.status || row.Status || 'Available',
            category: row.category || row.Category || 'OOH',
            illumination_type: row.illumination_type || row.illumination || row.Illumination || row['Illumination Type'] || null,
            direction: row.direction || row.Direction || null,
            latitude: parseNumeric(row.latitude || row.Latitude, null),
            longitude: parseNumeric(row.longitude || row.Longitude, null),
            ownership: row.ownership || row.Ownership || 'own',
            printing_rate_default: parseNumeric(row.printing_rate_default || row.printing_charges || row['Printing Charges'] || row['Printing Rate'], 0),
            mounting_rate_default: parseNumeric(row.mounting_rate_default || row.mounting_charges || row['Mounting Charges'] || row['Mounting Rate'], 0),
            company_id: companyUser.company_id,
          };

          // Remove null/undefined values to prevent database errors
          Object.keys(asset).forEach(key => {
            if (asset[key as keyof typeof asset] === null || asset[key as keyof typeof asset] === undefined) {
              delete asset[key as keyof typeof asset];
            }
          });

          // Check for duplicates based on ID, or location+coordinates
          let query = supabase
            .from('media_assets')
            .select('id, location, latitude, longitude');

          // Check by ID first
          const { data: existingById } = await query
            .eq('id', asset.id)
            .maybeSingle();

          if (existingById) {
            skippedDetails.push(`${asset.id} (duplicate ID)`);
            console.log(`Row ${rowNum}: Skipped - Duplicate ID (${asset.id})`);
            skippedCount++;
            continue;
          }

          // Check by location AND coordinates (if both are present)
          if (asset.location && asset.latitude && asset.longitude) {
            const { data: existingByLocation } = await supabase
              .from('media_assets')
              .select('id, location, latitude, longitude')
              .eq('location', asset.location)
              .eq('latitude', asset.latitude)
              .eq('longitude', asset.longitude)
              .maybeSingle();

            if (existingByLocation) {
              skippedDetails.push(`${asset.id} (duplicate location+coordinates: ${asset.location})`);
              console.log(`Row ${rowNum}: Skipped - Duplicate location and coordinates (${asset.location} at ${asset.latitude}, ${asset.longitude})`);
              skippedCount++;
              continue;
            }
          }

          // Insert only if it doesn't exist
          const { error } = await supabase
            .from('media_assets')
            .insert([asset]);

          if (error) {
            errorDetails.push(`Row ${rowNum} (${asset.id}): ${error.message}`);
            console.error(`Row ${rowNum}: Failed - ${error.message}`, asset);
            errorCount++;
          } else {
            console.log(`Row ${rowNum}: Successfully imported (ID: ${asset.id})`);
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
        console.log('Skipped assets:', skippedDetails);
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
          <DialogTitle className="text-2xl">Import Media Assets</DialogTitle>
          <DialogDescription className="text-base">
            Upload an Excel file (.xlsx) with your media asset inventory data
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
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
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
