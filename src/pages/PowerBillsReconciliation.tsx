import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/utils/finance";
import { Upload, Check, X, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from 'xlsx';

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  reference?: string;
  matched: boolean;
  matchedBillId?: string;
  matchedAssetId?: string;
  discrepancy?: string;
}

interface PowerBill {
  id: string;
  asset_id: string;
  bill_amount: number;
  payment_date: string | null;
  service_number: string;
  consumer_name: string;
}

export default function PowerBillsReconciliation() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Parse bank statement (adjust column names based on your bank format)
        const parsedTransactions = jsonData.map((row: any) => ({
          date: row['Transaction Date'] || row['Date'] || row['date'],
          description: row['Description'] || row['Narration'] || row['description'],
          amount: Math.abs(Number(row['Debit'] || row['Amount'] || row['amount'] || 0)),
          reference: row['Reference'] || row['Ref No'] || row['reference'],
          matched: false,
        }));

        setTransactions(parsedTransactions);
        toast.success(`Loaded ${parsedTransactions.length} transactions from bank statement`);
      };
      reader.readAsBinaryString(uploadedFile);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse bank statement. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (transactions.length === 0) {
      toast.error('Please upload a bank statement first');
      return;
    }

    setReconciling(true);
    try {
      // Fetch all paid power bills from the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: bills, error } = await supabase
        .from('asset_power_bills')
        .select('id, asset_id, bill_amount, payment_date, service_number, consumer_name')
        .eq('payment_status', 'Paid')
        .gte('payment_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Match transactions with bills
      const reconciledTransactions = transactions.map(txn => {
        // Try to match by amount and date (within 3 days)
        const matchedBill = bills?.find(bill => {
          if (!bill.payment_date) return false;
          
          const txnDate = new Date(txn.date);
          const billDate = new Date(bill.payment_date);
          const daysDiff = Math.abs((txnDate.getTime() - billDate.getTime()) / (1000 * 3600 * 24));
          
          // Match if amount is exact and date is within 3 days
          const amountMatch = Math.abs(Number(bill.bill_amount) - txn.amount) < 1;
          const dateMatch = daysDiff <= 3;
          
          // Also check if description contains service number or consumer name
          const descMatch = bill.service_number && txn.description.includes(bill.service_number);
          
          return amountMatch && (dateMatch || descMatch);
        });

        if (matchedBill) {
          return {
            ...txn,
            matched: true,
            matchedBillId: matchedBill.id,
            matchedAssetId: matchedBill.asset_id,
          };
        }

        // Check if amount matches but date doesn't (flag as discrepancy)
        const amountOnlyMatch = bills?.find(bill => 
          Math.abs(Number(bill.bill_amount) - txn.amount) < 1
        );

        if (amountOnlyMatch) {
          return {
            ...txn,
            matched: false,
            discrepancy: `Amount matches bill ${amountOnlyMatch.asset_id} but date mismatch`,
          };
        }

        return { ...txn, matched: false };
      });

      setTransactions(reconciledTransactions);

      const matchedCount = reconciledTransactions.filter(t => t.matched).length;
      const unmatchedCount = reconciledTransactions.length - matchedCount;
      const discrepancyCount = reconciledTransactions.filter(t => t.discrepancy).length;

      toast.success(
        `Reconciliation complete: ${matchedCount} matched, ${unmatchedCount} unmatched, ${discrepancyCount} discrepancies`,
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Error during reconciliation:', error);
      toast.error('Failed to reconcile transactions');
    } finally {
      setReconciling(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Transaction Date': '2025-01-15',
        'Description': 'TGSPDCL Payment - SRV-101',
        'Debit': '2500',
        'Reference': 'NEFT123456',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement Template');
    XLSX.writeFile(wb, 'bank-statement-template.xlsx');
  };

  const exportReconciliationReport = () => {
    const report = transactions.map(txn => ({
      Date: txn.date,
      Description: txn.description,
      Amount: txn.amount,
      Reference: txn.reference || '',
      Status: txn.matched ? 'Matched' : 'Unmatched',
      'Matched Asset ID': txn.matchedAssetId || '',
      'Matched Bill ID': txn.matchedBillId || '',
      Discrepancy: txn.discrepancy || '',
    }));

    const ws = XLSX.utils.json_to_sheet(report);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation Report');
    XLSX.writeFile(wb, `reconciliation-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reconciliation report exported');
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Only administrators can access payment reconciliation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchedCount = transactions.filter(t => t.matched).length;
  const unmatchedCount = transactions.filter(t => !t.matched).length;
  const discrepancyCount = transactions.filter(t => t.discrepancy).length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const matchedAmount = transactions.filter(t => t.matched).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Reconciliation</h2>
          <p className="text-muted-foreground">
            Match bank statement transactions with power bill payments
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Statement</CardTitle>
          <CardDescription>
            Upload your bank statement in Excel (.xlsx) or CSV format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank-statement">Bank Statement File</Label>
            <Input
              id="bank-statement"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={loading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReconcile}
              disabled={transactions.length === 0 || reconciling}
            >
              {reconciling ? 'Reconciling...' : 'Start Reconciliation'}
            </Button>
            {transactions.length > 0 && (
              <Button onClick={exportReconciliationReport} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-xs text-muted-foreground">{formatINR(totalAmount)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matched</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
              <p className="text-xs text-muted-foreground">{formatINR(matchedAmount)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
              <X className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{unmatchedCount}</div>
              <p className="text-xs text-muted-foreground">{formatINR(totalAmount - matchedAmount)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{discrepancyCount}</div>
              <p className="text-xs text-muted-foreground">Requires review</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Table */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Matched Asset</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {txn.matched ? (
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Matched
                        </Badge>
                      ) : txn.discrepancy ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Discrepancy
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                    <TableCell className="font-mono text-xs">{txn.reference || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatINR(txn.amount)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {txn.matchedAssetId || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {txn.discrepancy || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No bank statement uploaded</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your bank statement to start reconciliation
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
