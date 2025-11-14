import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  ClipboardList,
  Users,
  FileText,
  PlusCircle,
  Banknote,
  Receipt,
  Copy,
  GanttChartSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import PowerBillsWidget from "@/components/dashboard/PowerBillsWidget";
import { ApprovedPlansWidget } from "@/components/dashboard/ApprovedPlansWidget";
import RoleBasedDashboard, { getRoleDashboardLayout } from "@/components/dashboard/RoleBasedDashboard";
import GuidedTour from "@/components/onboarding/GuidedTour";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { InstallationDashboard } from "@/components/dashboard/InstallationDashboard";
import { MonitoringDashboard } from "@/components/dashboard/MonitoringDashboard";
import { PageCustomization, PageCustomizationOption } from "@/components/ui/page-customization";

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('sales');
  
  // Page customization state
  const [showMetrics, setShowMetrics] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showWidgets, setShowWidgets] = useState(true);

  const [metrics, setMetrics] = useState({
    totalAssets: 0,
    activeCampaigns: 0,
    leadsThisMonth: 0,
    revenueThisMonth: 0,
    pendingTasks: 0,
  });

  const [revenueData] = useState([
    { month: 'Jan', revenue: 450000 },
    { month: 'Feb', revenue: 420000 },
    { month: 'Mar', revenue: 580000 },
    { month: 'Apr', revenue: 510000 },
    { month: 'May', revenue: 620000 },
    { month: 'Jun', revenue: 780000 },
    { month: 'Jul', revenue: 820000 },
    { month: 'Aug', revenue: 750000 },
    { month: 'Sep', revenue: 900000 },
    { month: 'Oct', revenue: 1100000 },
    { month: 'Nov', revenue: 1050000 },
    { month: 'Dec', revenue: 1350000 },
  ]);

  const [assetStatusData] = useState([
    { name: 'Booked', value: 480 },
    { name: 'Vacant', value: 220 },
    { name: 'Maintenance', value: 50 },
    { name: 'Blocked', value: 25 },
  ]);

  const [financials, setFinancials] = useState({
    profitLoss: 125000,
    gstCollected: 75000,
    pendingInvoices: 18,
    paidInvoices: 45,
  });

  useEffect(() => {
    checkAuth();
    loadUserRole();
    fetchStats();
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch media assets count
      const { count: assetsCount } = await supabase
        .from("media_assets")
        .select("*", { count: "exact", head: true });

      // Fetch active campaigns count
      const { count: campaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .in("status", ["InProgress", "Planned"]);

      // Fetch leads count for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: leadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Fetch invoices data
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("status, total_amount, gst_amount");

      let totalRevenue = 0;
      let gstCollected = 0;
      let pendingInvoices = 0;
      let paidInvoices = 0;

      invoicesData?.forEach((invoice) => {
        totalRevenue += Number(invoice.total_amount || 0);
        gstCollected += Number(invoice.gst_amount || 0);
        if (invoice.status === "Paid") {
          paidInvoices++;
        } else {
          pendingInvoices++;
        }
      });

      setMetrics({
        totalAssets: assetsCount || 0,
        activeCampaigns: campaignsCount || 0,
        leadsThisMonth: leadsCount || 0,
        revenueThisMonth: totalRevenue,
        pendingTasks: 6, // Mock data
      });

      setFinancials({
        profitLoss: 125000, // Mock data - calculate from expenses vs revenue
        gstCollected,
        pendingInvoices,
        paidInvoices,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const dashboardLayout = getRoleDashboardLayout(userRole);
  const shouldShowWidget = (widgetId: string) => dashboardLayout.includes(widgetId);

  // Role-specific dashboard layouts
  if (userRole === 'manager') {
    return (
      <>
        <GuidedTour role={userRole} />
        <RoleBasedDashboard role={userRole}>
          <ManagerDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  if (userRole === 'installation') {
    return (
      <>
        <GuidedTour role={userRole} />
        <RoleBasedDashboard role={userRole}>
          <InstallationDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  if (userRole === 'monitoring') {
    return (
      <>
        <GuidedTour role={userRole} />
        <RoleBasedDashboard role={userRole}>
          <MonitoringDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  // Default dashboard for admin, sales, operations, finance
  return (
    <>
      <GuidedTour role={userRole} />
      <RoleBasedDashboard role={userRole}>
        <div className="space-y-6">
          {/* Metric Cards */}
          {shouldShowWidget('revenue') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-tour="dashboard">
              <MetricCard
                title="Total Assets"
                value={metrics.totalAssets}
                icon={<ClipboardList />}
              />
              <MetricCard
                title="Active Campaigns"
                value={metrics.activeCampaigns}
                icon={<GanttChartSquare />}
              />
              <MetricCard
                title="New Leads"
                value={metrics.leadsThisMonth}
                icon={<Users />}
              />
              <MetricCard
                title="Revenue (₹)"
                value={metrics.revenueThisMonth.toLocaleString()}
                icon={<IndianRupee />}
              />
              <MetricCard
                title="Pending Tasks"
                value={metrics.pendingTasks}
                icon={<FileText />}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Approved Plans Widget */}
            {shouldShowWidget('pending-approvals') && (
              <div className="lg:col-span-4" data-tour="approved-plans">
                <ApprovedPlansWidget />
              </div>
            )}

            {/* Pending Approvals Widget */}
            {shouldShowWidget('pending-approvals') && (
              <div className="lg:col-span-4" data-tour="pending-approvals">
                <PendingApprovalsWidget />
              </div>
            )}

            {/* Power Bills Widget */}
            {shouldShowWidget('power-bills') && (
              <div className="lg:col-span-4" data-tour="power-bills">
                <PowerBillsWidget />
              </div>
            )}

            {/* Revenue Overview Chart */}
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>
                    Monthly revenue totals for the current year.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${Number(value) / 100000}L`}
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          }).format(value)
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-12 xl:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Status</CardTitle>
                  <CardDescription>Distribution of all media assets.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={assetStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {assetStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => value.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {shouldShowWidget('invoices') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Profit / Loss"
                value={`₹${financials.profitLoss.toLocaleString()}`}
                icon={<Banknote />}
              />
              <MetricCard
                title="GST Collected"
                value={`₹${financials.gstCollected.toLocaleString()}`}
                icon={<Receipt />}
              />
              <MetricCard
                title="Pending Invoices"
                value={financials.pendingInvoices}
                icon={<Copy />}
              />
              <MetricCard
                title="Paid Invoices"
                value={financials.paidInvoices}
                icon={<IndianRupee />}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button onClick={() => navigate('/admin/plans/new')}>
                <PlusCircle className="mr-2" /> Create New Plan
              </Button>
              <Button onClick={() => navigate('/finance/invoices')}>
                <PlusCircle className="mr-2" /> Create New Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleBasedDashboard>
    </>
  );

};

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-6 w-6 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
