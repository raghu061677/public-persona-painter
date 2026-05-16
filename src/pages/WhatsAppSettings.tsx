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
import { Copy, Loader2, Plus, Trash2, FlaskConical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

type Rule = {
  id?: string;
  name: string;
  template_kind: "proposal" | "proof" | "payment" | "custom";
  keywords: string[];
  media_type: string | null;
  min_budget: number | null;
  max_budget: number | null;
  body: string;
  priority: number;
  enabled: boolean;
};

const emptyRule = (): Rule => ({
  name: "New rule",
  template_kind: "custom",
  keywords: [],
  media_type: null,
  min_budget: null,
  max_budget: null,
  body: "",
  priority: 100,
  enabled: true,
});

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
  const [rules, setRules] = useState<Rule[]>([]);
  const [testPhone, setTestPhone] = useState("919999000001");
  const [testName, setTestName] = useState("Test Lead");
  const [testText, setTestText] = useState(
    "Hi, I need a hoarding in Hyderabad for 2 weeks. Budget around 50000.",
  );
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: r }] = await Promise.all([
        supabase
        .from("whatsapp_settings")
        .select("*")
        .is("company_id", null)
        .maybeSingle(),
        supabase
          .from("whatsapp_auto_reply_rules" as any)
          .select("*")
          .is("company_id", null)
          .order("priority", { ascending: true }),
      ]);
      if (data) setS({ ...s, ...data });
      if (r) setRules(r as any);
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_settings")
      .upsert({ company_id: null as any, ...s });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("WhatsApp settings saved");
  };

  const saveRule = async (rule: Rule, idx: number) => {
    const payload = { ...rule, company_id: null as any };
    const { data, error } = await supabase
      .from("whatsapp_auto_reply_rules" as any)
      .upsert(payload)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    const next = [...rules];
    next[idx] = data as any;
    setRules(next);
    toast.success("Rule saved");
  };

  const deleteRule = async (rule: Rule, idx: number) => {
    if (rule.id) {
      const { error } = await supabase
        .from("whatsapp_auto_reply_rules" as any)
        .delete()
        .eq("id", rule.id);
      if (error) return toast.error(error.message);
    }
    setRules(rules.filter((_, i) => i !== idx));
    toast.success("Rule deleted");
  };

  const updateRule = (idx: number, patch: Partial<Rule>) => {
    const next = [...rules];
    next[idx] = { ...next[idx], ...patch };
    setRules(next);
  };

  const runTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    const waId = `wamid.TEST_${Date.now()}`;
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "TEST_ENTRY",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "919999999999", phone_number_id: "TEST" },
                contacts: [{ profile: { name: testName }, wa_id: testPhone }],
                messages: [
                  {
                    from: testPhone,
                    id: waId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: testText },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    try {
      const res = await fetch(`${WEBHOOK_URL}?test=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setTestResult(json);
      if (json?.debug?.created_leads?.length) {
        toast.success(`Lead created: ${json.debug.created_leads[0]}`);
      } else if (json?.debug?.log_ids?.length) {
        toast.success("Message logged on existing lead");
      } else {
        toast.info("Webhook accepted payload");
      }
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    } finally {
      setTestRunning(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copied");
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-reply rules</Label>
              <p className="text-xs text-muted-foreground">
                Evaluated by priority (low number first). The first matching enabled rule wins
                and overrides the default auto-reply text.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRules([...rules, emptyRule()])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add rule
            </Button>
          </div>

          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No rules yet. The default auto-reply text above will be used.
            </p>
          )}

          {rules.map((r, idx) => (
            <div key={r.id ?? idx} className="border rounded-md p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={r.name} onChange={(e) => updateRule(idx, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Template kind</Label>
                  <Select
                    value={r.template_kind}
                    onValueChange={(v: any) => updateRule(idx, { template_kind: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="proof">Proof</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={r.priority}
                    onChange={(e) => updateRule(idx, { priority: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    value={r.keywords.join(", ")}
                    placeholder="hoarding, billboard, kukatpally"
                    onChange={(e) =>
                      updateRule(idx, {
                        keywords: e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Media type</Label>
                  <Input
                    value={r.media_type ?? ""}
                    placeholder="any"
                    onChange={(e) =>
                      updateRule(idx, { media_type: e.target.value.trim() || null })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Min ₹</Label>
                    <Input
                      type="number"
                      value={r.min_budget ?? ""}
                      onChange={(e) =>
                        updateRule(idx, {
                          min_budget: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Max ₹</Label>
                    <Input
                      type="number"
                      value={r.max_budget ?? ""}
                      onChange={(e) =>
                        updateRule(idx, {
                          max_budget: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Reply body</Label>
                <Textarea
                  rows={2}
                  value={r.body}
                  onChange={(e) => updateRule(idx, { body: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => updateRule(idx, { enabled: v })}
                  />
                  <span className="text-sm">Enabled</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(r, idx)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <Button size="sm" onClick={() => saveRule(r, idx)}>
                    Save rule
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <Label className="text-base">Test mode — simulate inbound WhatsApp message</Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Posts a synthetic Meta webhook payload to the live function with{" "}
            <code>?test=1</code>. The lead and log rows are created, but no message is sent to
            Meta. Use to verify rule matching and lead creation end-to-end.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>From (phone, with country code, no +)</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            </div>
            <div>
              <Label>Contact name</Label>
              <Input value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Message body</Label>
            <Textarea rows={3} value={testText} onChange={(e) => setTestText(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={runTest} disabled={testRunning}>
              {testRunning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send test payload
            </Button>
          </div>
          {testResult && (
            <pre className="text-xs bg-background border rounded-md p-3 overflow-auto max-h-72">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}