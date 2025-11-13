import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, CheckCircle } from "lucide-react";

type Props = {
  loading: boolean;
  aggregates: {
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    totalAmountDue: number;
    totalPaidAmount: number;
    pendingCount: number;
  } | null;
};

export default function PowerBillKPIs({ loading, aggregates }: Props) {
  const a = aggregates;

  if (loading || !a) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const completionRate = a.totalBills > 0 ? ((a.paidBills / a.totalBills) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Bills (Last 6 Months)"
        value={a.totalBills.toString()}
        icon={<FileText className="h-5 w-5 text-primary" />}
        trend={a.totalBills > 0 ? "up" : "neutral"}
      />
      
      <KpiCard
        title="Paid Bills"
        value={a.paidBills.toString()}
        subtitle={`${completionRate}% completion rate`}
        icon={<CheckCircle className="h-5 w-5 text-green-600" />}
        trend="up"
        positive
      />
      
      <KpiCard
        title="Unpaid Bills"
        value={a.unpaidBills.toString()}
        subtitle={a.pendingCount > 0 ? `${a.pendingCount} pending` : undefined}
        icon={<AlertCircle className="h-5 w-5 text-destructive" />}
        trend={a.unpaidBills > 0 ? "down" : "neutral"}
        highlight
      />
      
      <KpiCard
        title="Total Amount Due"
        value={formatCurrency(a.totalAmountDue)}
        subtitle={a.totalPaidAmount > 0 ? `Paid: ${formatCurrency(a.totalPaidAmount)}` : undefined}
        icon={<DollarSign className="h-5 w-5 text-orange-600" />}
        trend="neutral"
      />
    </div>
  );
}

function KpiCard({ 
  title, 
  value, 
  subtitle,
  icon,
  trend,
  highlight = false,
  positive = false
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <Card className={highlight ? "border-destructive" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold ${highlight ? "text-destructive" : positive ? "text-green-600" : ""}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="ml-4">
            {icon}
          </div>
        </div>
        {trend !== "neutral" && (
          <div className={`flex items-center mt-2 text-xs ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}>
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            <span>{trend === "up" ? "Increasing" : "Decreasing"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
