import { Badge } from "@/components/ui/badge";
import { Check, Clock, Send, AlertTriangle, FileText, Minus } from "lucide-react";

export type BillingStatus = 
  | 'not_invoiced' 
  | 'draft' 
  | 'sent' 
  | 'paid' 
  | 'overdue' 
  | 'partially_paid'
  | 'cancelled';

interface BillingStatusBadgeProps {
  status: BillingStatus;
  className?: string;
}

const statusConfig: Record<BillingStatus, { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  not_invoiced: {
    label: "Not Invoiced",
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
    icon: Minus,
  },
  draft: {
    label: "Draft",
    variant: "outline",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    variant: "default",
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  paid: {
    label: "Paid",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400",
    icon: Check,
  },
  overdue: {
    label: "Overdue",
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertTriangle,
  },
  partially_paid: {
    label: "Partial",
    variant: "outline",
    className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    variant: "secondary",
    className: "bg-gray-100 text-gray-500 line-through",
    icon: Minus,
  },
};

export function BillingStatusBadge({ status, className = "" }: BillingStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_invoiced;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} gap-1 font-medium`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function mapInvoiceStatusToBillingStatus(
  invoiceStatus: string | null | undefined,
  dueDate?: string | null
): BillingStatus {
  if (!invoiceStatus) return 'not_invoiced';

  const status = invoiceStatus.toLowerCase();
  
  if (status === 'paid') return 'paid';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'draft') return 'draft';
  if (status === 'sent' || status === 'pending') {
    // Check if overdue
    if (dueDate && new Date(dueDate) < new Date()) {
      return 'overdue';
    }
    return 'sent';
  }
  if (status === 'partially_paid' || status === 'partial') return 'partially_paid';

  return 'not_invoiced';
}
