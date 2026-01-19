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
    // Define column order explicitly for better usability
    const template = [
      {
        'Asset ID': 'MNS-HYD-BQS-0001',
        'Location': 'Near Metro Station, Begumpet',
        'Unique Service Number': '115321754',
        'Bill Month': '2025-01',
        'Units': 40,
        'Bill Date': '2025-01-05',
        'Due Date': '2025-01-19',
        'Current Month Bill': 982,
        'ACD Amount': 0,
        'Arrears': 0,
        'Total Amount': 982,
        'Energy Charges': 650,
        'Fixed Charges': 332
      },
      {
        'Asset ID': 'MNS-HYD-BQS-0002',
        'Location': 'Opposite HDFC Bank, Kukatpally',
        'Unique Service Number': '115321755',
        'Bill Month': '2025-01',
        'Units': 55,
        'Bill Date': '2025-01-05',
        'Due Date': '2025-01-19',
        'Current Month Bill': 1250,
        'ACD Amount': 0,
        'Arrears': 100,
        'Total Amount': 1350,
        'Energy Charges': 890,
        'Fixed Charges': 360
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 },  // Asset ID
      { wch: 35 },  // Location
      { wch: 22 },  // Unique Service Number
      { wch: 12 },  // Bill Month
      { wch: 8 },   // Units
      { wch: 12 },  // Bill Date
      { wch: 12 },  // Due Date
      { wch: 18 },  // Current Month Bill
      { wch: 12 },  // ACD Amount
      { wch: 10 },  // Arrears
      { wch: 14 },  // Total Amount
      { wch: 15 },  // Energy Charges
      { wch: 14 },  // Fixed Charges
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Power Bills Template');
    XLSX.writeFile(wb, 'power-bills-template.xlsx');
    toast.success("Template downloaded successfully");
  };

  // Normalize row keys - handle both snake_case and space-separated column names
  const normalizeRow = (row: any) => {
    return {
      asset_id: row['Asset ID'] || row['asset_id'] || row.asset_id,
      location: row['Location'] || row['location'] || row.location,
      unique_service_number: row['Unique Service Number'] || row['unique_service_number'] || row.unique_service_number,
      bill_month: row['Bill Month'] || row['bill_month'] || row.bill_month,
      units: row['Units'] || row['units'] || row.units,
      bill_date: row['Bill Date'] || row['bill_date'] || row.bill_date,
      due_date: row['Due Date'] || row['due_date'] || row.due_date,
      current_month_bill: row['Current Month Bill'] || row['current_month_bill'] || row.current_month_bill,
      acd_amount: row['ACD Amount'] || row['acd_amount'] || row.acd_amount,
      arrears: row['Arrears'] || row['arrears'] || row.arrears,
      bill_amount: row['Total Amount'] || row['bill_amount'] || row.bill_amount || row['total_amount'],
      energy_charges: row['Energy Charges'] || row['energy_charges'] || row.energy_charges,
      fixed_charges: row['Fixed Charges'] || row['fixed_charges'] || row.fixed_charges,
      payment_status: row['Payment Status'] || row['payment_status'] || row.payment_status,
      paid_amount: row['Paid Amount'] || row['paid_amount'] || row.paid_amount,
      payment_date: row['Payment Date'] || row['payment_date'] || row.payment_date,
    };
  };

  const validateRow = async (row: any, rowNum: number): Promise<PreviewRow> => {
    const errors: string[] = [];
    const normalizedRow = normalizeRow(row);

    if (!normalizedRow.asset_id) errors.push('Asset ID is required');
    if (!normalizedRow.bill_month) errors.push('Bill month is required');
    if (!normalizedRow.bill_amount && normalizedRow.bill_amount !== 0) errors.push('Total Amount is required');

    // Validate asset_id exists - check by media_asset_code first, then by id
    if (normalizedRow.asset_id) {
      const { data: assetByCode } = await supabase
        .from('media_assets')
        .select('id')
        .eq('media_asset_code', normalizedRow.asset_id)
        .single();

      if (!assetByCode) {
        // Fallback to check by UUID
        const { data: assetById } = await supabase
          .from('media_assets')
          .select('id')
          .eq('id', normalizedRow.asset_id)
          .single();
        
        if (!assetById) {
          errors.push('Asset ID/Code not found in database');
        }
      }
    }

    // Validate bill_month format (YYYY-MM or YYYY-MM-DD)
    if (normalizedRow.bill_month && !/^\d{4}-\d{2}(-\d{2})?$/.test(String(normalizedRow.bill_month))) {
      errors.push('Bill month must be in YYYY-MM or YYYY-MM-DD format');
    }

    return {
      rowNum,
      data: normalizedRow,
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
      
      // Resolve asset IDs - handle both media_asset_code and UUID formats
      const billsToInsert = await Promise.all(validRows.map(async (row) => {
        let assetId = row.data.asset_id;
        
        // Check if asset_id is a media_asset_code format (not UUID)
        if (assetId && !assetId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data: asset } = await supabase
            .from('media_assets')
            .select('id')
            .eq('media_asset_code', assetId)
            .single();
          
          if (asset) {
            assetId = asset.id;
          }
        }
        
        // Convert bill_month to proper format (YYYY-MM-01 for first of month)
        let billMonth = row.data.bill_month;
        if (billMonth && billMonth.match(/^\d{4}-\d{2}$/)) {
          billMonth = billMonth + '-01';
        }
        
        return {
          asset_id: assetId,
          bill_month: billMonth,
          bill_amount: parseFloat(row.data.bill_amount) || 0,
          units: row.data.units ? parseInt(row.data.units) : null,
          bill_date: row.data.bill_date || null,
          due_date: row.data.due_date || null,
          current_month_bill: row.data.current_month_bill ? parseFloat(row.data.current_month_bill) : null,
          acd_amount: row.data.acd_amount ? parseFloat(row.data.acd_amount) : null,
          arrears: row.data.arrears ? parseFloat(row.data.arrears) : null,
          energy_charges: row.data.energy_charges ? parseFloat(row.data.energy_charges) : null,
          fixed_charges: row.data.fixed_charges ? parseFloat(row.data.fixed_charges) : null,
          unique_service_number: row.data.unique_service_number || null,
          location: row.data.location || null,
          payment_status: row.data.payment_status || 'Pending',
          paid_amount: parseFloat(row.data.paid_amount) || 0,
          payment_date: row.data.payment_date || null,
          created_by: userData.user?.id
        };
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
                        <TableHead>Location</TableHead>
                        <TableHead>USN</TableHead>
                        <TableHead>Bill Month</TableHead>
                        <TableHead>Amount</TableHead>
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
                          <TableCell className="font-medium">{row.data.asset_id}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.data.location}>
                            {row.data.location || 'N/A'}
                          </TableCell>
                          <TableCell>{row.data.unique_service_number || 'N/A'}</TableCell>
                          <TableCell>{row.data.bill_month}</TableCell>
                          <TableCell>₹{row.data.bill_amount || 0}</TableCell>
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
