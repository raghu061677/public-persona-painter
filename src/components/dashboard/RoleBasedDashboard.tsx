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
    roles: ['admin', 'finance', 'sales'],
  },
  {
    id: 'clients',
    title: 'Client Stats',
    icon: <Users className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'sales'],
  },
  {
    id: 'campaigns',
    title: 'Active Campaigns',
    icon: <TrendingUp className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'sales', 'operations'],
  },
  {
    id: 'assets',
    title: 'Media Assets',
    icon: <Package className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'operations'],
  },
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    icon: <Clock className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance', 'sales'],
  },
  {
    id: 'invoices',
    title: 'Invoice Status',
    icon: <FileText className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance'],
  },
  {
    id: 'power-bills',
    title: 'Power Bills',
    icon: <AlertCircle className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'finance', 'operations'],
  },
  {
    id: 'operations',
    title: 'Operations Status',
    icon: <CheckCircle className="h-4 w-4" />,
    component: null,
    roles: ['admin', 'operations'],
  },
];

export default function RoleBasedDashboard({ role, children }: RoleBasedDashboardProps) {
  // Filter widgets based on user role
  const visibleWidgets = dashboardWidgets.filter(widget => 
    widget.roles.includes(role)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {role === 'admin' && 'Admin Dashboard'}
            {role === 'sales' && 'Sales Dashboard'}
            {role === 'operations' && 'Operations Dashboard'}
            {role === 'finance' && 'Finance Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'admin' && 'Complete system overview and management'}
            {role === 'sales' && 'Track leads, clients, and revenue performance'}
            {role === 'operations' && 'Monitor campaigns and field operations'}
            {role === 'finance' && 'Financial metrics and payment tracking'}
          </p>
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
  };

  return layouts[role] || layouts.sales;
}
