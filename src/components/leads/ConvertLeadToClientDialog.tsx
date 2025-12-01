import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { generateClientCode } from "@/lib/codeGenerator";
import { getStateCode } from "@/lib/stateCodeMapping";

interface Lead {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  requirement: string | null;
  source: string;
  client_id: string | null;
  converted_at: string | null;
}

interface ExistingClient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

interface ConvertLeadToClientDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}

export function ConvertLeadToClientDialog({
  lead,
  open,
  onOpenChange,
  onConverted,
}: ConvertLeadToClientDialogProps) {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [conversionType, setConversionType] = useState<"existing" | "new">("new");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientData, setNewClientData] = useState({
    name: "",
    company: "",
    state: "Telangana", // Default state
  });

  useEffect(() => {
    if (open && lead) {
      // Prefill new client data from lead
      setNewClientData({
        name: lead.name || lead.company || "",
        company: lead.company || "",
        state: "Telangana",
      });
      
      // Check for duplicate clients
      checkForDuplicates();
    }
  }, [open, lead]);

  const checkForDuplicates = async () => {
    if (!company?.id || !lead) return;
    
    setCheckingDuplicates(true);
    try {
      const filters = [];
      if (lead.email) filters.push(`email.eq.${lead.email}`);
      if (lead.phone) filters.push(`phone.eq.${lead.phone}`);

      if (filters.length === 0) {
        setExistingClients([]);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company, email, phone, city, state")
        .eq("company_id", company.id)
        .or(filters.join(","));

      if (error) throw error;
      
      setExistingClients(data || []);
      if (data && data.length > 0) {
        setConversionType("existing");
        setSelectedClientId(data[0].id);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleConvert = async () => {
    if (!company?.id) {
      toast.error("Company information not available");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      if (conversionType === "existing") {
        // Link to existing client
        if (!selectedClientId) {
          toast.error("Please select a client");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from("leads")
          .update({
            client_id: selectedClientId,
            converted_at: now,
            assigned_to: user.id,
            status: "won",
          })
          .eq("id", lead.id);

        if (error) throw error;

        toast.success("Lead linked to existing client");
      } else {
        // Create new client
        if (!newClientData.name || !newClientData.state) {
          toast.error("Name and state are required");
          setLoading(false);
          return;
        }

        const stateCode = getStateCode(newClientData.state);
        const clientId = await generateClientCode(stateCode);

        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            id: clientId,
            company_id: company.id,
            name: newClientData.name,
            company: newClientData.company || null,
            email: lead.email || null,
            phone: lead.phone || null,
            state: newClientData.state,
            city: lead.location || null,
            notes: `Converted from lead. Source: ${lead.source}. Requirement: ${lead.requirement || 'N/A'}`,
          })
          .select("*")
          .single();

        if (clientError) throw clientError;

        // Update lead with new client
        const { error: leadError } = await supabase
          .from("leads")
          .update({
            client_id: newClient.id,
            converted_at: now,
            assigned_to: user.id,
            status: "won",
          })
          .eq("id", lead.id);

        if (leadError) throw leadError;

        toast.success(`New client created: ${clientId}`);
      }

      onOpenChange(false);
      onConverted?.();
    } catch (error: any) {
      console.error("Error converting lead:", error);
      toast.error(error.message || "Failed to convert lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            Link this lead to an existing client or create a new one
          </DialogDescription>
        </DialogHeader>

        {/* Lead Details */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-semibold mb-2">Lead Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{lead.name || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Company:</span>{" "}
              <span className="font-medium">{lead.company || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{lead.email || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{lead.phone || "N/A"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Source:</span>{" "}
              <Badge variant="outline">{lead.source}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Duplicate Check Result */}
        {checkingDuplicates ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for existing clients...
          </div>
        ) : existingClients.length > 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Possible duplicate clients found
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {existingClients.length} client(s) with matching email or phone
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  No duplicate clients found
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You can safely create a new client
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Conversion Options */}
        <RadioGroup value={conversionType} onValueChange={(v) => setConversionType(v as "existing" | "new")}>
          {/* Option A: Link to existing */}
          {existingClients.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="text-base font-medium cursor-pointer">
                  Link to Existing Client
                </Label>
              </div>
              {conversionType === "existing" && (
                <div className="ml-6 space-y-2">
                  <RadioGroup value={selectedClientId} onValueChange={setSelectedClientId}>
                    {existingClients.map((client) => (
                      <div key={client.id} className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={client.id} id={client.id} className="mt-1" />
                        <Label htmlFor={client.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.company && <div>{client.company}</div>}
                            {client.email && <div>{client.email}</div>}
                            {client.phone && <div>{client.phone}</div>}
                            <div className="text-xs mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {client.id}
                              </Badge>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Option B: Create new */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="text-base font-medium cursor-pointer">
                Create New Client
              </Label>
            </div>
            {conversionType === "new" && (
              <div className="ml-6 space-y-3">
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={newClientData.company}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input
                    value={newClientData.state}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="State name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Client ID will be generated based on state
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30 text-sm">
                  <p className="text-muted-foreground">
                    Email and phone from the lead will be automatically added to the new client.
                  </p>
                </div>
              </div>
            )}
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
