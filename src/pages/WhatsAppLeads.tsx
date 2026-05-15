import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  UserPlus,
  FileText,
  CheckCircle2,
  XCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ConversationDrawer } from "@/components/whatsapp/ConversationDrawer";
import { ConvertLeadToClientDialog } from "@/components/leads/ConvertLeadToClientDialog";

interface WaLead {
  id: string;
  name: string | null;
  phone: string | null;
  company_name: string | null;
  company: string | null;
  requirement: string | null;
  target_locations: string | null;
  media_type: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  client_id: string | null;
  plan_id: string | null;
  email: string | null;
  location: string | null;
  source: string;
  metadata: any;
  converted_at: string | null;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
}

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "requirement_received",
  "proposal_sent",
  "converted",
  "closed",
  "lost",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  requirement_received: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  proposal_sent: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function WhatsAppLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<WaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mediaFilter, setMediaFilter] = useState<string>("all");
  const [drawerLead, setDrawerLead] = useState<WaLead | null>(null);
  const [convertLead, setConvertLead] = useState<WaLead | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,name,phone,company,company_name,requirement,target_locations,media_type,status,last_message_at,created_at,client_id,plan_id,email,location,source,metadata,converted_at",
      )
      .eq("source", "whatsapp")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
    } else {
      setLeads((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (mediaFilter !== "all" && (l.media_type ?? "") !== mediaFilter) return false;
      if (!q) return true;
      return [
        l.name,
        l.phone,
        l.company_name,
        l.company,
        l.requirement,
        l.target_locations,
        l.location,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [leads, search, statusFilter, mediaFilter]);

  const kpis = useMemo(() => {
    const total = leads.length;
    const byStatus = (s: string) => leads.filter((l) => l.status === s).length;
    return {
      total,
      new: byStatus("new"),
      requirement: byStatus("requirement_received"),
      proposal: byStatus("proposal_sent"),
      converted: byStatus("converted"),
    };
  }, [leads]);

  const mediaTypes = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.media_type).filter(Boolean))) as string[],
    [leads],
  );

  const updateStatus = async (lead: WaLead, status: string) => {
    const prev = lead.status;
    setLeads((arr) => arr.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const { error } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      setLeads((arr) =>
        arr.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)),
      );
    } else {
      toast.success(`Marked as ${status.replace(/_/g, " ")}`);
    }
  };

  const createPlanFor = async (lead: WaLead) => {
    if (!lead.client_id) {
      toast.info("Please convert this lead to a client first.");
      setConvertLead(lead);
      return;
    }
    const params = new URLSearchParams();
    params.set("client_id", String(lead.client_id));
    if (lead.campaign_start_date) params.set("start", String(lead.campaign_start_date));
    if (lead.campaign_end_date) params.set("end", String(lead.campaign_end_date));
    if (lead.media_type) params.set("media_type", lead.media_type);
    if (lead.target_locations) params.set("locations", lead.target_locations);
    params.set("source_lead_id", lead.id);
    navigate(`/admin/plans/new?${params.toString()}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="WhatsApp Leads"
        description="Manage incoming WhatsApp enquiries and convert them into clients, plans, and campaigns"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/settings/whatsapp")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: kpis.total },
          { label: "New", value: kpis.new },
          { label: "Requirement", value: kpis.requirement },
          { label: "Proposal Sent", value: kpis.proposal },
          { label: "Converted", value: kpis.converted },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, company, requirement, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mediaFilter} onValueChange={setMediaFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Media type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All media</SelectItem>
              {mediaTypes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading WhatsApp leads…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No WhatsApp leads yet"
              description="Incoming WhatsApp messages will appear here once your webhook is connected."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Msg</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{l.phone || "—"}</TableCell>
                      <TableCell>{l.company_name || l.company || "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate" title={l.requirement || ""}>
                        {l.requirement || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {l.target_locations || l.location || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[l.status] || ""} variant="secondary">
                          {l.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.last_message_at
                          ? formatDistanceToNow(new Date(l.last_message_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(l.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDrawerLead(l)}
                            title="View conversation"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDrawerLead(l)}>
                                <Send className="h-4 w-4 mr-2" /> Send Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setConvertLead(l)}
                                disabled={!!l.client_id}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {l.client_id ? "Already a client" : "Create Client"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => createPlanFor(l)}>
                                <FileText className="h-4 w-4 mr-2" /> Create Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(l, "converted")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Converted
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(l, "lost")}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Mark Lost
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConversationDrawer
        lead={drawerLead}
        open={!!drawerLead}
        onOpenChange={(o) => !o && setDrawerLead(null)}
        onMessageSent={fetchLeads}
      />

      {convertLead && (
        <ConvertLeadToClientDialog
          lead={{
            id: convertLead.id,
            name: convertLead.name,
            company: convertLead.company || convertLead.company_name,
            email: convertLead.email,
            phone: convertLead.phone,
            location: convertLead.location || convertLead.target_locations,
            requirement: convertLead.requirement,
            source: convertLead.source,
            client_id: convertLead.client_id,
            converted_at: convertLead.converted_at,
            metadata: convertLead.metadata,
          }}
          open={!!convertLead}
          onOpenChange={(o) => !o && setConvertLead(null)}
          onConverted={() => {
            setConvertLead(null);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}