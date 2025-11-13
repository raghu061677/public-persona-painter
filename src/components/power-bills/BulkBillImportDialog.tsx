import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Download
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

interface ParsedBill {
  asset_id: string;
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

  // Download template
  const downloadTemplate = () => {
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
            Paste multiple bill records separated by blank lines or "---". Each section must include Asset ID.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
          {/* Left: Paste Area */}
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Paste Bill Data</Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={downloadTemplate}
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
      </DialogContent>
    </Dialog>
  );
}
