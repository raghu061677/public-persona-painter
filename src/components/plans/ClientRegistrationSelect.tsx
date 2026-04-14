import { ClientRegistration } from "@/hooks/useClientRegistrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface Props {
  registrations: ClientRegistration[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ClientRegistrationSelect({ registrations, value, onChange, disabled }: Props) {
  if (registrations.length === 0) return null;

  const selected = registrations.find(r => r.id === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5" />
        Billing / GST Registration
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Select registration..." />
        </SelectTrigger>
        <SelectContent>
          {registrations.map(reg => (
            <SelectItem key={reg.id} value={reg.id}>
              {reg.label}{reg.gstin ? ` — ${reg.gstin}` : ""}{reg.billing_state ? ` (${reg.billing_state})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <div className="text-xs text-muted-foreground space-y-0.5 pl-0.5">
          {selected.gstin && <p>GSTIN: {selected.gstin}</p>}
          {selected.billing_state && <p>Billing State: {selected.billing_state}</p>}
        </div>
      )}
    </div>
  );
}
