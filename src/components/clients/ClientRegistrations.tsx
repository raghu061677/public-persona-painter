import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Star, StarOff, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { INDIAN_STATE_CODES } from "@/lib/stateCodeMapping";

interface Registration {
  id: string;
  client_id: string;
  company_id: string;
  label: string;
  registration_type: string;
  gstin: string | null;
  legal_name: string | null;
  trade_name: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_district: string | null;
  billing_state: string | null;
  billing_state_code: string | null;
  billing_pincode: string | null;
  billing_country: string;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  shipping_state: string | null;
  shipping_state_code: string | null;
  shipping_pincode: string | null;
  shipping_country: string;
  place_of_supply_state: string | null;
  place_of_supply_state_code: string | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM: Partial<Registration> = {
  label: "",
  registration_type: "gst",
  gstin: "",
  legal_name: "",
  trade_name: "",
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_district: "",
  billing_state: "",
  billing_state_code: "",
  billing_pincode: "",
  billing_country: "India",
  shipping_address_line1: "",
  shipping_address_line2: "",
  shipping_city: "",
  shipping_district: "",
  shipping_state: "",
  shipping_state_code: "",
  shipping_pincode: "",
  shipping_country: "India",
  place_of_supply_state: "",
  place_of_supply_state_code: "",
  is_default: false,
  is_active: true,
  notes: "",
};

const STATES = Object.keys(INDIAN_STATE_CODES).sort();

interface Props {
  clientId: string;
  companyId: string;
  canEdit?: boolean;
}

export function ClientRegistrations({ clientId, companyId, canEdit = true }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Registration>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [clientId]);

  const fetchRegistrations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_registrations")
      .select("*")
      .eq("client_id", clientId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load registrations");
    } else {
      // Map DB column 'state_code' to local form field 'billing_state_code'
      const mapped = (data as any[] || []).map((r: any) => ({
        ...r,
        billing_state_code: r.state_code ?? r.billing_state_code ?? null,
      }));
      setRegistrations(mapped);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, is_default: registrations.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (reg: Registration) => {
    setEditingId(reg.id);
    setForm({ ...reg });
    setDialogOpen(true);
  };

  const handleStateChange = (field: "billing_state" | "shipping_state" | "place_of_supply_state", value: string) => {
    const codeField = field === "billing_state" ? "billing_state_code" 
      : field === "shipping_state" ? "shipping_state_code" 
      : "place_of_supply_state_code";
    setForm(prev => ({
      ...prev,
      [field]: value,
      [codeField]: INDIAN_STATE_CODES[value] || "",
    }));
  };

  const handleSave = async () => {
    if (!form.label?.trim()) {
      toast.error("Label is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        company_id: companyId,
        label: form.label!.trim(),
        registration_type: form.registration_type || "gst",
        gstin: form.gstin?.trim() || null,
        legal_name: form.legal_name?.trim() || null,
        trade_name: form.trade_name?.trim() || null,
        billing_address_line1: form.billing_address_line1?.trim() || null,
        billing_address_line2: form.billing_address_line2?.trim() || null,
        billing_city: form.billing_city?.trim() || null,
        billing_district: form.billing_district?.trim() || null,
        billing_state: form.billing_state || null,
        state_code: form.billing_state_code || null,
        billing_pincode: form.billing_pincode?.trim() || null,
        billing_country: form.billing_country || "India",
        shipping_address_line1: form.shipping_address_line1?.trim() || null,
        shipping_address_line2: form.shipping_address_line2?.trim() || null,
        shipping_city: form.shipping_city?.trim() || null,
        shipping_district: form.shipping_district?.trim() || null,
        shipping_state: form.shipping_state || null,
        shipping_pincode: form.shipping_pincode?.trim() || null,
        shipping_country: form.shipping_country || "India",
        place_of_supply_state: form.place_of_supply_state || null,
        place_of_supply_state_code: form.place_of_supply_state_code || null,
        is_default: form.is_default ?? false,
        is_active: form.is_active ?? true,
        notes: form.notes?.trim() || null,
      };

      // If setting as default, unset existing default first
      if (payload.is_default) {
        await supabase
          .from("client_registrations")
          .update({ is_default: false } as any)
          .eq("client_id", clientId)
          .eq("is_default", true);
      }

      if (editingId) {
        const { error } = await supabase
          .from("client_registrations")
          .update(payload as any)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Registration updated");
      } else {
        const { error } = await supabase
          .from("client_registrations")
          .insert(payload as any);
        if (error) throw error;
        toast.success("Registration added");
      }

      setDialogOpen(false);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to save registration");
    } finally {
      setSaving(false);
    }
  };

  const toggleDefault = async (reg: Registration) => {
    try {
      // Unset all defaults for this client
      await supabase
        .from("client_registrations")
        .update({ is_default: false } as any)
        .eq("client_id", clientId);

      // Set this one as default
      await supabase
        .from("client_registrations")
        .update({ is_default: true } as any)
        .eq("id", reg.id);

      toast.success(`"${reg.label}" set as default`);
      fetchRegistrations();
    } catch {
      toast.error("Failed to update default");
    }
  };

  const toggleActive = async (reg: Registration) => {
    try {
      await supabase
        .from("client_registrations")
        .update({ is_active: !reg.is_active } as any)
        .eq("id", reg.id);

      toast.success(reg.is_active ? "Registration deactivated" : "Registration activated");
      fetchRegistrations();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">GST Registrations / Addresses</CardTitle>
          <CardDescription>Manage multiple GST registrations and billing addresses for this client</CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Registration
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No registrations found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Billing State</TableHead>
                <TableHead>Shipping State</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id} className={!reg.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{reg.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {reg.registration_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{reg.gstin || "—"}</TableCell>
                  <TableCell>{reg.billing_state || "—"}</TableCell>
                  <TableCell>{reg.shipping_state || "—"}</TableCell>
                  <TableCell>
                    {reg.is_default ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20">Default</Badge>
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => toggleDefault(reg)} title="Set as default">
                        <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reg.is_active ? "default" : "secondary"}>
                      {reg.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(reg)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(reg)} title={reg.is_active ? "Deactivate" : "Activate"}>
                        {reg.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Registration" : "Add Registration"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update GST registration details" : "Add a new GST registration / billing address"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={form.label || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. Head Office, AP Branch"
                />
              </div>
              <div className="space-y-2">
                <Label>Registration Type</Label>
                <Select
                  value={form.registration_type || "gst"}
                  onValueChange={(v) => setForm(prev => ({ ...prev, registration_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gst">GST Registered</SelectItem>
                    <SelectItem value="sez">SEZ</SelectItem>
                    <SelectItem value="unregistered">Unregistered</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 36AABCV8928J1ZR"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label>Legal Name</Label>
                <Input
                  value={form.legal_name || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, legal_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trade Name</Label>
              <Input
                value={form.trade_name || ""}
                onChange={(e) => setForm(prev => ({ ...prev, trade_name: e.target.value }))}
              />
            </div>

            {/* Billing Address */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Billing Address</h4>
              <div className="grid gap-3">
                <Input
                  value={form.billing_address_line1 || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, billing_address_line1: e.target.value }))}
                  placeholder="Address Line 1"
                />
                <Input
                  value={form.billing_address_line2 || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, billing_address_line2: e.target.value }))}
                  placeholder="Address Line 2"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    value={form.billing_city || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, billing_city: e.target.value }))}
                    placeholder="City"
                  />
                  <Input
                    value={form.billing_district || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, billing_district: e.target.value }))}
                    placeholder="District"
                  />
                  <Input
                    value={form.billing_pincode || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, billing_pincode: e.target.value }))}
                    placeholder="Pincode"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Select
                      value={form.billing_state || ""}
                      onValueChange={(v) => handleStateChange("billing_state", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {STATES.map(s => (
                          <SelectItem key={s} value={s}>{s} ({INDIAN_STATE_CODES[s]})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State Code</Label>
                    <Input value={form.billing_state_code || ""} readOnly className="bg-muted" />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Shipping Address</h4>
              <div className="grid gap-3">
                <Input
                  value={form.shipping_address_line1 || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                  placeholder="Address Line 1"
                />
                <Input
                  value={form.shipping_address_line2 || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                  placeholder="Address Line 2"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    value={form.shipping_city || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                    placeholder="City"
                  />
                  <Input
                    value={form.shipping_district || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping_district: e.target.value }))}
                    placeholder="District"
                  />
                  <Input
                    value={form.shipping_pincode || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, shipping_pincode: e.target.value }))}
                    placeholder="Pincode"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Select
                      value={form.shipping_state || ""}
                      onValueChange={(v) => handleStateChange("shipping_state", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {STATES.map(s => (
                          <SelectItem key={s} value={s}>{s} ({INDIAN_STATE_CODES[s]})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State Code</Label>
                    <Input value={form.shipping_state_code || ""} readOnly className="bg-muted" />
                  </div>
                </div>
              </div>
            </div>

            {/* Place of Supply */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Place of Supply</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Select
                    value={form.place_of_supply_state || ""}
                    onValueChange={(v) => handleStateChange("place_of_supply_state", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => (
                        <SelectItem key={s} value={s}>{s} ({INDIAN_STATE_CODES[s]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State Code</Label>
                  <Input value={form.place_of_supply_state_code || ""} readOnly className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="border-t pt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_default ?? false}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, is_default: v }))}
                />
                <Label>Default Registration</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
