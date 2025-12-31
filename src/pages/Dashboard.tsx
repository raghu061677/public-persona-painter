import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
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
import { LoadingState } from "@/components/ui/loading-state";
import { StatCard } from "@/components/ui/stat-card";
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
import { WelcomeDialog } from "@/components/onboarding/WelcomeDialog";
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
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('sales');
  const [startTour, setStartTour] = useState(false);
  
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

  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [assetStatusData, setAssetStatusData] = useState<Array<{ name: string; value: number }>>([]);

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
  }, [user, company]);

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
      // Get current user's selected company
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: companyUserData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      const selectedCompanyId = localStorage.getItem('selected_company_id') || companyUserData?.company_id;
      
      if (!selectedCompanyId) {
        setLoading(false);
        return;
      }

      // Fetch media assets count for this company
      const { count: assetsCount } = await supabase
        .from("media_assets")
        .select("*", { count: "exact", head: true })
        .eq("company_id", selectedCompanyId);

      // Fetch active campaigns count for this company
      const { count: campaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("company_id", selectedCompanyId)
        .eq("is_deleted", false)
        .in("status", ["Running", "Planned", "InProgress"]);

      // Fetch leads count for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: leadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Fetch invoices data for this company
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("status, total_amount, gst_amount")
        .eq("company_id", selectedCompanyId);

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

      // Fetch asset status distribution
      const { data: assetsByStatus } = await supabase
        .from("media_assets")
        .select("status")
        .eq("company_id", selectedCompanyId);

      const statusCounts: Record<string, number> = {};
      assetsByStatus?.forEach((asset) => {
        statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
      });

      setAssetStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // Fetch monthly revenue data (last 12 months)
      const monthlyRevenue: Array<{ month: string; revenue: number }> = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
        
        const { data: monthInvoices } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", selectedCompanyId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd);
        
        const monthTotal = monthInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
        
        monthlyRevenue.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthTotal,
        });
      }
      
      setRevenueData(monthlyRevenue);

      // Calculate pending tasks (real data)
      const { count: pendingTasksCount } = await supabase
        .from("campaign_assets")
        .select("*", { count: "exact", head: true })
        .neq("status", "Verified");

      setMetrics({
        totalAssets: assetsCount || 0,
        activeCampaigns: campaignsCount || 0,
        leadsThisMonth: leadsCount || 0,
        revenueThisMonth: totalRevenue,
        pendingTasks: pendingTasksCount || 0,
      });

      setFinancials({
        profitLoss: totalRevenue - (gstCollected * 5.56), // Approximate profit (revenue - expenses estimate)
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
        <WelcomeDialog onStartTour={() => setStartTour(true)} />
        {startTour && <GuidedTour role={userRole} />}
        <RoleBasedDashboard role={userRole}>
          <ManagerDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  if (userRole === 'installation') {
    return (
      <>
        <WelcomeDialog onStartTour={() => setStartTour(true)} />
        {startTour && <GuidedTour role={userRole} />}
        <RoleBasedDashboard role={userRole}>
          <InstallationDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  if (userRole === 'monitoring') {
    return (
      <>
        <WelcomeDialog onStartTour={() => setStartTour(true)} />
        {startTour && <GuidedTour role={userRole} />}
        <RoleBasedDashboard role={userRole}>
          <MonitoringDashboard />
        </RoleBasedDashboard>
      </>
    );
  }

  // Default dashboard for admin, sales, operations, finance
  return (
    <>
      <WelcomeDialog onStartTour={() => setStartTour(true)} />
      {startTour && <GuidedTour role={userRole} />}
      <RoleBasedDashboard role={userRole}>
        <div className="space-y-6 animate-fade-in">
          {/* Metric Cards */}
          {shouldShowWidget('revenue') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-tour="dashboard">
              <StatCard
                title="Total Assets"
                value={metrics.totalAssets}
                icon={ClipboardList}
                description="Total inventory"
                borderColor="border-l-blue-500"
              />
              <StatCard
                title="Active Campaigns"
                value={metrics.activeCampaigns}
                icon={GanttChartSquare}
                description="Currently running"
                borderColor="border-l-green-500"
              />
              <StatCard
                title="New Leads"
                value={metrics.leadsThisMonth}
                icon={Users}
                description="This month"
                borderColor="border-l-purple-500"
              />
              <StatCard
                title="Revenue"
                value={`₹${(metrics.revenueThisMonth / 100000).toFixed(1)}L`}
                icon={IndianRupee}
                description="This month"
                borderColor="border-l-orange-500"
              />
              <div onClick={() => navigate('/admin/operations')} className="cursor-pointer">
                <StatCard
                  title="Pending Tasks"
                  value={metrics.pendingTasks}
                  icon={FileText}
                  description="Require attention"
                  borderColor="border-l-red-500"
                />
              </div>
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
              <Card className="hover-scale transition-all duration-200 border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" />
                    Revenue Overview
                  </CardTitle>
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
              <Card className="hover-scale transition-all duration-200 border-l-4 border-l-indigo-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Asset Status
                  </CardTitle>
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
