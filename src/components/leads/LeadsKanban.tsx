import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  source: string;
  status: string;
  requirement: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500" },
  { value: "proposal", label: "Proposal Sent", color: "bg-orange-500" },
  { value: "won", label: "Won", color: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
];

export function LeadsKanban() {
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();

    const channel = supabase
      .channel("leads_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          loadLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const grouped = STATUSES.reduce((acc, status) => {
        acc[status.value] = data?.filter((lead) => lead.status === status.value) || [];
        return acc;
      }, {} as Record<string, Lead[]>);

      setLeadsByStatus(grouped);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead status updated",
      });
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      whatsapp: "bg-green-500",
      email: "bg-blue-500",
      web: "bg-purple-500",
      referral: "bg-orange-500",
      manual: "bg-gray-500",
    };
    return colors[source] || "bg-gray-500";
  };

  if (loading) {
    return <div className="text-center py-8">Loading leads...</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUSES.map((status) => (
        <div key={status.value} className="flex-shrink-0 w-80">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  {status.label}
                </CardTitle>
                <Badge variant="secondary">
                  {leadsByStatus[status.value]?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {leadsByStatus[status.value]?.map((lead) => (
                <Card key={lead.id} className="p-4 space-y-3 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{lead.name}</h4>
                      <Badge className={getSourceBadge(lead.source)}>
                        {lead.source}
                      </Badge>
                    </div>
                    {lead.company && (
                      <p className="text-sm text-muted-foreground">{lead.company}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{lead.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(lead.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>

                  {lead.requirement && (
                    <p className="text-sm line-clamp-2 text-muted-foreground">
                      {lead.requirement}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View
                    </Button>
                    <select
                      className="text-sm border rounded px-2 flex-1"
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>
              ))}

              {leadsByStatus[status.value]?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No leads in this stage
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
