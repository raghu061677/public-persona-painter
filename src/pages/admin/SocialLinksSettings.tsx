import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Row = { key: string; value: string };

const FIELDS: { key: string; label: string; placeholder: string; help?: string }[] = [
  { key: "social_instagram", label: "Instagram URL", placeholder: "https://instagram.com/goads360" },
  { key: "social_facebook", label: "Facebook URL", placeholder: "https://facebook.com/goads360" },
  { key: "social_linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/goads360" },
  { key: "social_whatsapp_phone", label: "WhatsApp Phone (with country code, digits only)", placeholder: "919666444888" },
  { key: "social_whatsapp_message", label: "Default WhatsApp Message", placeholder: "Hi Go-Ads team", help: "Prefilled text shown when users click the WhatsApp button." },
];

export default function SocialLinksSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", FIELDS.map((f) => f.key));
      const next: Record<string, string> = {};
      (data as Row[] | null)?.forEach((r) => (next[r.key] = r.value ?? ""));
      setValues(next);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const rows = FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Social links updated. Footer and floating button refresh automatically." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Social Links & WhatsApp</CardTitle>
          <CardDescription>
            Update the social handles and WhatsApp message used across the public site. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            </div>
          ))}
          <div className="pt-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}