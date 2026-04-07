import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/mediaAssets';

interface InvoiceLineItem {
  sno?: number;
  asset_code?: string;
  media_asset_code?: string;
  description?: string;
  location?: string;
  area?: string;
  direction?: string;
  media_type?: string;
  dimensions?: string;
  total_sqft?: number;
  start_date?: string;
  end_date?: string;
  booking_period?: string;
  billable_days?: number;
  booked_days?: number;
  negotiated_rate?: number;
  rate?: number;
  unit_price?: number;
  rent_amount?: number;
  printing_cost?: number;
  printing_charges?: number;
  mounting_cost?: number;
  mounting_charges?: number;
  amount?: number;
  total?: number;
  illumination_type?: string;
  city?: string;
}

interface CreditNoteItem {
  id: string;
  description: string;
  amount: number;
  selected: boolean;
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
    gst_percent?: number;
    sub_total?: number;
    items?: any;
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

function buildDescription(item: InvoiceLineItem): string {
  const code = item.media_asset_code || item.asset_code || '';
  const loc = item.location || '';
  const area = item.area || '';
  const dir = item.direction ? `(${item.direction})` : '';
  const type = item.media_type || '';
  const dims = item.dimensions ? `[${item.dimensions}]` : '';
  const period = item.booking_period ||
    (item.start_date && item.end_date ? `${item.start_date} to ${item.end_date}` : '');
  const days = item.billable_days || item.booked_days;

  const parts = [code, type, loc, area, dir, dims].filter(Boolean);
  let desc = parts.join(' · ');
  if (period) desc += ` | ${period}`;
  if (days) desc += ` (${days} days)`;
  return desc;
}

function getItemAmount(item: InvoiceLineItem): number {
  return item.amount || item.total || item.rent_amount || item.unit_price || item.rate || 0;
}

export function CreateCreditNoteDialog({
  open,
  onOpenChange,
  invoice,
  onCreditNoteCreated,
}: CreateCreditNoteDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CreditNoteItem[]>([]);
  const [mode, setMode] = useState<'from_invoice' | 'manual'>('from_invoice');

  const invoiceItems: InvoiceLineItem[] = useMemo(() => {
    if (!invoice.items) return [];
    if (Array.isArray(invoice.items)) return invoice.items;
    try { return JSON.parse(invoice.items); } catch { return []; }
  }, [invoice.items]);

  // Populate items from invoice when dialog opens
  useEffect(() => {
    if (open) {
      if (invoiceItems.length > 0) {
        setMode('from_invoice');
        setItems(invoiceItems.map((item) => ({
          id: crypto.randomUUID(),
          description: buildDescription(item),
          amount: getItemAmount(item),
          selected: true,
        })));
      } else {
        setMode('manual');
        setItems([{ id: crypto.randomUUID(), description: '', amount: 0, selected: true }]);
      }
    }
  }, [open, invoiceItems]);

  const form = useForm<z.infer<typeof creditNoteSchema>>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  const selectedItems = items.filter(i => i.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gstPercent = invoice.gst_percent ?? 18;
  const gstRate = gstPercent / 100;
  const gstAmount = Math.round(subtotal * gstRate * 100) / 100;
  const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  const maxCredit = invoice.total_amount;

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', amount: 0, selected: true }]);
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
    const validItems = selectedItems.filter((item) => item.description && item.amount > 0);
    if (validItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one line item with description and amount',
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
      const gstMode = invoice.gst_mode || 'CGST_SGST';
      const cgstAmount = gstMode === 'CGST_SGST' ? gstAmount / 2 : 0;
      const sgstAmount = gstMode === 'CGST_SGST' ? gstAmount / 2 : 0;
      const igstAmount = gstMode === 'IGST' ? gstAmount : 0;

      const tempCnId = `CN-DRAFT-${Date.now()}`;
      const { data: creditNote, error: insertError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_id: tempCnId,
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
          status: 'Draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const itemsToInsert = validItems.map((item) => ({
        credit_note_id: creditNote.id,
        description: item.description,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from('credit_note_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      if (issueImmediately) {
        const { data: cnNo, error: issueError } = await supabase.rpc('issue_credit_note', {
          p_credit_note_uuid: creditNote.id,
          p_company_id: invoice.company_id,
        });

        if (issueError) throw issueError;

        toast({
          title: 'Credit Note Issued',
          description: `Permanent number assigned: ${cnNo}`,
        });
      } else {
        toast({
          title: 'Success',
          description: `Credit Note saved as draft`,
        });
      }

      onCreditNoteCreated();
      onOpenChange(false);
      form.reset();
      setItems([]);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Label className="text-sm font-medium">
                  Line Items {mode === 'from_invoice' && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (select items to credit)
                    </span>
                  )}
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Item
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-2 items-start p-2 rounded-md border ${
                      item.selected ? 'bg-accent/30 border-primary/30' : 'bg-muted/30 border-transparent opacity-60'
                    }`}
                  >
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-2.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="w-28 shrink-0">
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
                      className="shrink-0"
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
                <span>Subtotal ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST ({gstPercent}%)</span>
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
                    <Textarea placeholder="Additional notes..." {...field} rows={2} />
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
