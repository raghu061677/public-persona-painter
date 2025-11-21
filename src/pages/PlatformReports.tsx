import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { BarChart3, Building2, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PlatformReports() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Company Usage",
      description: "Track company activity and resource utilization",
      icon: Building2,
      href: "/admin/platform-reports/company-usage",
      color: "text-blue-500",
    },
    {
      title: "Billing & Revenue",
      description: "Monitor subscription revenue and payments",
      icon: DollarSign,
      href: "/admin/platform-reports/billing",
      color: "text-green-500",
    },
    {
      title: "Media Inventory",
      description: "Platform-wide media asset analytics",
      icon: TrendingUp,
      href: "/admin/platform-reports/media-inventory",
      color: "text-purple-500",
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights across the entire platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.href} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(report.href)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-8 w-8 ${report.color}`} />
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={(e) => {
                    e.stopPropagation();
                    navigate(report.href);
                  }}>
                    View Report
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Platform-wide metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold">Loading...</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">Loading...</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">Loading...</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">Loading...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
