import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Wrench, Camera, CheckCircle2, AlertTriangle,
  Eye, CalendarCheck, ShieldCheck, Activity
} from "lucide-react";
import { normalizeCampaignAssetStatus } from "@/lib/constants/campaignAssetStatus";

interface OpsKpiCardsProps {
  assets: any[];
}

interface KpiTile {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
  pulse?: boolean;
}

export function OpsKpiCards({ assets }: OpsKpiCardsProps) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let assignedToday = 0;
    let pendingMounting = 0;
    let pendingMonitoring = 0;
    let proofPending = 0;
    let verificationPending = 0;
    let completedToday = 0;
    let issueCount = 0;
    let total = assets.length;

    for (const a of assets) {
      const s = normalizeCampaignAssetStatus(a.status);
      const assignedDate = a.assigned_at ? a.assigned_at.split("T")[0] : null;
      const completedDate = a.completed_at ? a.completed_at.split("T")[0] : null;

      if (assignedDate === today) assignedToday++;
      if (completedDate === today && (s === "Verified" || s === "Completed")) completedToday++;

      if (s === "Pending" || s === "Assigned") pendingMounting++;
      if (s === "Installed") pendingMonitoring++;
      if (s === "Completed") verificationPending++;
      if (s === "Installed" && !hasPhotos(a)) proofPending++;
      if (s === "Assigned" && a.assigned_at) {
        const daysSinceAssigned = Math.floor(
          (Date.now() - new Date(a.assigned_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceAssigned > 7) issueCount++;
      }
    }

    return { total, assignedToday, pendingMounting, pendingMonitoring, proofPending, verificationPending, completedToday, issueCount };
  }, [assets]);

  const tiles: KpiTile[] = [
    { label: "Assigned Today", value: stats.assignedToday, icon: CalendarCheck, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Mounting Queue", value: stats.pendingMounting, icon: Wrench, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", pulse: stats.pendingMounting > 0 },
    { label: "Monitoring", value: stats.pendingMonitoring, icon: Eye, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
    { label: "Proof Pending", value: stats.proofPending, icon: Camera, color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10", pulse: stats.proofPending > 0 },
    { label: "Verification", value: stats.verificationPending, icon: ShieldCheck, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10" },
    { label: "Completed Today", value: stats.completedToday, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
    { label: "Issues", value: stats.issueCount, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", pulse: stats.issueCount > 0 },
    { label: "Total", value: stats.total, icon: Activity, color: "text-foreground", bgColor: "bg-muted" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {tiles.map((t) => (
        <Card key={t.label} className={cn(
          "border shadow-sm transition-all hover:shadow-md group relative overflow-hidden",
          t.pulse && t.value > 0 && "ring-1 ring-offset-1 ring-offset-background",
          t.pulse && t.value > 0 && t.color.includes("amber") && "ring-amber-500/40",
          t.pulse && t.value > 0 && t.color.includes("cyan") && "ring-cyan-500/40",
          t.pulse && t.value > 0 && t.color.includes("destructive") && "ring-destructive/40",
        )}>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", t.bgColor)}>
              <t.icon className={cn("h-4 w-4", t.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight truncate uppercase tracking-wider font-medium">{t.label}</p>
              <p className={cn(
                "text-xl font-bold leading-tight tabular-nums",
                t.value > 0 ? t.color : "text-muted-foreground/50"
              )}>
                {t.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function hasPhotos(asset: any): boolean {
  if (!asset.photos) return false;
  if (typeof asset.photos === "string") {
    try {
      const parsed = JSON.parse(asset.photos);
      return Object.values(parsed).some(Boolean);
    } catch { return false; }
  }
  if (typeof asset.photos === "object") {
    return Object.values(asset.photos).some(Boolean);
  }
  return false;
}
