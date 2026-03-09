import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, UserPlus, Merge, Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LeadMergeReview() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: reviewLeads, isLoading } = useQuery({
    queryKey: ["lead-merge-review", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("company_id", company.id)
        .eq("merge_status", "needs_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const handleDecision = async (leadId: string, decision: string, clientId: string | null) => {
    setProcessingId(leadId);
    try {
      const { error } = await supabase.functions.invoke('lead-client-match', {
        body: { action: 'submit_review', lead_id: leadId, decision, client_id: clientId },
      });
      if (error) throw error;
      toast.success(decision === 'approve_merge' ? 'Lead merged successfully' : 'Decision recorded');
      queryClient.invalidateQueries({ queryKey: ["lead-merge-review"] });
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getReasonLabel = (reason: string | null) => {
    const labels: Record<string, string> = {
      gst_match: 'GST Match',
      email_match: 'Email Match',
      phone_match: 'Phone Match',
      company_name_match: 'Company Name',
      name_city_match: 'Name + City',
      domain_match: 'Domain + City',
      address_match: 'Address',
    };
    return labels[reason || ''] || reason || 'Unknown';
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Merge Review"
        description="Review and approve lead-to-client merge suggestions"
      />

      {(!reviewLeads || reviewLeads.length === 0) ? (
        <EmptyState
          icon={CheckCircle}
          title="All Clear"
          description="No leads pending merge review"
        />
      ) : (
        <div className="space-y-4">
          {reviewLeads.map((lead: any) => (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{lead.name || 'Unknown'}</span>
                    <Badge variant="outline">{lead.source}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    {lead.company && <div>Company: {lead.company}</div>}
                    {lead.email && <div>Email: {lead.email}</div>}
                    {lead.phone && <div>Phone: {lead.phone}</div>}
                    {lead.location && <div>Location: {lead.location}</div>}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Suggested match: <span className="font-medium text-foreground">{lead.matched_client_id}</span>
                    </span>
                    <Badge className={lead.merge_confidence >= 80 ? 'bg-yellow-500' : 'bg-orange-500'}>
                      {lead.merge_confidence}% confidence
                    </Badge>
                    <Badge variant="outline">{getReasonLabel(lead.merge_reason)}</Badge>
                  </div>
                  {lead.merge_confidence && (
                    <Progress value={lead.merge_confidence} className="h-2 max-w-xs" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDecision(lead.id, 'approve_merge', lead.matched_client_id)}
                    disabled={processingId === lead.id}
                  >
                    {processingId === lead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Merge className="mr-1 h-3 w-3" />}
                    Approve Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDecision(lead.id, 'reject', null)}
                    disabled={processingId === lead.id}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecision(lead.id, 'create_new', null)}
                    disabled={processingId === lead.id}
                  >
                    <UserPlus className="mr-1 h-3 w-3" /> Create New
                  </Button>
                  {lead.matched_client_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/admin/clients/${lead.matched_client_id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> View Client
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
