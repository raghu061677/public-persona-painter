import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import { buildSearchTokens } from "@/utils/mediaAssets";

// City code mapping
const CITY_CODE_MAP: Record<string, string> = {
  'Hyderabad': 'HYD',
  'Karimnagar': 'KNR',
  'Husnabad': 'HSB',
  'Sircilla': 'SRL',
  'Sanga Reddy': 'SRD',
  'Ranga Reddy': 'RRD',
};

// Media type code mapping
const MEDIA_TYPE_CODE_MAP: Record<string, string> = {
  'Bus Shelter': 'BSQ',
  'Bus Shetlter': 'BSQ', // Handle typo
  'Billboard': 'BB',
  'Unipole': 'UNP',
  'Cantilever': 'CNT',
};

export default function MediaAssetsImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, failed: 0 });

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const getCityCode = (city: string): string => {
    return CITY_CODE_MAP[city] || city.substring(0, 3).toUpperCase();
  };

  const getMediaTypeCode = (mediaType: string): string => {
    return MEDIA_TYPE_CODE_MAP[mediaType] || mediaType.substring(0, 3).toUpperCase();
  };

  const generateAssetId = async (city: string, mediaType: string): Promise<string> => {
    const cityCode = getCityCode(city);
    const typeCode = getMediaTypeCode(mediaType);
    
    const pattern = `${cityCode}-${typeCode}-%`;
    const { data, error } = await supabase
      .from('media_assets')
      .select('id')
      .ilike('id', pattern)
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last ID:', error);
      return `${cityCode}-${typeCode}-0001`;
    }

    let nextSerial = 1;
    if (data && data.length > 0) {
      const lastId = data[0].id;
      const parts = lastId.split('-');
      if (parts.length === 3) {
        const lastSerial = parseInt(parts[2], 10);
        nextSerial = lastSerial + 1;
      }
    }

    const paddedSerial = String(nextSerial).padStart(4, '0');
    return `${cityCode}-${typeCode}-${paddedSerial}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLogs([]);
      setImportStats({ total: 0, success: 0, failed: 0 });
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setLogs([]);
    addLog('Starting import process...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      addLog('Parsing Excel file...');
      const rows = await parseExcelFile(file);
      addLog(`Found ${rows.length} rows in Excel file`);

      setImportStats({ total: rows.length, success: 0, failed: 0 });
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row: any = rows[i];
        
        try {
          // Skip if essential data is missing
          if (!row.city || !row.mediaType || !row.location) {
            addLog(`Row ${i + 1}: Skipped - Missing essential data (city, mediaType, or location)`);
            failedCount++;
            continue;
          }

          // Generate asset ID
          const assetId = await generateAssetId(row.city, row.mediaType);
          addLog(`Row ${i + 1}: Generated ID ${assetId} for ${row.location}`);

          // Parse dimensions
          const dimensions = row.dimensions || '';
          let totalSqft = null;
          if (dimensions) {
            const dimMatch = dimensions.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/g);
            if (dimMatch) {
              totalSqft = dimMatch.reduce((sum, dim) => {
                const [w, h] = dim.split(/[xX×]/).map(d => parseFloat(d.trim()));
                return sum + (w * h);
              }, 0);
            }
          }

          // Build search tokens
          const search_tokens = buildSearchTokens([
            assetId,
            row.mediaId || '',
            row.city || '',
            row.area || '',
            row.location || '',
          ]);

          // Prepare insert data
          const insertData = {
            id: assetId,
            media_type: row.mediaType || '',
            media_id: row.mediaId || null,
            status: row.status || 'Available',
            category: row.category || 'OOH',
            location: row.location || '',
            area: row.area || '',
            city: row.city || '',
            district: row.district || null,
            state: row.state || null,
            latitude: row.latitude ? parseFloat(row.latitude) : null,
            longitude: row.longitude ? parseFloat(row.longitude) : null,
            direction: row.direction || null,
            google_street_view_url: row.googleStreetViewUrl || null,
            dimensions: dimensions,
            illumination: row.illumination || null,
            total_sqft: totalSqft,
            is_multi_face: row.isMultiFace || false,
            card_rate: row.cardRate ? parseFloat(row.cardRate) : 0,
            base_rent: row.baseRent ? parseFloat(row.baseRent) : null,
            gst_percent: row.gstPercent ? parseFloat(row.gstPercent) : 18,
            printing_charges: row.printingCharges ? parseFloat(row.printingCharges) : null,
            mounting_charges: row.mountingCharges ? parseFloat(row.mountingCharges) : null,
            ownership: row.ownership || 'own',
            municipal_authority: row.municipalAuthority || null,
            is_public: row.isPublic !== false,
            search_tokens,
            created_by: user.id,
          };

          const { error } = await supabase.from('media_assets').insert(insertData);

          if (error) {
            addLog(`Row ${i + 1}: Failed - ${error.message}`);
            failedCount++;
          } else {
            addLog(`Row ${i + 1}: ✓ Successfully imported ${assetId}`);
            successCount++;
          }
        } catch (error: any) {
          addLog(`Row ${i + 1}: Error - ${error.message}`);
          failedCount++;
        }

        setProgress(((i + 1) / rows.length) * 100);
        setImportStats({ total: rows.length, success: successCount, failed: failedCount });
      }

      addLog(`\nImport completed! Success: ${successCount}, Failed: ${failedCount}`);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} out of ${rows.length} assets`,
      });

    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/media-assets')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Media Assets
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Import Media Assets</h1>
            <p className="text-muted-foreground">
              Upload an Excel file to bulk import media assets with auto-generated IDs
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The system will automatically generate asset IDs in the format CITY-MEDIATYPE-XXXX (e.g., HYD-BSQ-0001) for each asset based on city and media type.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Select an Excel file (.xlsx or .xls) containing media assets data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file">Excel File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {loading ? 'Importing...' : 'Start Import'}
              </Button>
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardHeader>
                <CardTitle>Import Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{importStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{importStats.success}</p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{importStats.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-1 font-mono text-sm">
                    {logs.map((log, index) => (
                      <div key={index} className={
                        log.includes('✓') ? 'text-green-600' :
                        log.includes('Failed') || log.includes('Error') ? 'text-destructive' :
                        'text-foreground'
                      }>
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}