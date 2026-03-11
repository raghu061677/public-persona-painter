import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_OPTIONS = [
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Advance Payment", label: "Advance Payment" },
  { value: "Net 15 Days", label: "Net 15 Days" },
  { value: "Net 30 Days", label: "Net 30 Days" },
  { value: "Net 35 Days from display start date", label: "Net 35 Days from display start date" },
  { value: "Net 45 Days", label: "Net 45 Days" },
  { value: "Net 60 Days", label: "Net 60 Days" },
  { value: "50% Advance + balance on completion", label: "50% Advance + balance on completion" },
  { value: "__custom__", label: "Custom" },
];

interface PaymentTermsInputProps {
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  label?: string;
}

export function PaymentTermsInput({
  value,
  onChange,
  helperText,
  disabled = false,
  label = "Payment Terms",
}: PaymentTermsInputProps) {
  // Determine if the current value matches a preset
  const isPreset = PRESET_OPTIONS.some(
    (opt) => opt.value !== "__custom__" && opt.value === value
  );
  const [isCustom, setIsCustom] = useState(!isPreset && !!value);
  const [customText, setCustomText] = useState(!isPreset ? value : "");

  // Sync when value changes externally (e.g. loading existing record)
  useEffect(() => {
    const matchesPreset = PRESET_OPTIONS.some(
      (opt) => opt.value !== "__custom__" && opt.value === value
    );
    if (!matchesPreset && value) {
      setIsCustom(true);
      setCustomText(value);
    } else {
      setIsCustom(false);
    }
  }, [value]);

  const selectValue = isCustom ? "__custom__" : value || "";

  const handleSelectChange = (selected: string) => {
    if (selected === "__custom__") {
      setIsCustom(true);
      // Keep existing custom text or clear
      onChange(customText || "");
    } else {
      setIsCustom(false);
      setCustomText("");
      onChange(selected);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Select
        value={selectValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Select payment terms" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Enter custom payment terms..."
          disabled={disabled}
          className="mt-2"
        />
      )}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Resolves payment terms using the priority chain:
 * plan.payment_terms → client.payment_terms → org default → "Net 30 Days"
 */
export function resolvePaymentTerms(
  planTerms?: string | null,
  clientTerms?: string | null,
  orgDefault?: string | null
): string {
  return planTerms || clientTerms || orgDefault || "Net 30 Days";
}
