import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Upload, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

interface PreviewRow {
  rowNum: number;
  data: any;
  status: 'valid' | 'error';
  errors: string[];
}

const PowerBillsBulkUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        asset_id: 'HYD-BSQ-0001',
        area: 'Begumpet',
        location: 'Near Metro Station',
        direction: 'East',
        unique_service_number: '1234567890',
        service_number: 'SRV-101',
        consumer_name: 'MNS Advertising',
        ero: 'Begumpet',
        section_name: 'SR Nagar',
        bill_amount: 2450,
        bill_month: '2025-11-01',
        payment_status: 'Paid',
        paid_amount: 2450,
        payment_date: '2025-11-10'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Power Bills Template');
    XLSX.writeFile(wb, 'power-bills-template.xlsx');
    toast.success("Template downloaded successfully");
  };

  const validateRow = async (row: any, rowNum: number): Promise<PreviewRow> => {
    const errors: string[] = [];

    if (!row.asset_id) errors.push('Asset ID is required');
    if (!row.bill_month) errors.push('Bill month is required');
    if (!row.bill_amount && row.bill_amount !== 0) errors.push('Bill amount is required');

    // Validate asset_id exists
    if (row.asset_id) {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('id')
        .eq('id', row.asset_id)
        .single();

      if (!asset) {
        errors.push('Asset ID not found in database');
      }
    }

    // Validate date format
    if (row.bill_month && !/^\d{4}-\d{2}-\d{2}$/.test(row.bill_month)) {
      errors.push('Bill month must be in YYYY-MM-DD format');
    }

    if (row.payment_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.payment_date)) {
      errors.push('Payment date must be in YYYY-MM-DD format');
    }

    return {
      rowNum,
      data: row,
      status: errors.length === 0 ? 'valid' : 'error',
      errors
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Please upload a valid Excel or CSV file");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate all rows
        const validatedRows = await Promise.all(
          jsonData.map((row, index) => validateRow(row, index + 2)) // +2 because Excel rows start at 1 and we have header
        );

        setPreview(validatedRows.slice(0, 15)); // Show first 15 rows
        toast.success(`Loaded ${jsonData.length} rows for preview`);
      } catch (error) {
        toast.error("Error parsing file");
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error("No data to import");
      return;
    }

    const validRows = preview.filter(row => row.status === 'valid');
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const billsToInsert = validRows.map(row => ({
        asset_id: row.data.asset_id,
        bill_month: row.data.bill_month,
        bill_amount: parseFloat(row.data.bill_amount) || 0,
        consumer_name: row.data.consumer_name || null,
        service_number: row.data.service_number || null,
        unique_service_number: row.data.unique_service_number || null,
        ero: row.data.ero || null,
        section_name: row.data.section_name || null,
        payment_status: row.data.payment_status || 'Pending',
        paid_amount: parseFloat(row.data.paid_amount) || 0,
        payment_date: row.data.payment_date || null,
        created_by: userData.user?.id
      }));

      const { error } = await supabase
        .from('asset_power_bills')
        .insert(billsToInsert);

      if (error) throw error;

      toast.success(`✅ ${validRows.length} Power Bills Imported Successfully!`);
      navigate('/admin/power-bills');
    } catch (error) {
      toast.error("Error importing power bills");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const validCount = preview.filter(r => r.status === 'valid').length;
  const errorCount = preview.filter(r => r.status === 'error').length;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/power-bills')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Power Bills – Bulk Upload</h1>
        <p className="text-muted-foreground">Upload monthly power bill details for multiple assets</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Upload an Excel file (.xlsx or .csv) containing power bill details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Sample Excel
              </Button>
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </CardContent>
        </Card>

        {preview.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Preview & Validation</CardTitle>
                <CardDescription>
                  Review the data before importing (showing first 15 rows)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Valid: {validCount}
                  </Badge>
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Errors: {errorCount}
                  </Badge>
                </div>

                <div className="border rounded-lg overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Asset ID</TableHead>
                        <TableHead>Bill Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Consumer</TableHead>
                        <TableHead>Service No.</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => (
                        <TableRow key={row.rowNum}>
                          <TableCell>{row.rowNum}</TableCell>
                          <TableCell>
                            {row.status === 'valid' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell>{row.data.asset_id}</TableCell>
                          <TableCell>{row.data.bill_month}</TableCell>
                          <TableCell>₹{row.data.bill_amount || 0}</TableCell>
                          <TableCell>{row.data.consumer_name || 'N/A'}</TableCell>
                          <TableCell>{row.data.service_number || 'N/A'}</TableCell>
                          <TableCell>
                            {row.errors.length > 0 && (
                              <div className="text-xs text-destructive space-y-1">
                                {row.errors.map((err, i) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={handleImport} 
                    disabled={validCount === 0 || uploading}
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Importing..." : `Import ${validCount} Power Bills`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PowerBillsBulkUpload;
