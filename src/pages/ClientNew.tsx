import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateClientCode } from "@/lib/codeGenerator";
import { useCompany } from "@/contexts/CompanyContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StateSelect } from "@/components/clients/StateSelect";
import { getStateCode } from "@/lib/stateCodeMapping";

const clientSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone must be 10 digits").optional().or(z.literal("")),
  company: z.string().optional(),
  gst_number: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST format").optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  city: z.string().optional(),
  notes: z.string().optional(),
});

interface ContactPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
}

export default function ClientNew() {
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompany();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    id: "",
    customerType: "Business",
    name: "",
    company: "",
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

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.state) {
      generateClientId();
    }
  }, [formData.state]);

  const generateClientId = async () => {
    if (!formData.state) return;
    try {
      const stateCode = getStateCode(formData.state);
      const clientId = await generateClientCode(stateCode);
      setFormData(prev => ({ ...prev, id: clientId }));
    } catch (error) {
      console.error("Error generating client ID:", error);
      toast.error("Failed to generate client ID");
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      // Validate basic fields
      const validation = clientSchema.safeParse(formData);
      if (!validation.success) {
        const newErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error("Please fix validation errors");
        return;
      }

      // Insert client
      const { error: clientError } = await supabase
        .from("clients")
        .insert({
          id: formData.id,
          name: formData.name,
          company: formData.company || null,
          company_id: company.id,
          email: formData.email || null,
          phone: formData.phone || null,
          gst_number: formData.gst_number || null,
          state: formData.state,
          city: formData.city || null,
          notes: formData.notes || null,
          billing_address_line1: formData.billing_address_line1 || null,
          billing_address_line2: formData.billing_address_line2 || null,
          billing_city: formData.billing_city || null,
          billing_state: formData.billing_state || null,
          billing_pincode: formData.billing_pincode || null,
          shipping_address_line1: formData.shipping_address_line1 || null,
          shipping_address_line2: formData.shipping_address_line2 || null,
          shipping_city: formData.shipping_city || null,
          shipping_state: formData.shipping_state || null,
          shipping_pincode: formData.shipping_pincode || null,
          shipping_same_as_billing: formData.shipping_same_as_billing,
        });

      if (clientError) throw clientError;

      toast.success("Client created successfully");
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/clients")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">New Client</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Other Details</TabsTrigger>
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
              {/* Customer Type */}
              <div className="space-y-2">
                <Label>Customer Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.customerType === "Business"}
                      onChange={() => updateField("customerType", "Business")}
                      className="text-primary"
                    />
                    Business
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.customerType === "Individual"}
                      onChange={() => updateField("customerType", "Individual")}
                      className="text-primary"
                    />
                    Individual
                  </label>
                </div>
              </div>

              {/* Primary Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Salutation</Label>
                  <Select defaultValue="Mr.">
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
                  <Label>First Name *</Label>
                  <Input
                    value={formData.name.split(' ')[0] || ''}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input />
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => updateField("company", e.target.value)}
                />
              </div>

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
              <CardTitle>Contact Persons</CardTitle>
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
