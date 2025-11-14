import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, MapPin, Phone, Mail, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Company Type", description: "Choose your business model" },
  { id: 2, title: "Basic Details", description: "Company name and legal information" },
  { id: 3, title: "Tax Information", description: "GSTIN and PAN details" },
  { id: 4, title: "Address", description: "Office location details" },
  { id: 5, title: "Contact", description: "Communication details" },
  { id: 6, title: "Review", description: "Verify and submit" },
];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    type: "media_owner" as "media_owner" | "agency",
    legal_name: "",
    gstin: "",
    pan: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: ""
  });

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.type;
      case 2:
        return !!formData.name && !!formData.legal_name;
      case 3:
        return !!formData.gstin && !!formData.pan;
      case 4:
        return !!formData.address_line1 && !!formData.city && !!formData.state && !!formData.pincode;
      case 5:
        return !!formData.phone && !!formData.email;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies' as any)
        .insert({
          name: formData.name,
          legal_name: formData.legal_name,
          type: formData.type as any,
          gstin: formData.gstin,
          pan: formData.pan,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          created_by: user.id,
          status: 'pending' as any
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Link user to company as admin
      const { error: linkError } = await supabase
        .from('company_users' as any)
        .insert({
          company_id: (companyData as any).id,
          user_id: user.id,
          role: 'admin',
          is_primary: true,
          status: 'active'
        });

      if (linkError) throw linkError;

      toast({
        title: "Company Registered",
        description: "Your company registration is pending approval. We'll notify you once it's activated.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to register company. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Company Registration
            </CardTitle>
            <CardDescription>
              Complete the steps below to register your company. Your registration will be reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div className="flex items-center w-full">
                      {index > 0 && (
                        <div className={cn(
                          "flex-1 h-0.5 transition-colors",
                          currentStep > step.id - 1 ? "bg-primary" : "bg-border"
                        )} />
                      )}
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                        currentStep > step.id ? "bg-primary border-primary text-primary-foreground" :
                        currentStep === step.id ? "border-primary text-primary" :
                        "border-border text-muted-foreground"
                      )}>
                        {currentStep > step.id ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold">{step.id}</span>
                        )}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 transition-colors",
                          currentStep > step.id ? "bg-primary" : "bg-border"
                        )} />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={cn(
                        "text-xs font-medium transition-colors hidden sm:block",
                        currentStep === step.id ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step Content */}
              <div className="min-h-[400px]">
                {/* Step 1: Company Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Choose Your Business Model</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select the type that best describes your business
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Company Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "media_owner" | "agency") =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media_owner">Media Owner</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {formData.type === 'media_owner' 
                          ? 'You own outdoor advertising assets (billboards, hoardings, etc.)'
                          : 'You run advertising campaigns for clients'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Basic Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Company Information</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Provide your company's basic details
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Go-Ads Media Pvt Ltd"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal_name">Legal Name *</Label>
                      <Input
                        id="legal_name"
                        required
                        value={formData.legal_name}
                        onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                        placeholder="Go-Ads Media Private Limited"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Tax Information */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Tax Information</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter your GST and PAN details
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gstin">GSTIN *</Label>
                        <Input
                          id="gstin"
                          required
                          value={formData.gstin}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                          placeholder="29XXXXX1234X1Z5"
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pan">PAN *</Label>
                        <Input
                          id="pan"
                          required
                          value={formData.pan}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Address */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Office Location</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter your company's registered address
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line1">Address Line 1 *</Label>
                      <Input
                        id="address_line1"
                        required
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        placeholder="Building/Street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={formData.address_line2}
                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                        placeholder="Area/Landmark"
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Hyderabad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          required
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder="Telangana"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          required
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          placeholder="500001"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Contact Information */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Contact Details</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        How can we reach you?
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="contact@company.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.company.com"
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Review */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Please verify all details before submitting
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Company Type
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formData.type === 'media_owner' ? 'Media Owner' : 'Agency'}
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium">Basic Information</h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Company Name:</span>
                            <p className="font-medium">{formData.name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Legal Name:</span>
                            <p className="font-medium">{formData.legal_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Tax Information
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">GSTIN:</span>
                            <p className="font-medium">{formData.gstin}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PAN:</span>
                            <p className="font-medium">{formData.pan}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>{formData.address_line1}</p>
                          {formData.address_line2 && <p>{formData.address_line2}</p>}
                          <p>{formData.city}, {formData.state} {formData.pincode}</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact Information
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <p className="font-medium">{formData.phone}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{formData.email}</p>
                          </div>
                          {formData.website && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground">Website:</span>
                              <p className="font-medium">{formData.website}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </div>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit for Approval"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
