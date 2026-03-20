import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, AlertTriangle, UserPlus, Eye, Merge, PlusCircle } from "lucide-react";
import { generateClientCode } from "@/lib/codeGenerator";
import { getStateCode } from "@/lib/stateCodeMapping";
import { type MatchResult, getMergeAction } from "@/lib/leadClientMatching";
import { useNavigate } from "react-router-dom";
import { leadSchema } from "@/lib/validation/schemas";

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
  metadata?: Record<string, any> | null;
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [step, setStep] = useState<'checking' | 'auto_merge' | 'review' | 'no_match'>('checking');
  const [newClientData, setNewClientData] = useState({
    name: "",
    company: "",
    state: "Telangana",
  });

  useEffect(() => {
    if (open && lead) {
      setNewClientData({
        name: lead.name || lead.company || "",
        company: lead.company || "",
        state: "Telangana",
      });
      setMatches([]);
      setStep('checking');
      runMatchCheck();
    }
  }, [open, lead]);

  const runMatchCheck = async () => {
    if (!company?.id || !lead) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('lead-client-match', {
        body: {
          action: 'check_match',
          lead: {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            location: lead.location,
            metadata: lead.metadata,
          },
        },
      });

      if (error) throw error;

      const foundMatches = (data?.matches || []) as MatchResult[];
      setMatches(foundMatches);

      if (foundMatches.length > 0) {
        const best = foundMatches[0];
        const action = getMergeAction(best.confidence);
        setStep(action === 'auto_merge' ? 'auto_merge' : action === 'needs_review' ? 'review' : 'no_match');
      } else {
        setStep('no_match');
      }
    } catch (err: any) {
      console.error('Match check failed:', err);
      toast.error('Match check failed, proceeding with manual flow');
      setStep('no_match');
    } finally {
      setChecking(false);
    }
  };

  const handleMerge = async (clientId: string, confidence: number, reason: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('lead-client-match', {
        body: {
          action: 'execute_merge',
          lead_id: lead.id,
          client_id: clientId,
          merge_reason: reason,
          confidence,
        },
      });
      if (error) throw error;
      toast.success('Lead merged into existing client successfully');
      onOpenChange(false);
      onConverted?.();
    } catch (err: any) {
      toast.error(err.message || 'Merge failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToReview = async (match: MatchResult) => {
    setLoading(true);
    try {
      await supabase.from('leads').update({
        matched_client_id: match.clientId,
        merge_status: 'needs_review',
        merge_confidence: match.confidence,
        merge_reason: match.reason,
      } as any).eq('id', lead.id);

      toast.success('Lead sent to merge review queue');
      onOpenChange(false);
      onConverted?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit for review');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!company?.id) {
      toast.error("Company information not available");
      return;
    }
    if (!newClientData.name || !newClientData.state) {
      toast.error("Name and state are required");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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
          created_by: user.id,
        })
        .select("*")
        .single();

      if (clientError) throw clientError;

      await supabase.from("leads").update({
        client_id: newClient.id,
        converted_at: new Date().toISOString(),
        assigned_to: user.id,
        status: "won",
        merge_status: 'new_client_created',
      } as any).eq("id", lead.id);

      // Add contact person
      if (lead.phone || lead.email) {
        await supabase.from('client_contacts').insert({
          client_id: newClient.id,
          company_id: company.id,
          name: lead.name || 'Primary Contact',
          phone: lead.phone,
          mobile: lead.phone,
          email: lead.email,
          is_primary: true,
          created_by: user.id,
        });
      }

      toast.success(`New client created: ${clientId}`);
      onOpenChange(false);
      onConverted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge className="bg-red-500 text-white">Auto Merge ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge className="bg-yellow-500 text-white">Review ({confidence}%)</Badge>;
    return <Badge variant="secondary">Low ({confidence}%)</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      gst_match: 'GST Number Match',
      email_match: 'Email Match',
      phone_match: 'Phone Match',
      company_name_match: 'Company Name Match',
      name_city_match: 'Name + City Match',
      domain_match: 'Email Domain + City Match',
      address_match: 'Address Similarity',
    };
    return labels[reason] || reason;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            Smart duplicate detection will match this lead against existing clients
          </DialogDescription>
        </DialogHeader>

        {/* Lead Info */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-semibold mb-2">Lead Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{lead.name || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{lead.company || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{lead.email || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{lead.phone || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{lead.location || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Source:</span> <Badge variant="outline">{lead.source}</Badge></div>
          </div>
        </div>

        <Separator />

        {/* Checking state */}
        {checking && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Running duplicate detection...</p>
          </div>
        )}

        {/* Auto-merge suggestion */}
        {!checking && step === 'auto_merge' && matches.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Exact Match Found</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This lead matches an existing client with high confidence. We recommend merging.
                  </p>
                </div>
              </div>
              <MatchCard match={matches[0]} getConfidenceBadge={getConfidenceBadge} getReasonLabel={getReasonLabel} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleMerge(matches[0].clientId, matches[0].confidence, matches[0].reason)} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Merge className="mr-2 h-4 w-4" /> Merge to Existing Client
              </Button>
              <Button variant="outline" onClick={() => navigate(`/admin/clients/${matches[0].clientId}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Existing Client
              </Button>
              <Button variant="ghost" onClick={() => setStep('no_match')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Anyway
              </Button>
            </div>
          </div>
        )}

        {/* Review suggestion */}
        {!checking && step === 'review' && matches.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">Possible Match Found</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This lead might match an existing client. Please review.
                  </p>
                </div>
              </div>
              {matches.slice(0, 3).map((match) => (
                <MatchCard key={match.clientId} match={match} getConfidenceBadge={getConfidenceBadge} getReasonLabel={getReasonLabel} />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleSendToReview(matches[0])} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send to Review Queue
              </Button>
              <Button onClick={() => handleMerge(matches[0].clientId, matches[0].confidence, matches[0].reason)} disabled={loading}>
                <Merge className="mr-2 h-4 w-4" /> Merge Anyway
              </Button>
              <Button variant="ghost" onClick={() => setStep('no_match')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Client
              </Button>
            </div>
          </div>
        )}

        {/* No match — create new */}
        {!checking && step === 'no_match' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">No Duplicate Found</p>
                  <p className="text-sm text-green-700 dark:text-green-300">You can safely create a new client</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  value={newClientData.name}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={newClientData.company}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={newClientData.state}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State name"
                />
              </div>
            </div>
          </div>
        )}

        {!checking && step === 'no_match' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreateNew} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create New Client
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MatchCard({ match, getConfidenceBadge, getReasonLabel }: {
  match: MatchResult;
  getConfidenceBadge: (c: number) => React.ReactNode;
  getReasonLabel: (r: string) => string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{match.clientName}</span>
        {getConfidenceBadge(match.confidence)}
      </div>
      <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
        {match.company && <div>Company: {match.company}</div>}
        {match.gstNumber && <div>GST: {match.gstNumber}</div>}
        {match.email && <div>Email: {match.email}</div>}
        {match.phone && <div>Phone: {match.phone}</div>}
        {match.city && <div>City: {match.city}</div>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={match.confidence} className="flex-1 h-2" />
        <Badge variant="outline" className="text-xs">{getReasonLabel(match.reason)}</Badge>
      </div>
    </div>
  );
}
