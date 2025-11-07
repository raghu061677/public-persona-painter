import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATE_CODES } from "@/lib/stateCodeMapping";

interface StateSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

// Convert state codes object to array for easier use
const STATES = Object.entries(INDIAN_STATE_CODES).map(([name, code]) => ({
  name,
  code,
}));

export function StateSelect({
  value,
  onValueChange,
  placeholder = "Select state...",
  className,
  error,
}: StateSelectProps) {
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {STATES.map((state) => (
            <SelectItem key={state.code} value={state.name}>
              {state.name} ({state.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
