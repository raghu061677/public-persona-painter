import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  SectionHeader,
  SettingsCard,
  InfoAlert,
  InputRow,
  TwoColumnRow,
  SettingsContentWrapper,
} from "@/components/settings/zoho-style";
import { Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompanyProfile() {
  const { company, refreshCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    gstin: "",
    pan: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    email: "",
    website: "",
    logo_url: "",
  });

  useEffect(() => {
    const loadCompanyDetails = async () => {
      if (!company) return;
      
      try {
        const { data, error } = await supabase
          .from("companies" as any)
          .select("*")
          .eq("id", company.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            name: (data as any).name || "",
            legal_name: (data as any).legal_name || "",
            gstin: (data as any).gstin || "",
            pan: (data as any).pan || "",
            address_line1: (data as any).address_line1 || "",
            address_line2: (data as any).address_line2 || "",
            city: (data as any).city || "",
            state: (data as any).state || "",
            pincode: (data as any).pincode || "",
            country: (data as any).country || "India",
            phone: (data as any).phone || "",
            email: (data as any).email || "",
            website: (data as any).website || "",
            logo_url: (data as any).logo_url || "",
          });
        }
      } catch (error) {
        console.error("Error loading company details:", error);
      }
    };

    loadCompanyDetails();
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies" as any)
        .update(formData)
        .eq("id", company.id);

      if (error) throw error;

      toast.success("Organization profile updated successfully");
      refreshCompany();
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast.error(error.message || "Failed to update organization profile");
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SettingsContentWrapper>
      <SectionHeader
        title="Organization Profile"
        description="Manage your organization's basic information and settings"
        action={
          <Badge variant="outline" className="text-xs">
            Org ID: {company.id.slice(0, 8)}
          </Badge>
        }
      />

      {/* Profile Section */}
      <SettingsCard title="Organization Details">
        <div className="space-y-6">
          <InputRow label="Organization Logo" description="Upload your company logo">
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
              )}
              <div className="flex-1">
                <Input
                  placeholder="Logo URL"
                  value={formData.logo_url}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 200x200px, PNG or JPG
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </InputRow>

          <InputRow label="Organization Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter organization name"
            />
          </InputRow>

          <InputRow label="Legal Name">
            <Input
              value={formData.legal_name}
              onChange={(e) =>
                setFormData({ ...formData, legal_name: e.target.value })
              }
              placeholder="Enter legal name"
            />
          </InputRow>

          <InputRow label="Industry">
            <Select defaultValue="outdoor-advertising">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outdoor-advertising">
                  Outdoor Advertising
                </SelectItem>
                <SelectItem value="media">Media & Entertainment</SelectItem>
                <SelectItem value="marketing">Marketing Agency</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </InputRow>
        </div>
      </SettingsCard>

      {/* Address Section */}
      <SettingsCard title="Organization Address">
        <InfoAlert variant="info" className="mb-6">
          This address will be used for all official communications and appears on
          invoices and documents.
        </InfoAlert>

        <div className="space-y-6">
          <InputRow label="Address Line 1" required>
            <Input
              value={formData.address_line1}
              onChange={(e) =>
                setFormData({ ...formData, address_line1: e.target.value })
              }
              placeholder="Street address"
            />
          </InputRow>

          <InputRow label="Address Line 2">
            <Input
              value={formData.address_line2}
              onChange={(e) =>
                setFormData({ ...formData, address_line2: e.target.value })
              }
              placeholder="Apartment, suite, etc."
            />
          </InputRow>

          <TwoColumnRow
            leftColumn={
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>
            }
            rightColumn={
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>
            }
          />

          <TwoColumnRow
            leftColumn={
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                  placeholder="Pincode"
                />
              </div>
            }
            rightColumn={
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </div>
      </SettingsCard>

      {/* Primary Contact */}
      <SettingsCard title="Primary Contact">
        <InfoAlert variant="warning" className="mb-6">
          Your primary email is used for system notifications. Make sure it's valid
          and regularly monitored.
        </InfoAlert>

        <div className="space-y-6">
          <TwoColumnRow
            leftColumn={
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@company.com"
                />
              </div>
            }
            rightColumn={
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                />
              </div>
            }
          />

          <InputRow label="Website">
            <Input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://www.company.com"
            />
          </InputRow>
        </div>
      </SettingsCard>

      {/* Tax Information */}
      <SettingsCard title="Tax Information">
        <div className="space-y-6">
          <TwoColumnRow
            leftColumn={
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value })
                  }
                  placeholder="29AAAAA0000A1Z5"
                />
              </div>
            }
            rightColumn={
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input
                  value={formData.pan}
                  onChange={(e) =>
                    setFormData({ ...formData, pan: e.target.value })
                  }
                  placeholder="AAAAA0000A"
                />
              </div>
            }
          />
        </div>
      </SettingsCard>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => refreshCompany()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}
