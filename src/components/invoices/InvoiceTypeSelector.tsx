import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceTypeSelectorProps {
  invoiceId: string;
  currentType: string;
  onUpdate?: (type: string) => void;
  readOnly?: boolean;
}

const INVOICE_TYPES = [
  { 
    value: 'TAX_INVOICE', 
    label: 'Tax Invoice', 
    description: 'Standard GST tax invoice for completed services',
    icon: Receipt 
  },
  { 
    value: 'PROFORMA', 
    label: 'Proforma Invoice', 
    description: 'Quotation-style invoice before service delivery',
    icon: FileText 
  },
];

export function InvoiceTypeSelector({
  invoiceId,
  currentType,
  onUpdate,
  readOnly = false,
}: InvoiceTypeSelectorProps) {
  const { toast } = useToast();
  const [invoiceType, setInvoiceType] = useState(currentType || 'TAX_INVOICE');
  const [saving, setSaving] = useState(false);

  const handleTypeChange = async (value: string) => {
    if (readOnly) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_type: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      setInvoiceType(value);
      
      if (onUpdate) {
        onUpdate(value);
      }

      toast({
        title: 'Invoice type updated',
        description: `Changed to ${value === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'}`,
      });
    } catch (error: any) {
      console.error('Error updating invoice type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice type',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Invoice Type</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={invoiceType} 
          onValueChange={handleTypeChange}
          disabled={readOnly || saving}
          className="grid grid-cols-2 gap-4"
        >
          {INVOICE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.value}>
                <RadioGroupItem
                  value={type.value}
                  id={type.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={type.value}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Icon className="mb-2 h-6 w-6" />
                  <span className="font-medium">{type.label}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {type.description}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
