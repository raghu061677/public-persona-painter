import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mail, Phone, Loader2, Pencil, Check, X, Star } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type ClientContact = Database['public']['Tables']['client_contacts']['Row'];

interface ContactFormData {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  work_phone: string;
  mobile: string;
  designation: string;
}

interface ClientContactsManagerProps {
  clientId: string;
  canSeeSensitive?: boolean;
  isOwner?: boolean;
}

export function ClientContactsManager({ clientId, canSeeSensitive = true, isOwner = true }: ClientContactsManagerProps) {
  const { company } = useCompany();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContactFormData>({
    salutation: "Mr.",
    first_name: "",
    last_name: "",
    email: "",
    work_phone: "",
    mobile: "",
    designation: "",
  });
  const [newContact, setNewContact] = useState<ContactFormData>({
    salutation: "Mr.",
    first_name: "",
    last_name: "",
    email: "",
    work_phone: "",
    mobile: "",
    designation: "",
  });

  useEffect(() => {
    loadContacts();
  }, [clientId]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.first_name && !newContact.last_name) {
      toast.error("Please enter at least a name");
      return;
    }

    if (!company?.id) {
      toast.error("Company information not available");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("client_contacts")
        .insert({
          client_id: clientId,
          company_id: company.id,
          salutation: newContact.salutation,
          first_name: newContact.first_name,
          last_name: newContact.last_name,
          name: [newContact.first_name, newContact.last_name].filter(Boolean).join(' '),
          email: newContact.email || null,
          work_phone: newContact.work_phone || null,
          mobile: newContact.mobile || null,
          phone: newContact.mobile || newContact.work_phone || null,
          designation: newContact.designation || null,
          is_primary: contacts.length === 0,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Contact added successfully");
      setNewContact({
        salutation: "Mr.",
        first_name: "",
        last_name: "",
        email: "",
        work_phone: "",
        mobile: "",
        designation: "",
      });
      loadContacts();
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(error.message || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (contact: ClientContact) => {
    setEditingId(contact.id);
    setEditForm({
      salutation: contact.salutation || "Mr.",
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      work_phone: contact.work_phone || "",
      mobile: contact.mobile || "",
      designation: contact.designation || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (contactId: string) => {
    if (!editForm.first_name && !editForm.last_name) {
      toast.error("Please enter at least a name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("client_contacts")
        .update({
          salutation: editForm.salutation,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          name: [editForm.first_name, editForm.last_name].filter(Boolean).join(' '),
          email: editForm.email || null,
          work_phone: editForm.work_phone || null,
          mobile: editForm.mobile || null,
          phone: editForm.mobile || editForm.work_phone || null,
          designation: editForm.designation || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contactId);

      if (error) throw error;

      toast.success("Contact updated successfully");
      setEditingId(null);
      loadContacts();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error(error.message || "Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const { error } = await supabase
        .from("client_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast.success("Contact deleted");
      loadContacts();
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(error.message || "Failed to delete contact");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isContactOwner = (contact: ClientContact) => {
    return contact.created_by === currentUserId;
  };

  const canEditContact = (contact: ClientContact) => {
    return canSeeSensitive || isContactOwner(contact);
  };

  return (
    <div className="space-y-4">
      {/* Existing Contacts */}
      {contacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Existing Contacts</h3>
          {contacts.map((contact) => {
            const canSeeContactDetails = canSeeSensitive || isContactOwner(contact);
            const isEditing = editingId === contact.id;

            if (isEditing) {
              return (
                <Card key={contact.id} className="p-4 border-primary/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Editing Contact</h4>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(contact.id)} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Salutation</Label>
                        <Select value={editForm.salutation} onValueChange={(v) => setEditForm(p => ({ ...p, salutation: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mr.">Mr.</SelectItem>
                            <SelectItem value="Ms.">Ms.</SelectItem>
                            <SelectItem value="Mrs.">Mrs.</SelectItem>
                            <SelectItem value="Dr.">Dr.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">First Name *</Label>
                          <Input value={editForm.first_name} onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))} className="h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Last Name</Label>
                          <Input value={editForm.last_name} onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))} className="h-9" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Mobile</Label>
                        <Input value={editForm.mobile} onChange={(e) => setEditForm(p => ({ ...p, mobile: e.target.value }))} className="h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Work Phone</Label>
                        <Input value={editForm.work_phone} onChange={(e) => setEditForm(p => ({ ...p, work_phone: e.target.value }))} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Designation</Label>
                        <Input value={editForm.designation} onChange={(e) => setEditForm(p => ({ ...p, designation: e.target.value }))} className="h-9" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            return (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {contact.salutation} {contact.first_name} {contact.last_name}
                      </h4>
                      {contact.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      {isContactOwner(contact) && !canSeeSensitive && (
                        <Badge variant="outline" className="text-xs">Your Contact</Badge>
                      )}
                    </div>
                    {canSeeContactDetails && contact.designation && (
                      <p className="text-sm text-muted-foreground">{contact.designation}</p>
                    )}
                    <div className="space-y-1">
                      {canSeeContactDetails ? (
                        <>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.mobile && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{contact.mobile}</span>
                            </div>
                          )}
                          {contact.work_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{contact.work_phone} (Work)</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Contact details restricted</p>
                      )}
                    </div>
                  </div>
                  {canEditContact(contact) && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEditing(contact)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add New Contact Form */}
      <Card className="p-4 bg-muted/30">
        <h3 className="text-sm font-medium mb-4">Add New Contact</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Salutation</Label>
              <Select
                value={newContact.salutation}
                onValueChange={(value) =>
                  setNewContact((prev) => ({ ...prev, salutation: value }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First Name *</Label>
                <Input
                  value={newContact.first_name}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                  placeholder="First name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input
                  value={newContact.last_name}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                  placeholder="Last name"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@example.com"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mobile</Label>
              <Input
                value={newContact.mobile}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, mobile: e.target.value }))
                }
                placeholder="10 digit number"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Work Phone</Label>
              <Input
                value={newContact.work_phone}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, work_phone: e.target.value }))
                }
                placeholder="Work phone"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Designation</Label>
              <Input
                value={newContact.designation}
                onChange={(e) =>
                  setNewContact((prev) => ({ ...prev, designation: e.target.value }))
                }
                placeholder="e.g., Manager"
                className="h-9"
              />
            </div>
          </div>

          <Button
            onClick={handleAddContact}
            disabled={saving}
            size="sm"
            className="w-full"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Contact Person
          </Button>
        </div>
      </Card>
    </div>
  );
}
