import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: any[] } | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        id: "HYD-BSQ-0001",
        city: "Hyderabad",
        area: "Begumpet",
        location: "Opposite Metro Station",
        media_type: "Bus Shelter",
        category: "premium",
        dimension: "10x5 ft",
        direction: "North",
        latitude: 17.4416,
        longitude: 78.4755,
        card_rate: 15000,
        base_rent: 5000,
        printing_charges: 2000,
        mounting_charges: 1000,
        status: "Available",
        is_public: true,
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets Template");
    XLSX.writeFile(wb, "media_assets_template.xlsx");

    toast({
      title: "Template downloaded",
      description: "Fill in the template and upload to import assets",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setProgress(0);
      setResults(null);

      // Get current user's company_id
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .single();

      if (!companyUser) {
        throw new Error("No active company association found");
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: any[] = [];
      let successCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        setProgress(((i + 1) / jsonData.length) * 100);

        try {
          // Validate required fields
          if (!row.id || !row.city || !row.area || !row.location) {
            errors.push({ row: i + 2, error: "Missing required fields" });
            continue;
          }

          // Insert asset
          const { error } = await supabase.from('media_assets').insert({
            id: row.id,
            company_id: companyUser.company_id,
            city: row.city,
            area: row.area,
            location: row.location,
            media_type: row.media_type || 'Bus Shelter',
            dimensions: row.dimension || '',
            direction: row.direction,
            latitude: row.latitude,
            longitude: row.longitude,
            card_rate: row.card_rate || 0,
            base_rent: row.base_rent || 0,
            printing_charges: row.printing_charges || 0,
            mounting_charges: row.mounting_charges || 0,
            status: row.status || 'Available',
            is_public: row.is_public ?? true,
          });

          if (error) {
            errors.push({ row: i + 2, id: row.id, error: error.message });
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push({ row: i + 2, id: row.id, error: err.message });
        }
      }

      setResults({ success: successCount, errors });

      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} assets`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Media Assets</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple media assets at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Get the Excel template with correct format
                </p>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Upload File */}
          <div className="space-y-3">
            <label htmlFor="file-upload" className="block">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary cursor-pointer transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Click to upload Excel file</p>
                <p className="text-sm text-muted-foreground">
                  Supports .xlsx and .xls formats
                </p>
              </div>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing assets...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results && (
            <Alert>
              <AlertDescription className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    {results.success} assets imported successfully
                  </span>
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">
                        {results.errors.length} errors occurred
                      </span>
                    </div>
                    <div className="max-h-32 overflow-auto space-y-1 text-sm">
                      {results.errors.map((err, i) => (
                        <div key={i} className="text-muted-foreground">
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
