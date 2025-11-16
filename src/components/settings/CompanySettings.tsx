import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Upload, Save } from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logo_url: string | null;
  theme_color: string | null;
  secondary_color: string | null;
}

export function CompanySettings() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser) return;

      const { data: companyData, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyUser.company_id)
        .single();

      if (error) throw error;
      setCompany(companyData);
    } catch (error) {
      console.error("Error loading company:", error);
      toast({
        title: "Error",
        description: "Failed to load company settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: company.name,
          legal_name: company.legal_name,
          gstin: company.gstin,
          pan: company.pan,
          email: company.email,
          phone: company.phone,
          website: company.website,
          address_line1: company.address_line1,
          address_line2: company.address_line2,
          city: company.city,
          state: company.state,
          pincode: company.pincode,
          theme_color: company.theme_color,
          secondary_color: company.secondary_color,
        })
        .eq("id", company.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings updated successfully",
      });
    } catch (error) {
      console.error("Error saving company:", error);
      toast({
        title: "Error",
        description: "Failed to save company settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!company) {
    return <div className="text-center py-8">No company data found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Company Information</CardTitle>
          </div>
          <CardDescription>
            Update your company profile and business details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input
                id="legal_name"
                value={company.legal_name || ""}
                onChange={(e) => setCompany({ ...company, legal_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={company.gstin || ""}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={company.pan || ""}
                onChange={(e) => setCompany({ ...company, pan: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={company.email || ""}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={company.phone || ""}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={company.website || ""}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Address</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={company.address_line1 || ""}
                  onChange={(e) => setCompany({ ...company, address_line1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={company.address_line2 || ""}
                  onChange={(e) => setCompany({ ...company, address_line2: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={company.city || ""}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={company.state || ""}
                    onChange={(e) => setCompany({ ...company, state: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={company.pincode || ""}
                    onChange={(e) => setCompany({ ...company, pincode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
