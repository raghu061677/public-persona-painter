import { AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoAlertProps {
  variant?: "info" | "warning" | "success" | "error";
  children: React.ReactNode;
  className?: string;
}

export function InfoAlert({ variant = "info", children, className }: InfoAlertProps) {
  const variants = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Info,
      iconColor: "text-blue-500"
    },
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: AlertTriangle,
      iconColor: "text-orange-500"
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle,
      iconColor: "text-emerald-500"
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: AlertCircle,
      iconColor: "text-red-500"
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border p-4 flex gap-3",
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconColor)} />
      <div className="text-sm text-foreground flex-1">
        {children}
      </div>
    </div>
  );
}
