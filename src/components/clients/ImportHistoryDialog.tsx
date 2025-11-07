import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { History, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ImportLog {
  id: string;
  file_name: string;
  total_records: number;
  success_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
  skipped_records: string[];
  created_at: string;
}

export function ImportHistoryDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchImportLogs();
    }
  }, [isOpen]);

  const fetchImportLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('entity_type', 'clients')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Type cast the data to match our interface
      const typedData = (data || []).map(log => ({
        ...log,
        errors: Array.isArray(log.errors) ? log.errors : [],
        skipped_records: Array.isArray(log.skipped_records) ? log.skipped_records : [],
      })) as ImportLog[];
      
      setLogs(typedData);
    } catch (error) {
      console.error('Error fetching import logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          Import History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import History</DialogTitle>
          <DialogDescription>
            View past client import operations and their results
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading import history...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>No import history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Collapsible key={log.id}>
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 text-left">
                          <div className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {log.file_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {log.success_count}
                          </Badge>
                          {log.skipped_count > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {log.skipped_count}
                            </Badge>
                          )}
                          {log.error_count > 0 && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              {log.error_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Total</div>
                            <div className="font-medium">{log.total_records}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Success</div>
                            <div className="font-medium text-emerald-600">{log.success_count}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Skipped</div>
                            <div className="font-medium text-amber-600">{log.skipped_count}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Errors</div>
                            <div className="font-medium text-red-600">{log.error_count}</div>
                          </div>
                        </div>

                        {log.skipped_records && log.skipped_records.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Skipped Records:</div>
                            <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                              {log.skipped_records.map((item: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <AlertCircle className="h-3 w-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {log.errors && log.errors.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Errors:</div>
                            <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                              {log.errors.map((error: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{error}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
