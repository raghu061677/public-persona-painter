import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Package, FileText, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface DashboardWidget {
  id: string;
  title: string;
  icon: ReactNode;
  component: ReactNode;
  roles: string[];
}

interface RoleBasedDashboardProps {
  role: string;
  children?: ReactNode;
}

// Define widgets for each role
export const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'revenue',
    title: 'Revenue Overview',
    icon: <DollarSign className="h-4 w-4" />,
    component: null, // Will be filled by parent
    roles: ['admin', 'finance', 'sales', 'manager'],
  },
  {
    id: 'clients',
    title: 'Client Stats',
    icon: <Users className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'sales', 'manager'],
  },
  {
    id: 'campaigns',
    title: 'Active Campaigns',
    icon: <TrendingUp className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'sales', 'operations', 'manager', 'installation'],
  },
  {
    id: 'assets',
    title: 'Media Assets',
    icon: <Package className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'operations', 'monitoring'],
  },
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    icon: <Clock className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance', 'sales', 'manager'],
  },
  {
    id: 'invoices',
    title: 'Invoice Status',
    icon: <FileText className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance', 'manager'],
  },
  {
    id: 'power-bills',
    title: 'Power Bills',
    icon: <AlertCircle className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance', 'operations', 'monitoring'],
  },
  {
    id: 'operations',
    title: 'Operations Status',
    icon: <CheckCircle className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'operations', 'installation'],
  },
];

export default function RoleBasedDashboard({ role, children }: RoleBasedDashboardProps) {
  // Filter widgets based on user role
  const visibleWidgets = dashboardWidgets.filter(widget => 
    widget.roles.includes(role)
  );

  const getDashboardTitle = () => {
    switch (role) {
      case 'admin': return 'Admin Dashboard';
      case 'sales': return 'Sales Dashboard';
      case 'operations': return 'Operations Dashboard';
      case 'finance': return 'Finance Dashboard';
      case 'manager': return 'Manager Dashboard';
      case 'installation': return 'Installation Dashboard';
      case 'monitoring': return 'Monitoring Dashboard';
      default: return 'Dashboard';
    }
  };

  const getDashboardDescription = () => {
    switch (role) {
      case 'admin': return 'Complete system overview and management';
      case 'sales': return 'Track leads, clients, and revenue performance';
      case 'operations': return 'Monitor campaigns and field operations';
      case 'finance': return 'Financial metrics and payment tracking';
      case 'manager': return 'Team performance and business metrics';
      case 'installation': return 'Installation assignments and proof uploads';
      case 'monitoring': return 'Asset monitoring and maintenance tracking';
      default: return 'Your personalized dashboard';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground mt-1">{getDashboardDescription()}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

export function getRoleDashboardLayout(role: string): string[] {
  const layouts: Record<string, string[]> = {
    admin: ['revenue', 'clients', 'campaigns', 'assets', 'pending-approvals', 'invoices', 'power-bills', 'operations'],
    sales: ['revenue', 'clients', 'campaigns', 'pending-approvals'],
    operations: ['campaigns', 'assets', 'operations', 'power-bills'],
    finance: ['revenue', 'invoices', 'pending-approvals', 'power-bills'],
    manager: ['revenue', 'clients', 'campaigns', 'pending-approvals', 'invoices'],
    installation: ['campaigns', 'operations'],
    monitoring: ['assets', 'power-bills', 'operations'],
  };

  return layouts[role] || layouts.sales;
}
