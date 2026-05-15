import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({
    auto_reply_enabled: true,
    auto_reply_text: "",
    proposal_template: "",
    proof_template: "",
    payment_template: "",
    phone_number_id: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .is("company_id", null)
        .maybeSingle();
      if (data) setS({ ...s, ...data });
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_settings")
      .upsert({ company_id: null as any, ...s }, { onConflict: "company_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("WhatsApp settings saved");
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copied");
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl">
      <PageHeader
        title="WhatsApp Settings"
        description="Configure auto-reply behaviour and message templates for WhatsApp Cloud API."
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Webhook Callback URL</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paste this into the Meta WhatsApp Cloud API webhook configuration. The
              verify token must match the <code>WHATSAPP_VERIFY_TOKEN</code> secret.
            </p>
          </div>

          <div>
            <Label htmlFor="phone_number_id">Phone Number ID (display only)</Label>
            <Input
              id="phone_number_id"
              value={s.phone_number_id || ""}
              onChange={(e) => setS({ ...s, phone_number_id: e.target.value })}
              placeholder="e.g. 123456789012345"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for reference. The actual ID for sending lives in
              <code className="ml-1">WHATSAPP_PHONE_NUMBER_ID</code> secret.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto reply for new leads</Label>
              <p className="text-xs text-muted-foreground">
                Sends once when a new lead first messages, or after 24h inactivity.
              </p>
            </div>
            <Switch
              checked={s.auto_reply_enabled}
              onCheckedChange={(v) => setS({ ...s, auto_reply_enabled: v })}
            />
          </div>
          <div>
            <Label>Auto reply text</Label>
            <Textarea
              rows={3}
              value={s.auto_reply_text || ""}
              onChange={(e) => setS({ ...s, auto_reply_text: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Label className="text-base">Message templates</Label>
          <p className="text-xs text-muted-foreground -mt-2">
            Variables: <code>{"{{name}}"}</code>, <code>{"{{campaign}}"}</code>,
            <code>{"{{link}}"}</code>, <code>{"{{invoice_no}}"}</code>,
            <code>{"{{amount}}"}</code>
          </p>
          <div>
            <Label>Proposal</Label>
            <Textarea
              rows={2}
              value={s.proposal_template || ""}
              onChange={(e) => setS({ ...s, proposal_template: e.target.value })}
            />
          </div>
          <div>
            <Label>Campaign proof</Label>
            <Textarea
              rows={2}
              value={s.proof_template || ""}
              onChange={(e) => setS({ ...s, proof_template: e.target.value })}
            />
          </div>
          <div>
            <Label>Payment reminder</Label>
            <Textarea
              rows={2}
              value={s.payment_template || ""}
              onChange={(e) => setS({ ...s, payment_template: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}