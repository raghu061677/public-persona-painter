import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Upload, Loader2 } from "lucide-react";
import { storage } from "@/lib/supabase-wrapper";

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    type: "media_owner" as "media_owner" | "agency",
    gstin: "",
    pan: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    theme_color: "#1e40af",
    secondary_color: "#10b981",
    
    // User details
    user_email: "",
    user_password: "",
    user_name: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (companyId: string): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;

      const { error: uploadError } = await storage
        .from('logos')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = storage.from('logos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.user_email,
        password: formData.user_password,
        options: {
          data: {
            full_name: formData.user_name
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // 2. Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          legal_name: formData.legal_name,
          type: formData.type,
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
          theme_color: formData.theme_color,
          secondary_color: formData.secondary_color,
          status: 'pending',
          created_by: authData.user.id
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 3. Upload logo if provided
      if (logoFile && companyData) {
        const logoUrl = await uploadLogo(companyData.id);
        if (logoUrl) {
          await supabase
            .from('companies')
            .update({ logo_url: logoUrl })
            .eq('id', companyData.id);
        }
      }

      // 4. Create company_users association
      const { error: cuError } = await supabase
        .from('company_users')
        .insert({
          company_id: companyData.id,
          user_id: authData.user.id,
          role: 'admin',
          is_primary: true,
          status: 'active'
        });

      if (cuError) throw cuError;

      // 5. Create free trial subscription
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 day trial

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          company_id: companyData.id,
          tier: 'free',
          status: 'trialing',
          start_date: new Date().toISOString().split('T')[0],
          end_date: trialEndDate.toISOString().split('T')[0],
          amount: 0,
          max_assets: 10,
          max_users: 3,
          max_campaigns: 5
        });

      if (subError) throw subError;

      toast({
        title: "Registration Successful!",
        description: "Your account is pending approval. You'll receive an email once approved.",
      });

      // Redirect to login
      setTimeout(() => navigate('/auth'), 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Register Your Company</CardTitle>
          <CardDescription>
            Join Go-Ads 360° as a Media Owner or Agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Company Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media_owner">Media Owner</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Go-Ads Media Pvt Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  placeholder="Same as company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN *</Label>
                <Input
                  id="gstin"
                  required
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value)}
                  placeholder="AAAAA0000A"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  required
                  value={formData.address_line1}
                  onChange={(e) => handleInputChange('address_line1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleInputChange('address_line2', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    required
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Company Email *</Label>
                <Input
                  id="email"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 object-contain rounded border" />
                )}
              </div>
            </div>

            {/* Branding Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme_color">Primary Brand Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="theme_color"
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => handleInputChange('theme_color', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={formData.theme_color}
                    onChange={(e) => handleInputChange('theme_color', e.target.value)}
                    placeholder="#1e40af"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    placeholder="#10b981"
                  />
                </div>
              </div>
            </div>

            {/* Admin User Details */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Admin Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_name">Your Name *</Label>
                  <Input
                    id="user_name"
                    required
                    value={formData.user_name}
                    onChange={(e) => handleInputChange('user_name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_email">Your Email *</Label>
                  <Input
                    id="user_email"
                    required
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => handleInputChange('user_email', e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user_password">Password *</Label>
                <Input
                  id="user_password"
                  required
                  type="password"
                  value={formData.user_password}
                  onChange={(e) => handleInputChange('user_password', e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/auth')}
              >
                Already have an account?
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Company"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
