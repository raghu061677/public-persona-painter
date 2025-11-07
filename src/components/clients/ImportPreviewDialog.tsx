import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Edit2, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

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
  onConfirm: (updatedRecords: PreviewRecord[]) => void;
  isImporting: boolean;
}

export function ImportPreviewDialog({
  isOpen,
  onClose,
  records,
  onConfirm,
  isImporting,
}: ImportPreviewDialogProps) {
  const [editedRecords, setEditedRecords] = useState<PreviewRecord[]>(records);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    setEditedRecords(records);
  }, [records]);

  const validRecords = editedRecords.filter(r => r.status === 'valid').length;
  const warningRecords = editedRecords.filter(r => r.status === 'warning').length;
  const errorRecords = editedRecords.filter(r => r.status === 'error').length;

  const validateField = (field: string, value: string): string[] => {
    const issues: string[] = [];

    if (field === 'name' && !value) {
      issues.push('Name is required');
    }

    if (field === 'state' && !value) {
      issues.push('State is required');
    }

    if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      issues.push('Invalid email format');
    }

    if (field === 'gst_number' && value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
      issues.push('Invalid GST format');
    }

    return issues;
  };

  const validateRecord = (data: any): { status: 'valid' | 'warning' | 'error', issues: string[] } => {
    const allIssues: string[] = [];

    if (!data.name) allIssues.push('Missing name');
    if (!data.state) allIssues.push('Missing state');

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      allIssues.push('Invalid email format');
    }

    if (data.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gst_number)) {
      allIssues.push('Invalid GST format');
    }

    const hasErrors = !data.name || !data.state;
    const hasWarnings = allIssues.length > 0 && !hasErrors;

    return {
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid',
      issues: allIssues,
    };
  };

  const startEdit = (record: PreviewRecord) => {
    setEditingRow(record.row);
    setEditForm({ ...record.data });
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  const saveEdit = (rowNum: number) => {
    const validation = validateRecord(editForm);
    
    const updatedRecords = editedRecords.map(record => 
      record.row === rowNum
        ? { ...record, data: editForm, ...validation }
        : record
    );

    setEditedRecords(updatedRecords);
    setEditingRow(null);
    setEditForm({});

    toast({
      title: "Record updated",
      description: validation.status === 'valid' 
        ? "Record is now valid and ready to import" 
        : `Record still has ${validation.issues.length} issue(s)`,
      variant: validation.status === 'error' ? 'destructive' : 'default',
    });
  };

  const handleConfirm = () => {
    onConfirm(editedRecords);
  };

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
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[150px]">Phone</TableHead>
                <TableHead className="min-w-[120px]">State</TableHead>
                <TableHead className="min-w-[200px]">Issues</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedRecords.map((record) => {
                const isEditing = editingRow === record.row;
                
                return (
                  <TableRow key={record.row} className={isEditing ? "bg-muted/50" : ""}>
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
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8"
                          placeholder="Enter name"
                        />
                      ) : (
                        <span className="font-medium">{record.data.name || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="h-8"
                          placeholder="Enter email"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{record.data.email || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="h-8"
                          placeholder="Enter phone"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{record.data.phone || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.state || ''}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                          className="h-8"
                          placeholder="Enter state"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{record.data.state || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.issues.length > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {record.issues.join(', ')}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveEdit(record.row)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(record)}
                          disabled={isImporting || editingRow !== null}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting || editingRow !== null}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isImporting || validRecords === 0 || editingRow !== null}>
            {isImporting ? "Importing..." : `Import ${validRecords} Record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
