import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList, Clock, Wrench, Camera, CheckCircle2, AlertTriangle,
  Eye, CalendarCheck
} from "lucide-react";

interface OpsKpiCardsProps {
  assets: any[];
}

interface KpiTile {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
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
      const s = (a.status || "Pending").toLowerCase();
      const assignedDate = a.assigned_at ? a.assigned_at.split("T")[0] : null;
      const completedDate = a.completed_at ? a.completed_at.split("T")[0] : null;

      if (assignedDate === today) assignedToday++;
      if (completedDate === today && (s === "verified" || s === "completed")) completedToday++;

      if (s === "pending" || s === "assigned") pendingMounting++;
      if (s === "installed" || s === "mounted") pendingMonitoring++;
      if (s === "photouploaded") verificationPending++;
      // Proof pending = mounted but no photos
      if ((s === "installed" || s === "mounted") && !hasPhotos(a)) proofPending++;
      // Issue detection placeholder - assets stuck > 7 days without progress
      if (s === "assigned" && a.assigned_at) {
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
    { label: "Pending Mounting", value: stats.pendingMounting, icon: Wrench, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
    { label: "Pending Monitoring", value: stats.pendingMonitoring, icon: Eye, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
    { label: "Proof Pending", value: stats.proofPending, icon: Camera, color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10" },
    { label: "Verification Pending", value: stats.verificationPending, icon: ClipboardList, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10" },
    { label: "Completed Today", value: stats.completedToday, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
    { label: "Issues / Overdue", value: stats.issueCount, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
    { label: "Total Tasks", value: stats.total, icon: ClipboardList, color: "text-foreground", bgColor: "bg-muted" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {tiles.map((t) => (
        <Card key={t.label} className="border shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-lg ${t.bgColor} flex items-center justify-center shrink-0`}>
              <t.icon className={`h-4 w-4 ${t.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight truncate">{t.label}</p>
              <p className={`text-lg font-bold leading-tight ${t.value > 0 ? t.color : "text-muted-foreground"}`}>
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
