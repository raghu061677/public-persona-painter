import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Download,
  FileSpreadsheet,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

interface ParsedBill {
  asset_id: string;
  location?: string;
  direction?: string;
  unique_service_number?: string;
  units?: string;
  bill_date?: string;
  due_date?: string;
  current_month_bill?: string;
  acd_amount?: string;
  arrears?: string;
  total_amount?: string;
  energy_charges?: string;
  fixed_charges?: string;
  bill_month?: string;
  status?: 'valid' | 'invalid' | 'duplicate';
  error?: string;
}

export function BulkBillImportDialog({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedBills, setParsedBills] = useState<ParsedBill[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse date formats
  const parseDate = (dateStr: string) => {
    try {
      const cleaned = dateStr.trim();
      const monthMap: any = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      
      const parts = cleaned.split(/[-\/]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        let month = parts[1];
        let year = parts[2];
        
        if (isNaN(Number(month))) {
          month = monthMap[month.toLowerCase().substring(0, 3)] || month;
        } else {
          month = month.padStart(2, '0');
        }
        
        if (year.length === 2) {
          year = '20' + year;
        }
        
        return `${year}-${month}-${day}`;
      }
      return cleaned;
    } catch {
      return dateStr;
    }
  };

  // Parse a single bill section
  const parseSingleBill = (text: string): ParsedBill => {
    const bill: ParsedBill = { asset_id: '', status: 'invalid' };
    
    const extractValue = (line: string) => {
      const patterns = [
        /→\s*(.+)$/,
        /:\s*(.+)$/,
        /\t+(.+)$/,
        /\s{2,}(.+)$/,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) return match[1].trim();
      }
      return null;
    };

    const lines = text.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Asset ID (required)
      if (lower.includes('asset id') || lower.includes('asset_id') || lower.includes('assetid')) {
        const value = extractValue(line);
        if (value) bill.asset_id = value;
      }
      
      // Bill Month
      if (lower.includes('bill month') || lower.includes('month')) {
        const value = extractValue(line);
        if (value) bill.bill_month = value;
      }
      
      // Units
      if (lower.includes('units') || lower.includes('unit')) {
        const value = extractValue(line);
        if (value) bill.units = value.replace(/[^\d.]/g, '');
      }
      
      // Bill Date / Due Date (combined)
      if (lower.includes('bill date') && lower.includes('due date')) {
        const value = extractValue(line);
        if (value) {
          const dates = value.split('/').map(d => d.trim());
          if (dates[0]) bill.bill_date = parseDate(dates[0]);
          if (dates[1]) bill.due_date = parseDate(dates[1]);
        }
      } else {
        if (lower.includes('bill date')) {
          const value = extractValue(line);
          if (value) bill.bill_date = parseDate(value);
        }
        if (lower.includes('due date')) {
          const value = extractValue(line);
          if (value) bill.due_date = parseDate(value);
        }
      }
      
      // Amounts
      if (lower.includes('current month bill') || lower.includes('bill amount')) {
        const value = extractValue(line);
        if (value) bill.current_month_bill = value.replace(/[^\d.]/g, '');
      }
      
      if (lower.includes('acd amount') || lower.includes('acd')) {
        const value = extractValue(line);
        if (value) bill.acd_amount = value.replace(/[^\d.]/g, '') || '0';
      }
      
      if (lower.includes('arrears') || lower.includes('arrear')) {
        const value = extractValue(line);
        if (value) bill.arrears = value.replace(/[^\d.]/g, '') || '0';
      }
      
      if (lower.includes('total amount') || lower.includes('amount to be paid')) {
        const value = extractValue(line);
        if (value) bill.total_amount = value.replace(/[^\d.]/g, '');
      }
      
      if (lower.includes('energy charge')) {
        const value = extractValue(line);
        if (value) bill.energy_charges = value.replace(/[^\d.]/g, '');
      }
      
      if (lower.includes('fixed charge')) {
        const value = extractValue(line);
        if (value) bill.fixed_charges = value.replace(/[^\d.]/g, '');
      }
    }
    
    // Validate
    if (!bill.asset_id) {
      bill.error = 'Missing Asset ID';
    } else if (!bill.bill_month && !bill.bill_date) {
      bill.error = 'Missing Bill Month/Date';
    } else if (!bill.total_amount && !bill.current_month_bill) {
      bill.error = 'Missing Bill Amount';
    } else {
      bill.status = 'valid';
    }
    
    return bill;
  };

  // Parse bulk text into multiple bills
  const handleParseBulk = async () => {
    if (!bulkText.trim()) {
      toast({
        title: "No Data",
        description: "Please paste bill data first",
        variant: "destructive",
      });
      return;
    }

    setParsing(true);
    
    try {
      // Split by blank lines or "---" delimiter
      const sections = bulkText
        .split(/\n\s*\n|\n---+\n/)
        .filter(section => section.trim());

      if (sections.length === 0) {
        throw new Error('No bill sections found');
      }

      const bills = sections.map(section => parseSingleBill(section));
      
      // Check for duplicates in current batch
      const assetIds = bills.map(b => b.asset_id);
      const duplicates = assetIds.filter((id, index) => assetIds.indexOf(id) !== index);
      
      bills.forEach(bill => {
        if (duplicates.includes(bill.asset_id)) {
          bill.status = 'duplicate';
          bill.error = 'Duplicate in batch';
        }
      });

      setParsedBills(bills);
      
      const validCount = bills.filter(b => b.status === 'valid').length;
      
      toast({
        title: "Parsing Complete",
        description: `Found ${bills.length} bills. ${validCount} valid, ${bills.length - validCount} have issues.`,
      });
    } catch (error: any) {
      toast({
        title: "Parsing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  // Save all valid bills to database
  const handleSaveAll = async () => {
    const validBills = parsedBills.filter(b => b.status === 'valid');
    
    if (validBills.length === 0) {
      toast({
        title: "No Valid Bills",
        description: "Please fix errors before saving",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const bill of validBills) {
        try {
          // Determine bill_month from bill_date if not provided
          let billMonth = bill.bill_month;
          if (!billMonth && bill.bill_date) {
            billMonth = bill.bill_date.substring(0, 7); // YYYY-MM
          }

          const billData = {
            asset_id: bill.asset_id,
            bill_month: billMonth,
            units: bill.units ? parseFloat(bill.units) : null,
            bill_date: bill.bill_date || null,
            due_date: bill.due_date || null,
            current_month_bill: bill.current_month_bill ? parseFloat(bill.current_month_bill) : null,
            acd_amount: bill.acd_amount ? parseFloat(bill.acd_amount) : 0,
            arrears: bill.arrears ? parseFloat(bill.arrears) : 0,
            total_due: bill.total_amount ? parseFloat(bill.total_amount) : null,
            energy_charges: bill.energy_charges ? parseFloat(bill.energy_charges) : null,
            fixed_charges: bill.fixed_charges ? parseFloat(bill.fixed_charges) : null,
            bill_amount: bill.current_month_bill ? parseFloat(bill.current_month_bill) : (bill.total_amount ? parseFloat(bill.total_amount) : 0),
            // Identification helpers for UI/reconciliation
            location: bill.location || null,
            direction: bill.direction || null,
            unique_service_number: bill.unique_service_number || null,
          };

          const { error } = await supabase
            .from('asset_power_bills')
            .upsert(billData, {
              onConflict: 'asset_id,bill_month',
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error saving bill for ${bill.asset_id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully saved ${successCount} bills. ${errorCount} failed.`,
      });

      if (successCount > 0) {
        onImportComplete?.();
        setBulkText("");
        setParsedBills([]);
        setOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove a bill from the list
  const handleRemoveBill = (index: number) => {
    setParsedBills(prev => prev.filter((_, i) => i !== index));
  };

  // Parse Excel file
  const parseExcelFile = async (file: File) => {
    setParsing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Map Excel rows to ParsedBill objects
      const bills: ParsedBill[] = jsonData.map((row: any, index) => {
        const bill: ParsedBill = {
          asset_id: row['Asset ID'] || row['asset_id'] || row['AssetID'] || '',
          location: row['Location'] || row['location'] || row.location || '',
          direction: row['Direction'] || row['direction'] || row.direction || '',
          unique_service_number:
            row['Unique Service Number'] ||
            row['unique_service_number'] ||
            row.unique_service_number ||
            row['USN'] ||
            row['usn'] ||
            row.usn ||
            '',
          bill_month: row['Bill Month'] || row['bill_month'] || row['Month'] || '',
          units: row['Units'] || row['units'] || '',
          bill_date: row['Bill Date'] || row['bill_date'] || '',
          due_date: row['Due Date'] || row['due_date'] || '',
          current_month_bill: row['Current Month Bill'] || row['Bill Amount'] || row['current_month_bill'] || '',
          acd_amount: row['ACD Amount'] || row['acd_amount'] || '0',
          arrears: row['Arrears'] || row['arrears'] || '0',
          total_amount: row['Total Amount'] || row['total_amount'] || row['Total'] || '',
          energy_charges: row['Energy Charges'] || row['energy_charges'] || '',
          fixed_charges: row['Fixed Charges'] || row['fixed_charges'] || '',
          status: 'invalid',
        };

        // Validate
        if (!bill.asset_id) {
          bill.error = 'Missing Asset ID';
        } else if (!bill.bill_month && !bill.bill_date) {
          bill.error = 'Missing Bill Month/Date';
        } else if (!bill.total_amount && !bill.current_month_bill) {
          bill.error = 'Missing Bill Amount';
        } else {
          bill.status = 'valid';
        }

        return bill;
      });

      // Check for duplicates
      const assetIds = bills.map(b => b.asset_id);
      const duplicates = assetIds.filter((id, index) => assetIds.indexOf(id) !== index);
      
      bills.forEach(bill => {
        if (duplicates.includes(bill.asset_id)) {
          bill.status = 'duplicate';
          bill.error = 'Duplicate in file';
        }
      });

      setParsedBills(bills);
      
      const validCount = bills.filter(b => b.status === 'valid').length;
      
      toast({
        title: "Excel Parsed Successfully",
        description: `Found ${bills.length} bills. ${validCount} valid, ${bills.length - validCount} have issues.`,
      });
    } catch (error: any) {
      toast({
        title: "Excel Parsing Failed",
        description: error.message || "Could not parse Excel file",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    parseExcelFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setParsedBills([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download Excel template
  const downloadExcelTemplate = () => {
    // Required identification columns (in order): Asset ID → Location → Direction → Unique Service Number
    const template = [
      {
        'Asset ID': 'MNS-HYD-BQS-0001',
        'Location': 'Near Metro Station, Begumpet',
        'Direction': 'Towards Secunderabad',
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
        'Fixed Charges': 332,
      },
      {
        'Asset ID': 'MNS-HYD-BQS-0002',
        'Location': 'Opposite HDFC Bank, Kukatpally',
        'Direction': 'Towards JNTU',
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
        'Fixed Charges': 360,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Power Bills');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Asset ID
      { wch: 35 }, // Location
      { wch: 22 }, // Direction
      { wch: 24 }, // Unique Service Number
      { wch: 12 }, // Bill Month
      { wch: 8 }, // Units
      { wch: 12 }, // Bill Date
      { wch: 12 }, // Due Date
      { wch: 18 }, // Current Month Bill
      { wch: 12 }, // ACD Amount
      { wch: 10 }, // Arrears
      { wch: 15 }, // Total Amount
      { wch: 15 }, // Energy Charges
      { wch: 15 }, // Fixed Charges
    ];

    XLSX.writeFile(wb, 'power-bills-template.xlsx');
  };

  // Download text template
  const downloadTextTemplate = () => {
    const template = `Asset ID: HYD-BQS-0001
Bill Month: 2025-01
Units: 40
Bill Date / Due Date: 05-Jan-25 / 19-Jan-25
Current Month Bill: 982
ACD Amount: 0
Arrears: 0
Total Amount to be Paid: 982.0

---

Asset ID: HYD-BQS-0002
Bill Month: 2025-01
Units: 55
Bill Date / Due Date: 05-Jan-25 / 19-Jan-25
Current Month Bill: 1250
ACD Amount: 0
Arrears: 100
Total Amount to be Paid: 1350.0`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'power-bills-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import Bills
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Power Bill Import</DialogTitle>
          <DialogDescription>
            Upload an Excel file or paste multiple bill records. Each record must include Asset ID.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="excel" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel Upload
            </TabsTrigger>
            <TabsTrigger value="paste">
              <Upload className="mr-2 h-4 w-4" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 mt-4">
            {/* Left: Upload/Paste Area */}
            <div className="space-y-4 flex flex-col">
              <TabsContent value="excel" className="flex-1 flex flex-col space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <Label>Upload Excel File</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={downloadExcelTemplate}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Template
                  </Button>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    flex-1 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center
                    transition-colors cursor-pointer
                    ${isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                    }
                  `}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                      >
                        <X className="mr-2 h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-medium mb-1">
                        Drop Excel file here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports .xlsx, .xls, .csv files
                      </p>
                    </>
                  )}
                </div>

                {uploadedFile && (
                  <div className="bg-muted/50 p-3 rounded-lg text-xs">
                    <p className="font-semibold mb-1">Expected Columns:</p>
                    <p className="text-muted-foreground">
                      Asset ID, Location, Direction, Unique Service Number, Bill Month, Units, Bill Date, Due Date, Current Month Bill,
                      ACD Amount, Arrears, Total Amount, Energy Charges, Fixed Charges
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="flex-1 flex flex-col space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <Label>Paste Bill Data</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={downloadTextTemplate}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Template
                  </Button>
                </div>
                
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Asset ID: HYD-BQS-0001&#10;Bill Month: 2025-01&#10;Units: 40&#10;Bill Date / Due Date: 05-Jan-25 / 19-Jan-25&#10;Current Month Bill: 982&#10;ACD Amount: 0&#10;Arrears: 0&#10;Total Amount: 982&#10;&#10;---&#10;&#10;Asset ID: HYD-BQS-0002&#10;..."
                  className="flex-1 font-mono text-xs min-h-[400px]"
                />

                <Button 
                  onClick={handleParseBulk}
                  disabled={!bulkText.trim() || parsing}
                  className="w-full"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Parse Bills
                    </>
                  )}
                </Button>
              </TabsContent>
            </div>

            {/* Right: Preview Table */}
            <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <Label>Parsed Bills Preview</Label>
              {parsedBills.length > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {parsedBills.filter(b => b.status === 'valid').length} Valid
                  </Badge>
                  <Badge variant="destructive">
                    {parsedBills.filter(b => b.status !== 'valid').length} Issues
                  </Badge>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              {parsedBills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Upload className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No bills parsed yet</p>
                  <p className="text-xs mt-1">Paste and parse data to see preview</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedBills.map((bill, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {bill.status === 'valid' ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {bill.error || 'Invalid'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {bill.asset_id || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={bill.location}>
                          {bill.location || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate" title={bill.direction}>
                          {bill.direction || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {bill.unique_service_number || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {bill.bill_month || bill.bill_date?.substring(0, 7) || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{bill.total_amount || bill.current_month_bill || '0'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBill(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>

            <Button 
              onClick={handleSaveAll}
              disabled={parsedBills.filter(b => b.status === 'valid').length === 0 || saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving {parsedBills.filter(b => b.status === 'valid').length} Bills...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Save {parsedBills.filter(b => b.status === 'valid').length} Bills to Database
                </>
              )}
            </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
