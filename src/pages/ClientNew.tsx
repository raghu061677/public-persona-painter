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
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StateSelect } from "@/components/clients/StateSelect";
import { getStateCode } from "@/lib/stateCodeMapping";

// Discriminated union schema for customer type
const baseSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
  email: z.string().trim().email("Invalid email").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
  gst_number: z.string().trim().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST format").optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  city: z.string().trim().max(50, "City must be less than 50 characters").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
});

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

const FORM_STORAGE_KEY = "client-new-form-draft";

export default function ClientNew() {
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompany();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
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

  // Aggressively prevent page refresh/reload when tab visibility changes
  useEffect(() => {
    const preventReload = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    };

    const preventVisibilityReload = () => {
      // Prevent service worker from reloading the page
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            // Don't unregister, just prevent updates during form editing
            registration.update = async () => registration;
          });
        });
      }
    };

    // Prevent various events that could trigger reload
    document.addEventListener("visibilitychange", preventVisibilityReload);
    window.addEventListener("beforeunload", preventReload);
    window.addEventListener("pageshow", preventReload);
    window.addEventListener("focus", preventReload);
    
    // Mark that we're editing a form (used by service worker)
    sessionStorage.setItem("editing-form", "true");
    
    return () => {
      document.removeEventListener("visibilitychange", preventVisibilityReload);
      window.removeEventListener("beforeunload", preventReload);
      window.removeEventListener("pageshow", preventReload);
      window.removeEventListener("focus", preventReload);
      sessionStorage.removeItem("editing-form");
    };
  }, []);

  // Load saved form from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log("✅ Restored form data from localStorage:", {
          id: parsed.id,
          customer_type: parsed.customer_type,
          company: parsed.company,
          first_name: parsed.first_name,
        });
        setFormData(parsed);
      } catch (error) {
        console.error("❌ Failed to restore form data:", error);
      }
    } else {
      console.log("ℹ️ No saved form data found in localStorage");
    }
  }, []);

  // Auto-save form to localStorage whenever formData changes
  useEffect(() => {
    if (formData.id || formData.company || formData.first_name || formData.email) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
      console.log("💾 Form auto-saved to localStorage");
    }
  }, [formData]);
  
  // Log when component mounts/unmounts to detect reload issues
  useEffect(() => {
    console.log("🚀 ClientNew component mounted");
    return () => {
      console.log("💥 ClientNew component unmounted");
    };
  }, []);

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate client ID when state changes
  useEffect(() => {
    if (formData.state && company?.id) {
      generateClientId();
    }
  }, [formData.state, company?.id]);

  const generateClientId = async () => {
    if (!formData.state || !company?.id) return;
    
    try {
      const stateCode = getStateCode(formData.state);
      
      // Call server-side RPC function for guaranteed unique ID
      const { data, error } = await supabase.rpc('generate_client_id', {
        p_state_code: stateCode,
        p_company_id: company.id
      });

      if (error) throw error;
      
      if (data) {
        setFormData(prev => ({ ...prev, id: data }));
      }
    } catch (error: any) {
      console.error("Error generating client ID:", error);
      toast.error(error.message || "Failed to generate client ID");
    }
  };

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

      // Ensure we have a client ID
      if (!formData.id) {
        toast.error("Client ID not generated. Please select a state first.");
        setLoading(false);
        return;
      }

      // Prepare validation data based on customer type
      const validationData = {
        id: formData.id,
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

      // Prepare name field based on customer type
      const clientName = formData.customer_type === "business" 
        ? formData.company 
        : [formData.salutation, formData.first_name, formData.last_name].filter(Boolean).join(' ');

      // Insert client using the pre-generated ID from RPC
      // Map customer_type to database client_type enum (capitalize first letter)
      const dbClientType = formData.customer_type.charAt(0).toUpperCase() + formData.customer_type.slice(1);
      
      const { error: clientError } = await supabase
        .from("clients")
        .insert([{
          id: formData.id,
          name: clientName,
          client_type: dbClientType as any,
          company: formData.customer_type === "business" ? formData.company.trim() : null,
          company_id: company.id,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          gst_number: formData.gst_number.trim() || null,
          state: formData.state,
          city: formData.city.trim() || null,
          notes: formData.notes.trim() || null,
          billing_address_line1: formData.billing_address_line1.trim() || null,
          billing_address_line2: formData.billing_address_line2.trim() || null,
          billing_city: formData.billing_city.trim() || null,
          billing_state: formData.billing_state || null,
          billing_pincode: formData.billing_pincode.trim() || null,
          shipping_address_line1: formData.shipping_address_line1.trim() || null,
          shipping_address_line2: formData.shipping_address_line2.trim() || null,
          shipping_city: formData.shipping_city.trim() || null,
          shipping_state: formData.shipping_state || null,
          shipping_pincode: formData.shipping_pincode.trim() || null,
          shipping_same_as_billing: formData.shipping_same_as_billing,
        }]);

      if (clientError) {
        // If duplicate error, regenerate ID and try one more time
        if (clientError.code === '23505') {
          console.log("Duplicate detected, regenerating ID...");
          await generateClientId();
          toast.error("Client ID conflict detected. Please try again.");
          setLoading(false);
          return;
        }
        throw clientError;
      }

      // Insert contact persons if any
      if (contactPersons.length > 0) {
        const contactsPayload = contactPersons
          .filter(c => c.firstName || c.lastName || c.email || c.mobile)
          .map((c, index) => ({
            client_id: formData.id,
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
      localStorage.removeItem(FORM_STORAGE_KEY);
      
      toast.success(`Client created successfully with ID: ${formData.id}`);
      navigate("/admin/clients");

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
              {formData.id && (
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                  <Label className="text-sm font-medium">Client ID (Auto-generated)</Label>
                  <p className="text-lg font-semibold text-primary">{formData.id}</p>
                  <p className="text-xs text-muted-foreground">
                    This ID is automatically generated based on the state you select below
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
                <Select defaultValue="registered">
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

              {/* GST Number */}
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={formData.gst_number}
                  onChange={(e) => updateField("gst_number", e.target.value)}
                  placeholder="15 character GST number"
                  className={errors.gst_number ? "border-destructive" : ""}
                />
                {errors.gst_number && <p className="text-xs text-destructive">{errors.gst_number}</p>}
              </div>

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
