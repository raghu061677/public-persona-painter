import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/mediaAssets';

interface CreditNoteItem {
  id: string;
  description: string;
  amount: number;
}

interface CreateCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_no?: string;
    client_id: string;
    company_id: string;
    total_amount: number;
    balance_due: number;
    gst_mode?: string;
  };
  onCreditNoteCreated: () => void;
}

const creditNoteSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

const CREDIT_NOTE_REASONS = [
  'Rate adjustment',
  'Service not rendered',
  'Partial cancellation',
  'Billing error',
  'Duplicate invoice',
  'Client dispute resolution',
  'Other',
];

export function CreateCreditNoteDialog({
  open,
  onOpenChange,
  invoice,
  onCreditNoteCreated,
}: CreateCreditNoteDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CreditNoteItem[]>([
    { id: crypto.randomUUID(), description: '', amount: 0 },
  ]);

  const form = useForm<z.infer<typeof creditNoteSchema>>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gstRate = 0.18;
  const gstAmount = subtotal * gstRate;
  const totalAmount = subtotal + gstAmount;

  // Calculate max allowed credit
  const maxCredit = invoice.total_amount;

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: 'description' | 'amount', value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, [field]: field === 'amount' ? parseFloat(value as string) || 0 : value }
          : item
      )
    );
  };

  const handleSubmit = async (values: z.infer<typeof creditNoteSchema>, issueImmediately: boolean) => {
    // Validate items
    const validItems = items.filter((item) => item.description && item.amount > 0);
    if (validItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one line item with description and amount',
        variant: 'destructive',
      });
      return;
    }

    if (totalAmount > maxCredit) {
      toast({
        title: 'Error',
        description: `Credit note amount (${formatCurrency(totalAmount)}) exceeds maximum allowed (${formatCurrency(maxCredit)})`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate credit note ID
      const { data: creditNoteId, error: idError } = await supabase.rpc('generate_credit_note_id', {
        p_company_id: invoice.company_id,
      });

      if (idError) throw idError;

      // Calculate GST splits
      const gstMode = invoice.gst_mode || 'CGST_SGST';
      const cgstAmount = gstMode === 'CGST_SGST' ? gstAmount / 2 : 0;
      const sgstAmount = gstMode === 'CGST_SGST' ? gstAmount / 2 : 0;
      const igstAmount = gstMode === 'IGST' ? gstAmount : 0;

      // Insert credit note
      const { data: creditNote, error: insertError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_id: creditNoteId,
          company_id: invoice.company_id,
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          reason: values.reason,
          notes: values.notes || null,
          subtotal,
          gst_amount: gstAmount,
          gst_mode: gstMode,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          total_amount: totalAmount,
          status: issueImmediately ? 'Issued' : 'Draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert line items
      const itemsToInsert = validItems.map((item) => ({
        credit_note_id: creditNote.id,
        description: item.description,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from('credit_note_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Success',
        description: `Credit Note ${creditNoteId} ${issueImmediately ? 'issued' : 'created as draft'}`,
      });

      onCreditNoteCreated();
      onOpenChange(false);
      form.reset();
      setItems([{ id: crypto.randomUUID(), description: '', amount: 0 }]);
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create credit note',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
          <p className="text-sm text-muted-foreground">
            For Invoice: {invoice.invoice_no || invoice.id}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
            {/* Reason Select */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason for credit note" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREDIT_NOTE_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Credit</span>
                <span className={totalAmount > maxCredit ? 'text-destructive' : ''}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              {totalAmount > maxCredit && (
                <p className="text-xs text-destructive">
                  Exceeds maximum credit of {formatCurrency(maxCredit)}
                </p>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={form.handleSubmit((values) => handleSubmit(values, false))}
            disabled={isLoading || totalAmount === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={form.handleSubmit((values) => handleSubmit(values, true))}
            disabled={isLoading || totalAmount === 0 || totalAmount > maxCredit}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Issue Credit Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
