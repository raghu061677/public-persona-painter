import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/plans';

interface PaymentTermsEditorProps {
  invoiceId: string;
  currentTermsMode: string;
  currentTermsDays: number;
  invoiceDate: string;
  dueDate: string;
  invoiceType: string;
  onUpdate?: (data: { termsMode: string; termsDays: number; dueDate: string }) => void;
  readOnly?: boolean;
}

const TERMS_OPTIONS = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt', days: 0 },
  { value: 'NET_30', label: '30 Days', days: 30 },
  { value: 'NET_45', label: '45 Days', days: 45 },
  { value: 'CUSTOM', label: 'Custom', days: null },
];

function getTermsLabel(termsMode: string, termsDays: number): string {
  switch (termsMode) {
    case 'DUE_ON_RECEIPT': return 'Due on Receipt';
    case 'NET_30': return '30 Net Days';
    case 'NET_45': return '45 Net Days';
    case 'CUSTOM': return `${termsDays} Net Days`;
    default: return 'Due on Receipt';
  }
}

export function PaymentTermsEditor({
  invoiceId,
  currentTermsMode,
  currentTermsDays,
  invoiceDate,
  dueDate,
  invoiceType,
  onUpdate,
  readOnly = false,
}: PaymentTermsEditorProps) {
  const { toast } = useToast();
  const [termsMode, setTermsMode] = useState(currentTermsMode || 'DUE_ON_RECEIPT');
  const [customDays, setCustomDays] = useState(currentTermsDays || 0);
  const [calculatedDueDate, setCalculatedDueDate] = useState(dueDate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    calculateDueDate();
  }, [termsMode, customDays, invoiceDate]);

  const calculateDueDate = () => {
    const date = new Date(invoiceDate);
    let days = 0;
    
    switch (termsMode) {
      case 'DUE_ON_RECEIPT':
        days = 0;
        break;
      case 'NET_30':
        days = 30;
        break;
      case 'NET_45':
        days = 45;
        break;
      case 'CUSTOM':
        days = customDays;
        break;
    }
    
    date.setDate(date.getDate() + days);
    setCalculatedDueDate(date.toISOString().split('T')[0]);
  };

  const handleTermsModeChange = async (value: string) => {
    setTermsMode(value);
    
    if (value !== 'CUSTOM') {
      const option = TERMS_OPTIONS.find(o => o.value === value);
      if (option?.days !== null) {
        setCustomDays(option.days);
      }
    }
    
    await saveTerms(value, value === 'CUSTOM' ? customDays : (TERMS_OPTIONS.find(o => o.value === value)?.days || 0));
  };

  const handleCustomDaysChange = async (days: number) => {
    setCustomDays(days);
    if (termsMode === 'CUSTOM') {
      await saveTerms('CUSTOM', days);
    }
  };

  const saveTerms = async (mode: string, days: number) => {
    if (readOnly) return;
    
    setSaving(true);
    try {
      // Update invoice directly
      const invoiceDateObj = new Date(invoiceDate);
      invoiceDateObj.setDate(invoiceDateObj.getDate() + days);
      const newDueDate = invoiceDateObj.toISOString().split('T')[0];

      const { error } = await supabase
        .from('invoices')
        .update({
          terms_mode: mode,
          terms_days: days,
          due_date: newDueDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      setCalculatedDueDate(newDueDate);
      
      if (onUpdate) {
        onUpdate({ termsMode: mode, termsDays: days, dueDate: newDueDate });
      }

      toast({
        title: 'Payment terms updated',
        description: `Due date set to ${formatDate(newDueDate)}`,
      });
    } catch (error: any) {
      console.error('Error updating payment terms:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment terms',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Payment Terms
          <Badge variant="outline" className="ml-auto">
            {getTermsLabel(termsMode, customDays)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Terms</Label>
            <Select 
              value={termsMode} 
              onValueChange={handleTermsModeChange}
              disabled={readOnly || saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                {TERMS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {termsMode === 'CUSTOM' && (
            <div className="space-y-2">
              <Label>Days</Label>
              <Input
                type="number"
                min={0}
                value={customDays}
                onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || 0)}
                disabled={readOnly || saving}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <Label className="text-muted-foreground text-xs">Invoice Date</Label>
            <p className="font-medium">{formatDate(invoiceDate)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Due Date</Label>
            <p className="font-medium">{formatDate(calculatedDueDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
