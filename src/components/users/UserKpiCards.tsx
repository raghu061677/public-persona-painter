import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Clock, ShieldAlert, Briefcase, DollarSign, Wrench, Eye } from "lucide-react";
import { normalizeRole } from "@/lib/rbac/roleNormalization";

interface UserProfile {
  id: string;
  username: string;
  roles?: string[];
  status?: string;
}

interface UserKpiCardsProps {
  users: UserProfile[];
}

export default function UserKpiCards({ users }: UserKpiCardsProps) {
  const total = users.length;
  const active = users.filter(u => u.status === "Active").length;
  const suspended = users.filter(u => u.status && u.status !== "Active").length;

  const countByNormalized = (target: string) =>
    users.filter(u => u.roles?.some(r => normalizeRole(r) === target)).length;

  const admins = countByNormalized("admin") + countByNormalized("platform_admin");
  const sales = countByNormalized("sales");
  const ops = countByNormalized("operations_manager") + countByNormalized("mounting") + countByNormalized("monitoring");
  const finance = countByNormalized("finance");

  const cards = [
    { label: "Total Users", value: total, icon: Users, color: "text-primary" },
    { label: "Active", value: active, icon: UserCheck, color: "text-emerald-600" },
    { label: "Suspended", value: suspended, icon: ShieldAlert, color: "text-destructive" },
    { label: "Admins", value: admins, icon: ShieldAlert, color: "text-destructive" },
    { label: "Sales", value: sales, icon: Briefcase, color: "text-blue-600" },
    { label: "Ops / Field", value: ops, icon: Wrench, color: "text-emerald-600" },
    { label: "Finance", value: finance, icon: DollarSign, color: "text-purple-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`${c.color} p-2 rounded-lg bg-muted/50`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{c.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
