import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Plus
} from "lucide-react";
import { formatINR, getInvoiceStatusColor, getDaysOverdue } from "@/utils/finance";
import { toast } from "sonner";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ClientDocuments } from "@/components/clients/ClientDocuments";
import { SendPortalInviteDialog } from "@/components/clients/SendPortalInviteDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { ClientContactsManager } from "@/components/clients/ClientContactsManager";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contact_person: string | null;
  notes: string | null;
  created_at: string;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_pincode: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_pincode: string | null;
  shipping_same_as_billing: boolean | null;
}

interface Plan {
  id: string;
  plan_name: string;
  status: string;
  grand_total: number;
  created_at: string;
  start_date: string;
  end_date: string;
}

interface Campaign {
  id: string;
  campaign_name: string;
  status: string;
  grand_total: number;
  total_assets: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  payments: any;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  changed_fields: any;
  old_values: any;
  new_values: any;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalDue: 0,
    totalPlans: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    overdueInvoices: 0,
    avgPaymentDays: 0,
  });

  useEffect(() => {
    if (id) {
      fetchClientDetails();
    }
  }, [id]);

  useEffect(() => {
    // Check if edit=true query parameter is present
    if (searchParams.get('edit') === 'true') {
      setShowEditDialog(true);
    }
  }, [searchParams]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from("client_audit_log")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setAuditLogs(logsData || []);

      // Calculate stats
      const totalRevenue = invoicesData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
      const totalDue = invoicesData?.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;
      const totalPaid = totalRevenue - totalDue;

      const activeCampaigns = campaignsData?.filter(c => 
        ["Planned", "Assigned", "InProgress"].includes(c.status)
      ).length || 0;

      const completedCampaigns = campaignsData?.filter(c => 
        ["Completed", "Verified"].includes(c.status)
      ).length || 0;

      const overdueInvoices = invoicesData?.filter(inv => {
        if (inv.status === "Paid") return false;
        return getDaysOverdue(inv.due_date) > 0;
      }).length || 0;

      // Calculate average payment days
      const paidInvoices = invoicesData?.filter(inv => {
        if (inv.status !== "Paid") return false;
        const payments = Array.isArray(inv.payments) ? inv.payments : [];
        return payments.length > 0;
      }) || [];
      
      let totalDays = 0;
      paidInvoices.forEach(inv => {
        const payments = Array.isArray(inv.payments) ? inv.payments : [];
        if (payments.length > 0) {
          const lastPayment = payments[payments.length - 1];
          if (lastPayment && typeof lastPayment === 'object' && 'payment_date' in lastPayment) {
            const invoiceDate = new Date(inv.invoice_date);
            const paymentDate = new Date(lastPayment.payment_date as string);
            const days = Math.floor((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += days;
          }
        }
      });
      const avgPaymentDays = paidInvoices.length > 0 ? Math.round(totalDays / paidInvoices.length) : 0;

      setStats({
        totalRevenue,
        totalPaid,
        totalDue,
        totalPlans: plansData?.length || 0,
        activeCampaigns,
        completedCampaigns,
        overdueInvoices,
        avgPaymentDays,
      });

    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      Draft: "bg-muted text-muted-foreground",
      Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Approved: "bg-primary text-primary-foreground",
      Rejected: "bg-destructive text-destructive-foreground",
      Converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Planned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      InProgress: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      Completed: "bg-primary text-primary-foreground",
      Verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Paid: "bg-primary text-primary-foreground",
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Overdue: "bg-destructive text-destructive-foreground",
    };
    return statusColors[status] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => navigate("/admin/clients")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title={client.name}
        description={client.company || undefined}
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Clients", path: ROUTES.CLIENTS },
          { label: client.name },
        ]}
        showBackButton
        backPath={ROUTES.CLIENTS}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/clients/${client.id}/analytics`)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant="default"
              onClick={() => setShowInviteDialog(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Portal Invite
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchParams({ edit: 'true' });
                setShowEditDialog(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Client
            </Button>
          </>
        }
      />

      {/* Key Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalRevenue)}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={(stats.totalPaid / stats.totalRevenue) * 100} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {Math.round((stats.totalPaid / stats.totalRevenue) * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid: {formatINR(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatINR(stats.totalDue)}</div>
            {stats.overdueInvoices > 0 && (
              <p className="text-xs text-destructive mt-1">
                {stats.overdueInvoices} overdue invoice{stats.overdueInvoices > 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Avg payment: {stats.avgPaymentDays} days
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCampaigns} active • {stats.completedCampaigns} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plans</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {plans.filter(p => p.status?.toLowerCase() === "approved").length} approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {stats.overdueInvoices > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This client has {stats.overdueInvoices} overdue invoice{stats.overdueInvoices > 1 ? 's' : ''} with total outstanding of {formatINR(stats.totalDue)}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
              </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Profile Information
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchParams({ edit: 'true' });
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{client.email || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{client.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">GST Number</p>
                      <p className="text-sm text-muted-foreground">{client.gst_number || "Not provided"}</p>
                    </div>
                  </div>

                  {client.contact_person && (
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Contact Person</p>
                        <p className="text-sm text-muted-foreground">{client.contact_person}</p>
                      </div>
                    </div>
                  )}

                  {client.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">{client.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Persons</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientContactsManager clientId={client.id} />
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Billing Address */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Billing Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {client.billing_address_line1 ? (
                        <>
                          <p>{client.billing_address_line1}</p>
                          {client.billing_address_line2 && <p>{client.billing_address_line2}</p>}
                          <p>
                            {client.billing_city && `${client.billing_city}`}
                            {client.billing_state && `, ${client.billing_state}`}
                            {client.billing_pincode && ` - ${client.billing_pincode}`}
                          </p>
                        </>
                      ) : (
                        <p>Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Shipping Address */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Shipping Address</p>
                  {client.shipping_same_as_billing ? (
                    <p className="text-sm text-muted-foreground italic">Same as billing address</p>
                  ) : (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        {client.shipping_address_line1 ? (
                          <>
                            <p>{client.shipping_address_line1}</p>
                            {client.shipping_address_line2 && <p>{client.shipping_address_line2}</p>}
                            <p>
                              {client.shipping_city && `${client.shipping_city}`}
                              {client.shipping_state && `, ${client.shipping_state}`}
                              {client.shipping_pincode && ` - ${client.shipping_pincode}`}
                            </p>
                          </>
                        ) : (
                          <p>Not provided</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="rounded-full bg-primary/10 p-1.5">
                      <Activity className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Overview</CardTitle>
              <CardDescription>Recent invoices and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.slice(0, 5).length > 0 ? (
                <div className="space-y-4">
                  {invoices.slice(0, 5).map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice.due_date);
                    const isOverdue = invoice.status !== "Paid" && daysOverdue > 0;
                    
                    return (
                      <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.id}</p>
                            <Badge className={getStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {isOverdue && (
                              <span className="text-destructive ml-2">
                                • {daysOverdue} days overdue
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatINR(invoice.total_amount)}</p>
                          {invoice.balance_due > 0 && (
                            <p className="text-sm text-destructive">
                              Due: {formatINR(invoice.balance_due)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>All Plans</CardTitle>
                <CardDescription>Quotations and proposals for this client</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(`/admin/plans/new?client_id=${client.id}`)}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </CardHeader>
            <CardContent>
              {plans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.id}</TableCell>
                        <TableCell>{plan.plan_name}</TableCell>
                        <TableCell>
                          {new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(plan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell>{formatINR(plan.grand_total)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(plan.status)}>
                            {plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(plan.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/admin/plans/${plan.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No plans found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Active and completed campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Assets</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.id}</TableCell>
                        <TableCell>{campaign.campaign_name}</TableCell>
                        <TableCell>
                          {new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell>{campaign.total_assets || 0}</TableCell>
                        <TableCell>{formatINR(campaign.grand_total)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No campaigns found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices & Payments</CardTitle>
              <CardDescription>Complete payment history and outstanding dues</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aging</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const daysOverdue = getDaysOverdue(invoice.due_date);
                      const isOverdue = invoice.status !== "Paid" && daysOverdue > 0;
                      const paidAmount = invoice.total_amount - invoice.balance_due;

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>
                            {new Date(invoice.invoice_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.due_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{formatINR(invoice.total_amount)}</TableCell>
                          <TableCell className="text-primary">{formatINR(paidAmount)}</TableCell>
                          <TableCell className={invoice.balance_due > 0 ? "text-destructive font-medium" : ""}>
                            {formatINR(invoice.balance_due)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <span className="text-destructive font-medium">
                                {daysOverdue} days
                              </span>
                            ) : invoice.status === "Paid" ? (
                              <span className="text-primary flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Paid
                              </span>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Current
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <ClientDocuments clientId={id!} clientName={client?.name || ''} />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Audit Log</CardTitle>
              <CardDescription>Complete history of all changes to this client record</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">Changed fields:</p>
                          {Object.entries(log.changed_fields).map(([field, values]: [string, any]) => (
                            <div key={field} className="text-sm text-muted-foreground ml-4">
                              <span className="font-medium">{field}:</span>
                              <span className="line-through mx-2">{String(values.old || 'empty')}</span>
                              →
                              <span className="mx-2 text-primary">{String(values.new || 'empty')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No activity recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Portal Invite Dialog */}
      <SendPortalInviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        clientId={client.id}
        clientName={client.name}
        defaultEmail={client.email || undefined}
      />

      {/* Edit Client Dialog */}
      <EditClientDialog
        client={client}
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            // Remove edit query parameter when dialog is closed
            searchParams.delete('edit');
            setSearchParams(searchParams);
          }
        }}
        onClientUpdated={() => {
          fetchClientDetails();
          setShowEditDialog(false);
          searchParams.delete('edit');
          setSearchParams(searchParams);
        }}
      />
    </div>
  );
}
