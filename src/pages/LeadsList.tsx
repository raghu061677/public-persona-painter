import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, UserPlus, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ConvertLeadToClientDialog } from "@/components/leads/ConvertLeadToClientDialog";

interface Lead {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  source: string;
  status: string;
  requirement: string | null;
  raw_message: string | null;
  created_at: string;
  client_id: string | null;
  converted_at: string | null;
}

export default function LeadsList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.company?.toLowerCase().includes(search) ||
      lead.phone?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.raw_message?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      qualified: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      converted: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      closed: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    };
    return variants[status] || variants.new;
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      whatsapp: "💬",
      email: "📧",
      webform: "🌐",
      manual: "📝",
    };
    return icons[source] || "📋";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader
          title="Leads"
          description="Manage incoming leads and convert them to clients"
        />
        <LoadingState message="Loading leads..." />
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader
          title="Leads"
          description="Manage incoming leads and convert them to clients"
          actions={
            <Button onClick={() => navigate("/admin/leads/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          }
        />
        <EmptyState
          icon={Search}
          title="No leads yet"
          description="Start by adding your first lead manually or set up WhatsApp/Email integration"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Leads"
        description={`${filteredLeads?.length || 0} leads found`}
        actions={
          <Button onClick={() => navigate("/admin/leads/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Leads Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLeads?.map((lead) => {
          const isConverted = !!lead.client_id;
          
          return (
            <Card
              key={lead.id}
              className="p-4 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getSourceIcon(lead.source)}</span>
                  <Badge className={getStatusBadge(lead.status)}>
                    {lead.status}
                  </Badge>
                  {isConverted && (
                    <Badge variant="outline" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Converted
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div 
                className="space-y-2 cursor-pointer"
                onClick={() => navigate(`/admin/leads/${lead.id}`)}
              >
                <h3 className="font-semibold text-lg">
                  {lead.name || "Unknown"}
                </h3>
                {lead.company && (
                  <p className="text-sm text-muted-foreground">
                    {lead.company}
                  </p>
                )}
                {lead.phone && (
                  <p className="text-sm font-mono">{lead.phone}</p>
                )}
                {lead.email && (
                  <p className="text-sm text-muted-foreground">
                    {lead.email}
                  </p>
                )}
                {lead.requirement && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {lead.requirement}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t">
                {isConverted ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/clients/${lead.client_id}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Client
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(lead);
                      setConvertDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convert to Client
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedLead && (
        <ConvertLeadToClientDialog
          lead={selectedLead}
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          onConverted={() => {
            refetch();
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
