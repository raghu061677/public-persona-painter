import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

interface ExportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  optionType: "Quotation" | "Estimate" | "Proforma Invoice" | "Work Order";
  format: "Full Detail" | "Summary";
  companyName: string;
  gstin: string;
  fields: {
    // Asset fields
    sr: boolean;
    supplier: boolean;
    mediaType: boolean;
    lat: boolean;
    long: boolean;
    iid: boolean;
    district: boolean;
    city: boolean;
    area: boolean;
    location: boolean;
    w: boolean;
    h: boolean;
    size: boolean;
    sqft: boolean;
    trafficFrom: boolean;
    trafficTo: boolean;
    light: boolean;
    qty: boolean;
    displayQty: boolean;
    availableFrom: boolean;
    startDate: boolean;
    endDate: boolean;
    days: boolean;
    baseRatePerMonth: boolean;
    baseRatePerUnit: boolean;
    cardRatePerMonth: boolean;
    cardRatePerUnit: boolean;
    discountedRate: boolean;
    discountedRatePerUnit: boolean;
    displayCost: boolean;
    printingCost: boolean;
    mountingCost: boolean;
    total: boolean;
    gst: boolean;
    grandTotal: boolean;
    currentDisplay: boolean;
    employee: boolean;
    remarks: boolean;
    replaceBlocked: boolean;
  };
  termsAndConditions: string[];
}

export function ExportSettingsDialog({
  open,
  onOpenChange,
  onExport,
}: ExportSettingsDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    optionType: "Quotation",
    format: "Full Detail",
    companyName: "",
    gstin: "",
    fields: {
      sr: true,
      supplier: false,
      mediaType: false,
      lat: false,
      long: false,
      iid: false,
      district: false,
      city: false,
      area: true,
      location: true,
      w: true,
      h: true,
      size: true,
      sqft: false,
      trafficFrom: false,
      trafficTo: true,
      light: true,
      qty: false,
      displayQty: false,
      availableFrom: false,
      startDate: false,
      endDate: false,
      days: true,
      baseRatePerMonth: false,
      baseRatePerUnit: false,
      cardRatePerMonth: true,
      cardRatePerUnit: true,
      discountedRate: true,
      discountedRatePerUnit: true,
      displayCost: true,
      printingCost: false,
      mountingCost: true,
      total: true,
      gst: true,
      grandTotal: true,
      currentDisplay: false,
      employee: false,
      remarks: false,
      replaceBlocked: false,
    },
    termsAndConditions: [
      "Advance Payment & Purchase Order is Mandatory to start the campaign.",
      "Printing & Mounting will be extra & GST @ 18% will be applicable extra.",
      "Site available date may change in case of present display Renewal.",
      "Site Availability changes every minute, please double check site available dates when you confirm the sites.",
      "Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.",
      "Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered within 5 days of confirmation, we will release the site.",
      "In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.",
      "Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.",
    ],
  });

  const handleFieldToggle = (field: keyof ExportSettings["fields"]) => {
    setSettings((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: !prev.fields[field],
      },
    }));
  };

  const handleExport = () => {
    onExport(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Option Type *</Label>
              <Select
                value={settings.optionType}
                onValueChange={(value: any) =>
                  setSettings((prev) => ({ ...prev, optionType: value }))
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
                value={settings.format}
                onValueChange={(value: any) =>
                  setSettings((prev) => ({ ...prev, format: value }))
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
                value={settings.companyName}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="Enter company name"
              />
            </div>

            <div>
              <Label>GSTIN</Label>
              <Input
                value={settings.gstin}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, gstin: e.target.value }))
                }
                placeholder="Enter GSTIN"
              />
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <h3 className="font-semibold mb-3">Select Fields to Export</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 border rounded-lg p-4">
              {/* Column 1 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sr"
                    checked={settings.fields.sr}
                    onCheckedChange={() => handleFieldToggle("sr")}
                  />
                  <Label htmlFor="sr" className="cursor-pointer">Sr</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="supplier"
                    checked={settings.fields.supplier}
                    onCheckedChange={() => handleFieldToggle("supplier")}
                  />
                  <Label htmlFor="supplier" className="cursor-pointer">Supplier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mediaType"
                    checked={settings.fields.mediaType}
                    onCheckedChange={() => handleFieldToggle("mediaType")}
                  />
                  <Label htmlFor="mediaType" className="cursor-pointer">Media Type</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="long"
                    checked={settings.fields.long}
                    onCheckedChange={() => handleFieldToggle("long")}
                  />
                  <Label htmlFor="long" className="cursor-pointer">Long</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="iid"
                    checked={settings.fields.iid}
                    onCheckedChange={() => handleFieldToggle("iid")}
                  />
                  <Label htmlFor="iid" className="cursor-pointer">IID</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="district"
                    checked={settings.fields.district}
                    onCheckedChange={() => handleFieldToggle("district")}
                  />
                  <Label htmlFor="district" className="cursor-pointer">District</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="city"
                    checked={settings.fields.city}
                    onCheckedChange={() => handleFieldToggle("city")}
                  />
                  <Label htmlFor="city" className="cursor-pointer">City</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="area"
                    checked={settings.fields.area}
                    onCheckedChange={() => handleFieldToggle("area")}
                  />
                  <Label htmlFor="area" className="cursor-pointer">Area</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="location"
                    checked={settings.fields.location}
                    onCheckedChange={() => handleFieldToggle("location")}
                  />
                  <Label htmlFor="location" className="cursor-pointer">Location</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="w"
                    checked={settings.fields.w}
                    onCheckedChange={() => handleFieldToggle("w")}
                  />
                  <Label htmlFor="w" className="cursor-pointer">W</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="h"
                    checked={settings.fields.h}
                    onCheckedChange={() => handleFieldToggle("h")}
                  />
                  <Label htmlFor="h" className="cursor-pointer">H</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="size"
                    checked={settings.fields.size}
                    onCheckedChange={() => handleFieldToggle("size")}
                  />
                  <Label htmlFor="size" className="cursor-pointer">Size</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sqft"
                    checked={settings.fields.sqft}
                    onCheckedChange={() => handleFieldToggle("sqft")}
                  />
                  <Label htmlFor="sqft" className="cursor-pointer">SQFT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trafficFrom"
                    checked={settings.fields.trafficFrom}
                    onCheckedChange={() => handleFieldToggle("trafficFrom")}
                  />
                  <Label htmlFor="trafficFrom" className="cursor-pointer">Traffic From</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trafficTo"
                    checked={settings.fields.trafficTo}
                    onCheckedChange={() => handleFieldToggle("trafficTo")}
                  />
                  <Label htmlFor="trafficTo" className="cursor-pointer">Traffic To</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="light"
                    checked={settings.fields.light}
                    onCheckedChange={() => handleFieldToggle("light")}
                  />
                  <Label htmlFor="light" className="cursor-pointer">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="qty"
                    checked={settings.fields.qty}
                    onCheckedChange={() => handleFieldToggle("qty")}
                  />
                  <Label htmlFor="qty" className="cursor-pointer">Qty</Label>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lat"
                    checked={settings.fields.lat}
                    onCheckedChange={() => handleFieldToggle("lat")}
                  />
                  <Label htmlFor="lat" className="cursor-pointer">Lat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="displayQty"
                    checked={settings.fields.displayQty}
                    onCheckedChange={() => handleFieldToggle("displayQty")}
                  />
                  <Label htmlFor="displayQty" className="cursor-pointer">Display Qty</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="availableFrom"
                    checked={settings.fields.availableFrom}
                    onCheckedChange={() => handleFieldToggle("availableFrom")}
                  />
                  <Label htmlFor="availableFrom" className="cursor-pointer">Available From</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="startDate"
                    checked={settings.fields.startDate}
                    onCheckedChange={() => handleFieldToggle("startDate")}
                  />
                  <Label htmlFor="startDate" className="cursor-pointer">Start Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="endDate"
                    checked={settings.fields.endDate}
                    onCheckedChange={() => handleFieldToggle("endDate")}
                  />
                  <Label htmlFor="endDate" className="cursor-pointer">End Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="days"
                    checked={settings.fields.days}
                    onCheckedChange={() => handleFieldToggle("days")}
                  />
                  <Label htmlFor="days" className="cursor-pointer">Days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="baseRatePerMonth"
                    checked={settings.fields.baseRatePerMonth}
                    onCheckedChange={() => handleFieldToggle("baseRatePerMonth")}
                  />
                  <Label htmlFor="baseRatePerMonth" className="cursor-pointer">Base Rate Per Month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cardRatePerMonth"
                    checked={settings.fields.cardRatePerMonth}
                    onCheckedChange={() => handleFieldToggle("cardRatePerMonth")}
                  />
                  <Label htmlFor="cardRatePerMonth" className="cursor-pointer">Card Rate Per Month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cardRatePerUnit"
                    checked={settings.fields.cardRatePerUnit}
                    onCheckedChange={() => handleFieldToggle("cardRatePerUnit")}
                  />
                  <Label htmlFor="cardRatePerUnit" className="cursor-pointer">Card Rate / Unit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="discountedRate"
                    checked={settings.fields.discountedRate}
                    onCheckedChange={() => handleFieldToggle("discountedRate")}
                  />
                  <Label htmlFor="discountedRate" className="cursor-pointer">Discounted Monthly Rate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="discountedRatePerUnit"
                    checked={settings.fields.discountedRatePerUnit}
                    onCheckedChange={() => handleFieldToggle("discountedRatePerUnit")}
                  />
                  <Label htmlFor="discountedRatePerUnit" className="cursor-pointer">Discounted Rate / Unit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="displayCost"
                    checked={settings.fields.displayCost}
                    onCheckedChange={() => handleFieldToggle("displayCost")}
                  />
                  <Label htmlFor="displayCost" className="cursor-pointer">Display Cost</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="printingCost"
                    checked={settings.fields.printingCost}
                    onCheckedChange={() => handleFieldToggle("printingCost")}
                  />
                  <Label htmlFor="printingCost" className="cursor-pointer">Printing Cost</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mountingCost"
                    checked={settings.fields.mountingCost}
                    onCheckedChange={() => handleFieldToggle("mountingCost")}
                  />
                  <Label htmlFor="mountingCost" className="cursor-pointer">Mounting Cost</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="total"
                    checked={settings.fields.total}
                    onCheckedChange={() => handleFieldToggle("total")}
                  />
                  <Label htmlFor="total" className="cursor-pointer">Total</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gst"
                    checked={settings.fields.gst}
                    onCheckedChange={() => handleFieldToggle("gst")}
                  />
                  <Label htmlFor="gst" className="cursor-pointer">GST (18%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="grandTotal"
                    checked={settings.fields.grandTotal}
                    onCheckedChange={() => handleFieldToggle("grandTotal")}
                  />
                  <Label htmlFor="grandTotal" className="cursor-pointer">Grand Total</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
