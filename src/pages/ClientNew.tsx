import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, X, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StateSelect } from "@/components/clients/StateSelect";
import { getStateCode } from "@/lib/stateCodeMapping";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// GST treatment types
type GstTreatment = "registered" | "unregistered" | "consumer";

// Base schema without GSTIN - GSTIN validation is conditional
const baseSchema = z.object({
  // ID is auto-generated on submit, not required for validation
  email: z.string().trim().email("Invalid email").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
  gst_treatment: z.enum(["registered", "unregistered", "consumer"]),
  // GSTIN is optional in base schema - we validate conditionally based on gst_treatment
  gst_number: z.string().trim().optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  city: z.string().trim().max(50, "City must be less than 50 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
});

// GSTIN regex for validation when required
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const clientSchema = z.discriminatedUnion("customer_type", [
  // Business customer
  baseSchema.extend({
    customer_type: z.literal("business"),
    company: z.string().trim().min(2, "Company name is required for business customers").max(100, "Company name must be less than 100 characters"),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }),
  // Individual customer
  baseSchema.extend({
    customer_type: z.literal("individual"),
    salutation: z.string().min(1, "Salutation is required"),
    first_name: z.string().trim().min(2, "First name is required").max(50, "First name must be less than 50 characters"),
    last_name: z.string().trim().max(50, "Last name must be less than 50 characters").optional().or(z.literal("")),
    company: z.string().optional(),
  }),
]);

interface ContactPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
}

const getDraftStorageKey = (companyId?: string) => 
  companyId ? `client_new_draft:${companyId}` : "client_new_draft";

export default function ClientNew() {
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompany();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showClearDraftDialog, setShowClearDraftDialog] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    customer_type: "business" as "business" | "individual",
    // Individual fields
    salutation: "Mr.",
    first_name: "",
    last_name: "",
    // Business field
    company: "",
    // Common fields
    email: "",
    phone: "",
    gst_treatment: "registered" as GstTreatment,
    gst_number: "",
    state: "",
    city: "",
    notes: "",
    // Billing Address
    billing_address_line1: "",
    billing_address_line2: "",
    billing_city: "",
    billing_state: "",
    billing_pincode: "",
    // Shipping Address
    shipping_address_line1: "",
    shipping_address_line2: "",
    shipping_city: "",
    shipping_state: "",
    shipping_pincode: "",
    shipping_same_as_billing: false,
  });

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get storage key based on company
  const storageKey = getDraftStorageKey(company?.id);

  // Load saved draft from sessionStorage on mount
  useEffect(() => {
    // Only load draft once after company is available
    if (draftLoaded || !company?.id) return;
    
    const key = getDraftStorageKey(company.id);
    const saved = sessionStorage.getItem(key);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log("✅ Restored draft from sessionStorage:", {
          company: parsed.formData?.company,
          first_name: parsed.formData?.first_name,
          state: parsed.formData?.state,
        });
        
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        if (parsed.contactPersons && Array.isArray(parsed.contactPersons)) {
          setContactPersons(parsed.contactPersons);
        }
        setShowDraftBanner(true);
      } catch (error) {
        console.error("❌ Failed to restore draft:", error);
        sessionStorage.removeItem(key);
      }
    }
    
    setDraftLoaded(true);
  }, [company?.id, draftLoaded]);

  // Auto-save draft to sessionStorage whenever form changes (debounced)
  useEffect(() => {
    if (!draftLoaded || !company?.id) return;
    
    // Check if form has meaningful data
    const hasData = formData.company || formData.first_name || formData.email || 
                    formData.gst_number || formData.billing_address_line1 ||
                    contactPersons.some(c => c.firstName || c.lastName || c.email);
    
    if (hasData) {
      const draftData = {
        formData,
        contactPersons,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [formData, contactPersons, draftLoaded, company?.id, storageKey]);

  // Clear draft and reset form
  const handleClearDraft = () => {
    sessionStorage.removeItem(storageKey);
    setFormData({
      id: "",
      customer_type: "business",
      salutation: "Mr.",
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      phone: "",
      gst_treatment: "registered",
      gst_number: "",
      state: "",
      city: "",
      notes: "",
      billing_address_line1: "",
      billing_address_line2: "",
      billing_city: "",
      billing_state: "",
      billing_pincode: "",
      shipping_address_line1: "",
      shipping_address_line2: "",
      shipping_city: "",
      shipping_state: "",
      shipping_pincode: "",
      shipping_same_as_billing: false,
    });
    setContactPersons([]);
    setErrors({});
    setShowDraftBanner(false);
    setShowClearDraftDialog(false);
    toast.success("Draft cleared");
  };

  // Dismiss banner without clearing
  const handleDismissBanner = () => {
    setShowDraftBanner(false);
  };

  // Generate preview ID when state changes (just for display - actual ID is generated atomically on submit)
  useEffect(() => {
    if (formData.state) {
      const stateCode = getStateCode(formData.state);
      // Show preview ID format (actual ID will be generated on submit)
      setFormData(prev => ({ ...prev, id: `${stateCode}-XXXX (auto)` }));
    }
  }, [formData.state]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When switching customer type, clear fields not relevant to new type
      if (field === "customer_type") {
        if (value === "business") {
          // Clear individual fields
          updated.salutation = "Mr.";
          updated.first_name = "";
          updated.last_name = "";
        } else if (value === "individual") {
          // Clear business fields
          updated.company = "";
        }
      }
      
      return updated;
    });
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const copyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shipping_address_line1: prev.billing_address_line1,
      shipping_address_line2: prev.billing_address_line2,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_pincode: prev.billing_pincode,
      shipping_same_as_billing: true,
    }));
  };

  const addContactPerson = () => {
    setContactPersons(prev => [...prev, {
      salutation: "Mr.",
      firstName: "",
      lastName: "",
      email: "",
      workPhone: "",
      mobile: "",
    }]);
  };

  const removeContactPerson = (index: number) => {
    setContactPersons(prev => prev.filter((_, i) => i !== index));
  };

  const updateContactPerson = (index: number, field: keyof ContactPerson, value: string) => {
    setContactPersons(prev => prev.map((person, i) => 
      i === index ? { ...person, [field]: value } : person
    ));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});

      // Check if company data is available
      if (!company?.id) {
        toast.error("Company information not available. Please refresh the page.");
        setLoading(false);
        return;
      }

      // Validate state is selected
      if (!formData.state) {
        toast.error("Please select a state");
        setLoading(false);
        return;
      }

      // Prepare validation data based on customer type
      const validationData = {
        customer_type: formData.customer_type,
        ...(formData.customer_type === "business"
          ? {
              company: formData.company,
            }
          : {
              salutation: formData.salutation,
              first_name: formData.first_name,
              last_name: formData.last_name,
            }),
        email: formData.email,
        phone: formData.phone,
        gst_treatment: formData.gst_treatment,
        gst_number: formData.gst_number,
        state: formData.state,
        city: formData.city,
        notes: formData.notes,
      };

      // Validate with schema
      const validation = clientSchema.safeParse(validationData);
      if (!validation.success) {
        const newErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error("Please fix validation errors");
        setLoading(false);
        return;
      }

      // Conditional GSTIN validation - only required for registered business
      if (formData.gst_treatment === "registered") {
        if (!formData.gst_number || formData.gst_number.trim() === "") {
          setErrors(prev => ({ ...prev, gst_number: "GSTIN is required for registered business" }));
          toast.error("GSTIN is required for registered business");
          setLoading(false);
          return;
        }
        if (!GSTIN_REGEX.test(formData.gst_number.trim())) {
          setErrors(prev => ({ ...prev, gst_number: "Invalid GST format (e.g., 22AAAAA0000A1Z5)" }));
          toast.error("Invalid GSTIN format");
          setLoading(false);
          return;
        }
      }

      // Prepare name field based on customer type
      const clientName = formData.customer_type === "business" 
        ? formData.company 
        : [formData.salutation, formData.first_name, formData.last_name].filter(Boolean).join(' ');

      // Map customer_type to database client_type enum (capitalize first letter)
      const dbClientType = formData.customer_type.charAt(0).toUpperCase() + formData.customer_type.slice(1);
      const stateCode = getStateCode(formData.state);

      // Use atomic RPC function that generates ID and inserts in one transaction
      const { data: result, error: rpcError } = await supabase.rpc('create_client_with_id', {
        p_company_id: company.id,
        p_state_code: stateCode,
        p_name: clientName,
        p_client_type: dbClientType,
        p_company_name: formData.customer_type === "business" ? formData.company.trim() : null,
        p_email: formData.email.trim() || null,
        p_phone: formData.phone.trim() || null,
        p_gst_number: formData.gst_number.trim() || null,
        p_state: formData.state,
        p_city: formData.city.trim() || null,
        p_notes: formData.notes.trim() || null,
        p_billing_address_line1: formData.billing_address_line1.trim() || null,
        p_billing_address_line2: formData.billing_address_line2.trim() || null,
        p_billing_city: formData.billing_city.trim() || null,
        p_billing_state: formData.billing_state || null,
        p_billing_pincode: formData.billing_pincode.trim() || null,
        p_shipping_address_line1: formData.shipping_address_line1.trim() || null,
        p_shipping_address_line2: formData.shipping_address_line2.trim() || null,
        p_shipping_city: formData.shipping_city.trim() || null,
        p_shipping_state: formData.shipping_state || null,
        p_shipping_pincode: formData.shipping_pincode.trim() || null,
        p_shipping_same_as_billing: formData.shipping_same_as_billing,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Check RPC result
      const rpcResult = result as { success: boolean; client_id: string | null; message: string };
      
      if (!rpcResult.success) {
        toast.error(rpcResult.message || "Failed to create client");
        setLoading(false);
        return;
      }

      const newClientId = rpcResult.client_id!;

      // Insert contact persons if any
      if (contactPersons.length > 0) {
        const contactsPayload = contactPersons
          .filter(c => c.firstName || c.lastName || c.email || c.mobile)
          .map((c, index) => ({
            client_id: newClientId,
            company_id: company.id,
            salutation: c.salutation || null,
            first_name: c.firstName || null,
            last_name: c.lastName || null,
            name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
            email: c.email || null,
            work_phone: c.workPhone || null,
            mobile: c.mobile || null,
            phone: c.mobile || c.workPhone || null,
            is_primary: index === 0,
          }));

        if (contactsPayload.length > 0) {
          const { error: contactsError } = await supabase
            .from('client_contacts')
            .insert(contactsPayload);
          
          if (contactsError) {
            console.error("Error inserting contacts:", contactsError);
            toast.error("Client created but failed to add contacts");
          }
        }
      }

      // Clear saved form draft after successful creation
      sessionStorage.removeItem(storageKey);
      
      toast.success(`Client created successfully with ID: ${newClientId}`);
      
      // Check for return path (from Plan/Campaign creation)
      const returnPath = sessionStorage.getItem("clientCreateReturnPath");
      if (returnPath) {
        sessionStorage.removeItem("clientCreateReturnPath");
        navigate(returnPath);
      } else {
        navigate("/admin/clients");
      }

    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(error.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  if (companyLoading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!company?.id) {
    return (
      <div className="p-8">
        <p className="text-destructive">Company information not available. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="New Client"
        description="Create a new client record with complete information"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Clients", path: ROUTES.CLIENTS },
          { label: "New Client" },
        ]}
        showBackButton
        backPath={ROUTES.CLIENTS}
      />

      {/* Draft Restored Banner */}
      {showDraftBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Draft restored from your previous session
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDraftDialog(true)}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800/30"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear Draft
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissBanner}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800/30"
            >
              Keep
            </Button>
          </div>
        </div>
      )}

      {/* Clear Draft Confirmation Dialog */}
      <AlertDialog open={showClearDraftDialog} onOpenChange={setShowClearDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all entered client details and start fresh. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearDraft} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="contacts">Contact Persons</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client ID Display */}
              {formData.state && (
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                  <Label className="text-sm font-medium">Client ID</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-primary">
                      {getStateCode(formData.state)}-XXXX
                    </p>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Auto-generated on save
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A unique ID will be generated automatically when you save
                  </p>
                </div>
              )}
              {/* Customer Type */}
              <div className="space-y-2">
                <Label>Customer Type *</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.customer_type === "business"}
                      onChange={() => updateField("customer_type", "business")}
                      className="text-primary"
                    />
                    <span className="text-sm">Business</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.customer_type === "individual"}
                      onChange={() => updateField("customer_type", "individual")}
                      className="text-primary"
                    />
                    <span className="text-sm">Individual</span>
                  </label>
                </div>
              </div>

              {/* Conditional Fields Based on Customer Type */}
              {formData.customer_type === "business" ? (
                /* Business Customer - Company Name */
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Enter company name"
                    className={errors.company ? "border-destructive" : ""}
                  />
                  {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
                </div>
              ) : (
                /* Individual Customer - Name Fields */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Salutation *</Label>
                    <Select 
                      value={formData.salutation} 
                      onValueChange={(value) => updateField("salutation", value)}
                    >
                      <SelectTrigger className={errors.salutation ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr.">Mr.</SelectItem>
                        <SelectItem value="Mrs.">Mrs.</SelectItem>
                        <SelectItem value="Ms.">Ms.</SelectItem>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.salutation && <p className="text-xs text-destructive">{errors.salutation}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      placeholder="Enter first name"
                      className={errors.first_name ? "border-destructive" : ""}
                    />
                    {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      placeholder="Enter last name (optional)"
                      className={errors.last_name ? "border-destructive" : ""}
                    />
                    {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="10 digit number"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input placeholder="10 digit number" />
                </div>
              </div>

              {/* GST Treatment */}
              <div className="space-y-2">
                <Label>GST Treatment *</Label>
                <Select 
                  value={formData.gst_treatment} 
                  onValueChange={(value) => {
                    updateField("gst_treatment", value);
                    // Clear GSTIN error when switching away from registered
                    if (value !== "registered" && errors.gst_number) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.gst_number;
                        return newErrors;
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered Business - Regular</SelectItem>
                    <SelectItem value="unregistered">Unregistered Business</SelectItem>
                    <SelectItem value="consumer">Consumer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PAN */}
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input placeholder="ABCDE1234F" />
              </div>

              {/* GST Number - Only show/require for registered business */}
              {formData.gst_treatment === "registered" && (
                <div className="space-y-2">
                  <Label>GSTIN *</Label>
                  <Input
                    value={formData.gst_number}
                    onChange={(e) => updateField("gst_number", e.target.value.toUpperCase())}
                    placeholder="15 character GST number (e.g., 22AAAAA0000A1Z5)"
                    className={errors.gst_number ? "border-destructive" : ""}
                  />
                  {errors.gst_number && <p className="text-xs text-destructive">{errors.gst_number}</p>}
                </div>
              )}

              {/* State */}
              <div className="space-y-2">
                <Label>Place of Supply *</Label>
                <StateSelect
                  value={formData.state}
                  onValueChange={(value) => updateField("state", value)}
                  placeholder="Select state"
                  className={errors.state ? "border-destructive" : ""}
                  error={errors.state}
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select defaultValue="INR">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Terms */}
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select defaultValue="due_on_receipt">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Attention</Label>
                  <Input
                    placeholder="Attention"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country/Region</Label>
                  <Select defaultValue="India">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address (Street 1)</Label>
                  <Textarea
                    value={formData.billing_address_line1}
                    onChange={(e) => updateField("billing_address_line1", e.target.value)}
                    placeholder="Street 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Street 2</Label>
                  <Textarea
                    value={formData.billing_address_line2}
                    onChange={(e) => updateField("billing_address_line2", e.target.value)}
                    placeholder="Street 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.billing_city}
                    onChange={(e) => updateField("billing_city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <StateSelect
                    value={formData.billing_state}
                    onValueChange={(value) => updateField("billing_state", value)}
                    placeholder="Select state"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pin Code</Label>
                  <Input
                    value={formData.billing_pincode}
                    onChange={(e) => updateField("billing_pincode", e.target.value)}
                    placeholder="6 digit pincode"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="Phone" />
                </div>
                <div className="space-y-2">
                  <Label>Fax Number</Label>
                  <Input placeholder="Fax Number" />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shipping Address</CardTitle>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={copyBillingToShipping}
                    className="text-primary"
                  >
                    Copy billing address
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Attention</Label>
                  <Input placeholder="Attention" />
                </div>
                <div className="space-y-2">
                  <Label>Country/Region</Label>
                  <Select defaultValue="India">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address (Street 1)</Label>
                  <Textarea
                    value={formData.shipping_address_line1}
                    onChange={(e) => updateField("shipping_address_line1", e.target.value)}
                    placeholder="Street 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Street 2</Label>
                  <Textarea
                    value={formData.shipping_address_line2}
                    onChange={(e) => updateField("shipping_address_line2", e.target.value)}
                    placeholder="Street 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.shipping_city}
                    onChange={(e) => updateField("shipping_city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <StateSelect
                    value={formData.shipping_state}
                    onValueChange={(value) => updateField("shipping_state", value)}
                    placeholder="Select state"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pin Code</Label>
                  <Input
                    value={formData.shipping_pincode}
                    onChange={(e) => updateField("shipping_pincode", e.target.value)}
                    placeholder="6 digit pincode"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="Phone" />
                </div>
                <div className="space-y-2">
                  <Label>Fax Number</Label>
                  <Input placeholder="Fax Number" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contact Persons Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Contact Persons</CardTitle>
                {formData.customer_type === "business" && (
                  <p className="text-sm text-muted-foreground">
                    Add contact persons for this business client
                  </p>
                )}
              </div>
              <Button onClick={addContactPerson} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact Person
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactPersons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No contact persons added yet
                </p>
              ) : (
                <div className="space-y-6">
                  {contactPersons.map((person, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium">Contact Person {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContactPerson(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="space-y-2">
                            <Label>Salutation</Label>
                            <Select
                              value={person.salutation}
                              onValueChange={(value) => updateContactPerson(index, "salutation", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Mr.">Mr.</SelectItem>
                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                                <SelectItem value="Ms.">Ms.</SelectItem>
                                <SelectItem value="Dr.">Dr.</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input
                              value={person.firstName}
                              onChange={(e) => updateContactPerson(index, "firstName", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                              value={person.lastName}
                              onChange={(e) => updateContactPerson(index, "lastName", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              type="email"
                              value={person.email}
                              onChange={(e) => updateContactPerson(index, "email", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Work Phone</Label>
                            <Input
                              value={person.workPhone}
                              onChange={(e) => updateContactPerson(index, "workPhone", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mobile</Label>
                            <Input
                              value={person.mobile}
                              onChange={(e) => updateContactPerson(index, "mobile", e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remarks Tab */}
        <TabsContent value="remarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes & Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Notes (Internal Use)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={6}
                  placeholder="Add any internal notes about this client..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/clients")}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Client"}
        </Button>
      </div>
    </div>
  );
}
