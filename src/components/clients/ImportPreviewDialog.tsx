import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreviewRecord {
  row: number;
  data: any;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
}

interface ImportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  records: PreviewRecord[];
  onConfirm: () => void;
  isImporting: boolean;
}

export function ImportPreviewDialog({
  isOpen,
  onClose,
  records,
  onConfirm,
  isImporting,
}: ImportPreviewDialogProps) {
  const validRecords = records.filter(r => r.status === 'valid').length;
  const warningRecords = records.filter(r => r.status === 'warning').length;
  const errorRecords = records.filter(r => r.status === 'error').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Import Data</DialogTitle>
          <DialogDescription>
            Review the records before importing. Records with errors will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-sm font-medium">Valid</div>
              <div className="text-2xl font-bold text-emerald-600">{validRecords}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-sm font-medium">Warnings</div>
              <div className="text-2xl font-bold text-amber-600">{warningRecords}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm font-medium">Errors</div>
              <div className="text-2xl font-bold text-red-600">{errorRecords}</div>
            </div>
          </div>
        </div>

        {errorRecords > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorRecords} record(s) have errors and will be skipped during import.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.row}>
                  <TableCell className="font-medium">{record.row}</TableCell>
                  <TableCell>
                    {record.status === 'valid' && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Valid
                      </Badge>
                    )}
                    {record.status === 'warning' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Warning
                      </Badge>
                    )}
                    {record.status === 'error' && (
                      <Badge variant="destructive">
                        Error
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{record.data.name || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.data.email || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.data.phone || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.data.state || '-'}</TableCell>
                  <TableCell>
                    {record.issues.length > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {record.issues.join(', ')}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isImporting || validRecords === 0}>
            {isImporting ? "Importing..." : `Import ${validRecords} Record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
