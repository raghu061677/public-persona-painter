import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

interface ExportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  clientName: string;
  clientGST?: string;
}

export interface ExportOptions {
  optionType: "quotation" | "estimate" | "proforma_invoice" | "work_order";
  format: "full_detail" | "compact" | "summary_only" | "with_photos";
  exportType: "pdf" | "excel";
  includePhotos: boolean;
  companyName: string;
  gstin: string;
  termsAndConditions: string[];
}

const defaultTerms = [
  "Advance Payment & Purchase Order is Mandatory to start the campaign.",
  "Printing & Mounting will be extra & GST @ 18% will be applicable extra.",
  "Site available date may change in case of present display Renewal.",
  "Site Availability changes every minute, please double check site available dates when you confirm the sites.",
  "Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.",
  "Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered within 5 days of confirmation, we will release the site.",
  "In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.",
  "Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.",
];

export function ExportOptionsDialog({
  open,
  onClose,
  onExport,
  clientName,
  clientGST = "",
}: ExportOptionsDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    optionType: "quotation",
    format: "full_detail",
    exportType: "pdf",
    includePhotos: false,
    companyName: clientName,
    gstin: clientGST,
    termsAndConditions: [...defaultTerms],
  });

  const handleAddTerm = () => {
    setOptions(prev => ({
      ...prev,
      termsAndConditions: [...prev.termsAndConditions, ""],
    }));
  };

  const handleRemoveTerm = (index: number) => {
    setOptions(prev => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTerm = (index: number, value: string) => {
    setOptions(prev => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.map((term, i) =>
        i === index ? value : term
      ),
    }));
  };

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Options Settings</DialogTitle>
          <DialogDescription>Customize export format and included fields.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-destructive">* Option Type</Label>
              <Select
                value={options.optionType}
                onValueChange={(value: any) =>
                  setOptions(prev => ({ ...prev, optionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                  <SelectItem value="proforma_invoice">Proforma Invoice</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-destructive">* Format</Label>
              <Select
                value={options.format}
                onValueChange={(value: any) =>
                  setOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_detail">Full Detail</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="summary_only">Summary Only</SelectItem>
                  <SelectItem value="with_photos">With Photos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-destructive">* Export Type</Label>
              <Select
                value={options.exportType}
                onValueChange={(value: any) =>
                  setOptions(prev => ({ ...prev, exportType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-destructive">* Company Name</Label>
              <Input
                value={options.companyName}
                onChange={(e) =>
                  setOptions(prev => ({ ...prev, companyName: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>GSTIN (?)</Label>
              <Input
                value={options.gstin}
                onChange={(e) =>
                  setOptions(prev => ({ ...prev, gstin: e.target.value }))
                }
                placeholder="Enter GST Number"
              />
            </div>
          </div>

          <div>
            <Label className="font-semibold text-base mb-3 block">
              Terms and Conditions
            </Label>
            <div className="space-y-2">
              {options.termsAndConditions.map((term, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Textarea
                    value={term}
                    onChange={(e) => handleUpdateTerm(index, e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTerm(index)}
                    className="mt-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTerm}
              className="mt-3"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport}>Download</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
