import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
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
  const [daysInput, setDaysInput] = useState<string>(String(currentTermsDays || 0));
  const [calculatedDueDate, setCalculatedDueDate] = useState(dueDate);
  const [saving, setSaving] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isUserEditing = useRef(false);

  // Sync local state when props change (e.g., after refetch), but don't
  // overwrite while the user is actively typing in the days input.
  useEffect(() => {
    setTermsMode(currentTermsMode || 'DUE_ON_RECEIPT');
    if (!isUserEditing.current) {
      setCustomDays(currentTermsDays || 0);
      setDaysInput(String(currentTermsDays || 0));
      setIsDirty(false);
    }
  }, [currentTermsMode, currentTermsDays]);

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
    setDaysError(null);

    if (value !== 'CUSTOM') {
      const option = TERMS_OPTIONS.find(o => o.value === value);
      if (option?.days !== null) {
        setCustomDays(option.days);
        setDaysInput(String(option.days));
        setIsDirty(false);
      }
      await saveTerms(value, option?.days || 0);
    } else {
      // Don't auto-save when switching to CUSTOM — wait for user to click Save
      setIsDirty(true);
    }
  };

  const handleDaysInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserEditing.current = true;
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9]/g, '');
    setDaysInput(cleaned);
    setIsDirty(true);
    setJustSaved(false);

    if (cleaned === '') {
      setDaysError('Enter a whole number of days');
    } else {
      const n = parseInt(cleaned, 10);
      if (!Number.isInteger(n) || n < 0 || n > 365) {
        setDaysError('Enter a whole number between 0 and 365');
      } else {
        setDaysError(null);
      }
    }

    if (cleaned !== '') {
      const n = parseInt(cleaned, 10);
      setCustomDays(n);
    }
  };

  const handleSaveCustom = async () => {
    if (daysError) return;
    if (daysInput === '') {
      setDaysError('Enter a whole number of days');
      return;
    }
    const days = parseInt(daysInput, 10);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setDaysError('Enter a whole number between 0 and 365');
      return;
    }
    setCustomDays(days);
    isUserEditing.current = false;
    await saveTerms('CUSTOM', days);
  };

  const handleDaysKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCustom();
    }
  };

  const saveTerms = async (mode: string, days: number) => {
    if (readOnly) return;
    
    setSaving(true);
    try {
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
      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      if (onUpdate) {
        onUpdate({ termsMode: mode, termsDays: days, dueDate: newDueDate });
      }

      toast({
        title: 'Payment terms updated',
        description: `Due date set to ${formatDate(newDueDate)}`,
      });
    } catch (error: any) {
      console.error('Error updating payment terms:', error);
      const detail = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
      toast({
        title: 'Error',
        description: detail || 'Failed to update payment terms',
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
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={daysInput}
                  onChange={handleDaysInputChange}
                  onKeyDown={handleDaysKeyDown}
                  onBlur={() => { isUserEditing.current = false; }}
                  disabled={readOnly || saving}
                  placeholder="e.g. 15"
                  aria-invalid={!!daysError}
                  className={daysError ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustom}
                  disabled={readOnly || saving || !!daysError || !isDirty}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              {daysError && (
                <p className="text-[0.8rem] font-medium text-destructive">{daysError}</p>
              )}
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
            <p className="font-medium flex items-center gap-2">
              {formatDate(calculatedDueDate)}
              {justSaved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-normal">
                  <Check className="h-3 w-3" /> Updated
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
