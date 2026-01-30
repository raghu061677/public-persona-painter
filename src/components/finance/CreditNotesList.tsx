import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/mediaAssets';
import { format } from 'date-fns';
import { FileText, Ban, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CreditNote {
  id: string;
  credit_note_id: string;
  credit_date: string;
  reason: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CreditNotesListProps {
  invoiceId: string;
  onCreditNoteChange?: () => void;
}

export function CreditNotesList({ invoiceId, onCreditNoteChange }: CreditNotesListProps) {
  const { toast } = useToast();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCreditNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditNotes(data || []);
    } catch (error) {
      console.error('Error fetching credit notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [invoiceId]);

  const handleIssue = async () => {
    if (!selectedNote) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('credit_notes')
        .update({ status: 'Issued', updated_at: new Date().toISOString() })
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Credit Note ${selectedNote.credit_note_id} issued`,
      });
      fetchCreditNotes();
      onCreditNoteChange?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue credit note',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIssueDialogOpen(false);
      setSelectedNote(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedNote) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('credit_notes')
        .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Credit Note ${selectedNote.credit_note_id} cancelled`,
      });
      fetchCreditNotes();
      onCreditNoteChange?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel credit note',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCancelDialogOpen(false);
      setSelectedNote(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Issued':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Issued
          </Badge>
        );
      case 'Cancelled':
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  const totalCreditsApplied = creditNotes
    .filter((cn) => cn.status === 'Issued')
    .reduce((sum, cn) => sum + cn.total_amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Credit Notes
            </CardTitle>
            {totalCreditsApplied > 0 && (
              <Badge variant="outline" className="text-green-600">
                Total Applied: {formatCurrency(totalCreditsApplied)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {creditNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No credit notes linked to this invoice
            </p>
          ) : (
            <div className="space-y-3">
              {creditNotes.map((cn) => (
                <div
                  key={cn.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cn.credit_note_id}</span>
                      {getStatusBadge(cn.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{cn.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cn.credit_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-green-600">
                      -{formatCurrency(cn.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (GST: {formatCurrency(cn.gst_amount)})
                    </p>
                    {cn.status === 'Draft' && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedNote(cn);
                            setIssueDialogOpen(true);
                          }}
                        >
                          Issue
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedNote(cn);
                            setCancelDialogOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {cn.status === 'Issued' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setSelectedNote(cn);
                          setCancelDialogOpen(true);
                        }}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Confirmation Dialog */}
      <AlertDialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Credit Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will issue {selectedNote?.credit_note_id} for{' '}
              {formatCurrency(selectedNote?.total_amount || 0)} and reduce the invoice balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleIssue} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Issue Credit Note'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel/Reverse Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedNote?.status === 'Issued' ? 'Reverse Credit Note?' : 'Cancel Credit Note?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedNote?.status === 'Issued'
                ? `This will reverse ${selectedNote?.credit_note_id} and add ${formatCurrency(selectedNote?.total_amount || 0)} back to the invoice balance.`
                : `This will cancel ${selectedNote?.credit_note_id}. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing
                ? 'Processing...'
                : selectedNote?.status === 'Issued'
                ? 'Reverse'
                : 'Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
