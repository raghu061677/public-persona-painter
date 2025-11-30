import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDistrictsByState } from "@/lib/districtMapping";

interface DistrictSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  selectedState: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export function DistrictSelect({
  value,
  onValueChange,
  selectedState,
  placeholder = "Select district...",
  className,
  error,
  disabled = false,
}: DistrictSelectProps) {
  const districts = selectedState ? getDistrictsByState(selectedState) : [];

  return (
    <div className="space-y-2">
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled || !selectedState || districts.length === 0}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {districts.length > 0 ? (
            districts.map((district) => (
              <SelectItem key={district} value={district}>
                {district}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              {selectedState ? 'No districts available' : 'Please select a state first'}
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
