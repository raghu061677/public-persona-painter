import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Instagram, Facebook, Linkedin, MessageCircle } from "lucide-react";

const KEYS = [
  { key: "social_instagram", label: "Instagram URL", icon: Instagram, placeholder: "https://instagram.com/yourhandle" },
  { key: "social_facebook", label: "Facebook URL", icon: Facebook, placeholder: "https://facebook.com/yourpage" },
  { key: "social_linkedin", label: "LinkedIn URL", icon: Linkedin, placeholder: "https://linkedin.com/company/yourpage" },
  { key: "social_whatsapp_phone", label: "WhatsApp Phone (with country code, digits only)", icon: MessageCircle, placeholder: "919666444888" },
] as const;

export default function SocialLinksSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", KEYS.map((k) => k.key));
      if (error) toast.error("Failed to load settings");
      const map: Record<string, string> = {};
      (data || []).forEach((r) => { map[r.key] = r.value || ""; });
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const rows = KEYS.map((k) => ({ key: k.key, value: values[k.key] ?? "", updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    try { localStorage.removeItem("go-ads:social-links"); } catch {}
    toast.success("Social links updated. Refresh public pages to see changes.");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Media Links</h1>
        <p className="text-muted-foreground mt-1">URLs used in the public footer and floating WhatsApp button.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Public Profiles</CardTitle>
          <CardDescription>Leave blank to hide a channel. WhatsApp phone is just digits — the URL is built automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {KEYS.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" /> {label}
              </Label>
              <Input
                id={key}
                value={values[key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
