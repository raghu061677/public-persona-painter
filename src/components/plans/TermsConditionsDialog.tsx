import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";

interface TermsConditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (terms: TermsData) => void;
  initialData?: TermsData;
}

export interface TermsData {
  optionType: "Quotation" | "Estimate" | "Proforma Invoice" | "Work Order";
  format: "Full Detail" | "Summary";
  companyName: string;
  gstin: string;
  terms: string[];
}

export function TermsConditionsDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: TermsConditionsDialogProps) {
  const [data, setData] = useState<TermsData>(
    initialData || {
      optionType: "Quotation",
      format: "Full Detail",
      companyName: "",
      gstin: "",
      terms: [
        "Advance Payment & Purchase Order is Mandatory to start the campaign.",
        "Printing & Mounting will be extra & GST @ 18% will be applicable extra.",
        "Site available date may change in case of present display Renewal.",
        "Site Availability changes every minute, please double check site available dates when you confirm the sites.",
        "Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.",
        "Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered within 5 days of confirmation, we will release the site.",
        "In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.",
        "Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.",
      ],
    }
  );

  const handleAddTerm = () => {
    setData((prev) => ({
      ...prev,
      terms: [...prev.terms, ""],
    }));
  };

  const handleRemoveTerm = (index: number) => {
    setData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTerm = (index: number, value: string) => {
    setData((prev) => ({
      ...prev,
      terms: prev.terms.map((term, i) => (i === index ? value : term)),
    }));
  };

  const handleSave = () => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Options Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Option Type *</Label>
              <Select
                value={data.optionType}
                onValueChange={(value: any) =>
                  setData((prev) => ({ ...prev, optionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quotation">Quotation</SelectItem>
                  <SelectItem value="Estimate">Estimate</SelectItem>
                  <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                  <SelectItem value="Work Order">Work Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Format *</Label>
              <Select
                value={data.format}
                onValueChange={(value: any) =>
                  setData((prev) => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Detail">Full Detail</SelectItem>
                  <SelectItem value="Summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Company Name *</Label>
              <Input
                value={data.companyName}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="Enter company name"
              />
            </div>

            <div>
              <Label>GSTIN</Label>
              <Input
                value={data.gstin}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, gstin: e.target.value }))
                }
                placeholder="Enter GSTIN"
              />
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <h3 className="font-semibold mb-3">Terms and Conditions</h3>
            <div className="space-y-3">
              {data.terms.map((term, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={term}
                    onChange={(e) => handleUpdateTerm(index, e.target.value)}
                    placeholder={`Term ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTerm(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddTerm}
              className="mt-3 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
