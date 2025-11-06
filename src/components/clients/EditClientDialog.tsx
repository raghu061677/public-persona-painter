import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateClientCode } from "@/lib/codeGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const INDIAN_STATES = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" },
];

// Validation schema with Zod
const clientSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional().or(z.literal("")),
  gst_number: z.string().trim().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format").optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  city: z.string().trim().max(50, "City must be less than 50 characters").optional().or(z.literal("")),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional().or(z.literal("")),
  contact_person: z.string().trim().max(100, "Contact person must be less than 100 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EditClientDialogProps {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: () => void;
}

export function EditClientDialog({ 
  client, 
  open, 
  onOpenChange,
  onClientUpdated 
}: EditClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    gst_number: "",
    state: "",
    city: "",
    address: "",
    contact_person: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (client && open) {
      setFormData({
        id: client.id || "",
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company: client.company || "",
        gst_number: client.gst_number || "",
        state: client.state || "",
        city: client.city || "",
        address: client.address || "",
        contact_person: client.contact_person || "",
        notes: client.notes || "",
      });
      setErrors({});
    }
  }, [client, open]);

  const validateForm = (): boolean => {
    try {
      clientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name.trim(),
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          company: formData.company?.trim() || null,
          gst_number: formData.gst_number?.trim() || null,
          state: formData.state,
          city: formData.city?.trim() || null,
          address: formData.address?.trim() || null,
          contact_person: formData.contact_person?.trim() || null,
          notes: formData.notes?.trim() || null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client updated successfully",
      });

      onOpenChange(false);
      onClientUpdated();
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Client ID - Read Only */}
            <div className="col-span-2">
              <Label>Client ID</Label>
              <Input
                value={formData.id}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Name */}
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Client name"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                placeholder="10 digit number"
                maxLength={10}
              />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
            </div>

            {/* Company */}
            <div>
              <Label>Company</Label>
              <Input
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Company name"
              />
              {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
            </div>

            {/* GST Number */}
            <div>
              <Label>GST Number</Label>
              <Input
                value={formData.gst_number}
                onChange={(e) => updateField('gst_number', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              {errors.gst_number && <p className="text-sm text-destructive mt-1">{errors.gst_number}</p>}
            </div>

            {/* State */}
            <div>
              <Label>State *</Label>
              <Select value={formData.state} onValueChange={(value) => updateField('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
            </div>

            {/* City */}
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City name"
              />
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Full address"
                rows={2}
              />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
            </div>

            {/* Contact Person */}
            <div className="col-span-2">
              <Label>Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => updateField('contact_person', e.target.value)}
                placeholder="Primary contact person name"
              />
              {errors.contact_person && <p className="text-sm text-destructive mt-1">{errors.contact_person}</p>}
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Internal notes about this client..."
                rows={3}
              />
              {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
