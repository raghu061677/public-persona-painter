import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Globe } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, InfoAlert } from "@/components/settings/zoho-style";
import { ClientPortalPreview } from "@/components/settings/ClientPortalPreview";

export default function CompanyClientPortal() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    portal_enabled: true,
    portal_welcome_message: "",
    portal_footer_text: "",
    allow_document_download: true,
    allow_payment_online: true,
    show_campaign_progress: true,
    show_proof_gallery: true,
    require_login: true,
    session_timeout_minutes: 30,
    enable_notifications: true,
  });

  useEffect(() => {
    if (company) {
      const metadata = (company as any).metadata || {};
      const portal = metadata.client_portal || {};
      setFormData({
        portal_enabled: portal.portal_enabled !== false,
        portal_welcome_message: portal.portal_welcome_message || "",
        portal_footer_text: portal.portal_footer_text || "",
        allow_document_download: portal.allow_document_download !== false,
        allow_payment_online: portal.allow_payment_online !== false,
        show_campaign_progress: portal.show_campaign_progress !== false,
        show_proof_gallery: portal.show_proof_gallery !== false,
        require_login: portal.require_login !== false,
        session_timeout_minutes: portal.session_timeout_minutes || 30,
        enable_notifications: portal.enable_notifications !== false,
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies' as any)
        .update({
          metadata: {
            ...((company as any).metadata || {}),
            client_portal: formData,
          }
        })
        .eq('id', company.id);

      if (error) throw error;

      await refreshCompany();

      toast({
        title: "Client portal settings updated",
        description: "Your client portal configuration has been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating portal settings:", error);
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader
        title="Client Portal"
        description="Configure your client-facing portal settings and access controls"
      />

      <InfoAlert variant="info">
        The client portal allows your customers to view campaigns, proofs, and invoices online.
      </InfoAlert>

      <SettingsCard
        title="Portal Status"
        description="Enable or disable the client portal"
      >
        <InputRow label="Enable Client Portal" description="Make the portal accessible to clients">
          <Switch
            checked={formData.portal_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, portal_enabled: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard
        title="Portal Branding"
        description="Customize portal messages and branding"
      >
        <InputRow label="Welcome Message" description="Message shown on portal home page">
          <Textarea
            value={formData.portal_welcome_message}
            onChange={(e) => setFormData({ ...formData, portal_welcome_message: e.target.value })}
            placeholder="Welcome to our client portal. View your campaigns and download reports."
            rows={3}
          />
        </InputRow>

        <InputRow label="Footer Text" description="Custom footer text for portal pages">
          <Input
            value={formData.portal_footer_text}
            onChange={(e) => setFormData({ ...formData, portal_footer_text: e.target.value })}
            placeholder="© 2025 Your Company. All rights reserved."
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard
        title="Access & Features"
        description="Control what clients can see and do in the portal"
      >
        <InputRow label="Allow Document Downloads" description="Let clients download proofs and reports">
          <Switch
            checked={formData.allow_document_download}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_document_download: checked })}
          />
        </InputRow>

        <InputRow label="Enable Online Payments" description="Allow clients to pay invoices online">
          <Switch
            checked={formData.allow_payment_online}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_payment_online: checked })}
          />
        </InputRow>

        <InputRow label="Show Campaign Progress" description="Display campaign status and progress bars">
          <Switch
            checked={formData.show_campaign_progress}
            onCheckedChange={(checked) => setFormData({ ...formData, show_campaign_progress: checked })}
          />
        </InputRow>

        <InputRow label="Show Proof Gallery" description="Display installation proof photos">
          <Switch
            checked={formData.show_proof_gallery}
            onCheckedChange={(checked) => setFormData({ ...formData, show_proof_gallery: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard
        title="Security & Sessions"
        description="Configure portal security settings"
      >
        <InputRow label="Require Login" description="Clients must log in to access portal">
          <Switch
            checked={formData.require_login}
            onCheckedChange={(checked) => setFormData({ ...formData, require_login: checked })}
          />
        </InputRow>

        <InputRow label="Session Timeout" description="Auto-logout after inactivity">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="5"
              max="120"
              value={formData.session_timeout_minutes}
              onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) || 30 })}
              className="max-w-[120px]"
            />
            <span className="text-muted-foreground">minutes</span>
          </div>
        </InputRow>

        <InputRow label="Email Notifications" description="Send email alerts for portal activity">
          <Switch
            checked={formData.enable_notifications}
            onCheckedChange={(checked) => setFormData({ ...formData, enable_notifications: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard
        title="Portal Preview"
        description="See how your portal looks to clients"
      >
        <ClientPortalPreview
          companyName={company?.name || 'Company Name'}
          logoUrl={company?.logo_url || ''}
          primaryColor={company?.theme_color || '#1e40af'}
          secondaryColor={company?.secondary_color || '#10b981'}
        />
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}
