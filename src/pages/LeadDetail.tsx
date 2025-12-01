import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import {
  UserPlus,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingClient } = useQuery({
    queryKey: ["lead-existing-client", lead?.client_id],
    enabled: !!lead?.client_id,
    queryFn: async () => {
      if (!lead?.client_id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("id", lead.client_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Lead status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const convertToClient = async () => {
    if (!lead) return;

    setConverting(true);
    try {
      // Check for existing clients with same phone/email/GST
      let duplicateCheck: any = null;

      if (lead.phone) {
        const { data } = await supabase
          .from("clients")
          .select("id, name, phone")
          .eq("phone", lead.phone)
          .maybeSingle();
        if (data) duplicateCheck = data;
      }

      if (!duplicateCheck && lead.email) {
        const { data } = await supabase
          .from("clients")
          .select("id, name, email")
          .eq("email", lead.email)
          .maybeSingle();
        if (data) duplicateCheck = data;
      }

      if (!duplicateCheck && lead.metadata && typeof lead.metadata === 'object' && 'gst' in lead.metadata) {
        const gstNumber = (lead.metadata as any).gst;
        if (gstNumber) {
          const { data } = await supabase
            .from("clients")
            .select("id, name, gst_number")
            .eq("gst_number", gstNumber)
            .maybeSingle();
          if (data) duplicateCheck = data;
        }
      }

      if (duplicateCheck) {
        toast.warning(
          `Client already exists: ${duplicateCheck.name}`,
          {
            action: {
              label: "View Client",
              onClick: () => navigate(`/admin/clients/${duplicateCheck.id}`),
            },
          }
        );
        // Still link the lead to this client
        await supabase
          .from("leads")
          .update({
            status: "converted",
            client_id: duplicateCheck.id,
          })
          .eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["lead", id] });
        return;
      }

      // Generate new client ID
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");

      const { data: lastClient } = await supabase
        .from("clients")
        .select("id")
        .like("id", `CLT-${year}${month}-%`)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      let newSequence = 1;
      if (lastClient) {
        const match = lastClient.id.match(/-(\d+)$/);
        if (match) {
          newSequence = parseInt(match[1]) + 1;
        }
      }

      const clientId = `CLT-${year}${month}-${String(newSequence).padStart(
        3,
        "0"
      )}`;

      // Get current user's company_id
      const { data: userData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("status", "active")
        .single();

      if (!userData?.company_id) {
        throw new Error("No active company found for current user");
      }

      // Create client
      const { error: clientError } = await supabase.from("clients").insert([{
        id: clientId,
        company_id: userData.company_id,
        name: lead.name || "Unknown",
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        city: (lead.metadata as any)?.city,
        state: (lead.metadata as any)?.state,
        notes: `Converted from lead ${id}. Requirements: ${lead.requirement || "N/A"}`,
      }]);

      if (clientError) throw clientError;

      // Update lead
      await supabase
        .from("leads")
        .update({ status: "converted", client_id: clientId })
        .eq("id", id);

      toast.success("Lead converted to client successfully!");
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      navigate(`/admin/clients/${clientId}`);
    } catch (error: any) {
      toast.error("Failed to convert lead: " + error.message);
    } finally {
      setConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingState message="Loading lead details..." />
      </div>
    );
  }

  if (!lead) {
    return <div className="container mx-auto p-6">Lead not found</div>;
  }

  const isConverted = lead.status === "converted" && lead.client_id;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Lead Details"
        description={`Source: ${lead.source} · Created ${formatDistanceToNow(
          new Date(lead.created_at),
          { addSuffix: true }
        )}`}
        actions={
          !isConverted && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={converting}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convert to Client
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Convert Lead to Client?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new client record with the lead's
                    information. The system will check for duplicates before
                    creating.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={convertToClient}>
                    Convert
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />

      {/* Status and Conversion Info */}
      {isConverted && existingClient && (
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-500">
                Converted
              </Badge>
              <span className="text-sm">
                Linked to client: <strong>{existingClient.name}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/admin/clients/${lead.client_id}`)
              }
            >
              View Client
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Lead Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Contact Information</h3>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {lead.name || "Not provided"}
                </p>
              </div>
            </div>

            {lead.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{lead.company}</p>
                </div>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium font-mono">{lead.phone}</p>
                </div>
              </div>
            )}

            {lead.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              </div>
            )}

            {lead.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{lead.location}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Requirements</h3>
          <Separator />

          {lead.requirement && (
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium whitespace-pre-wrap">
                  {lead.requirement}
                </p>
              </div>
            </div>
          )}

          {lead.metadata && typeof lead.metadata === 'object' && 'budget' in lead.metadata && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-medium">{(lead.metadata as any).budget}</p>
              </div>
            </div>
          )}

          {lead.metadata && typeof lead.metadata === 'object' && 'timeline' in lead.metadata && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Timeline</p>
                <p className="font-medium">{(lead.metadata as any).timeline}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Raw Message */}
      {lead.raw_message && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Original Message</h3>
          <Separator className="mb-4" />
          <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
            {lead.raw_message}
          </pre>
        </Card>
      )}

      {/* Status Management */}
      {!isConverted && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Update Status</h3>
          <Separator className="mb-4" />
          <div className="flex gap-2">
            <Button
              variant={lead.status === "new" ? "default" : "outline"}
              onClick={() => updateStatusMutation.mutate("new")}
              disabled={updateStatusMutation.isPending}
            >
              New
            </Button>
            <Button
              variant={lead.status === "qualified" ? "default" : "outline"}
              onClick={() => updateStatusMutation.mutate("qualified")}
              disabled={updateStatusMutation.isPending}
            >
              Qualified
            </Button>
            <Button
              variant={lead.status === "closed" ? "default" : "outline"}
              onClick={() => updateStatusMutation.mutate("closed")}
              disabled={updateStatusMutation.isPending}
            >
              Closed
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
