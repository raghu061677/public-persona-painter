import { useMemo } from "react";
import { FileText, Clock, CheckCircle, Camera, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OpsSummaryBarProps {
  assets: any[];
}

export function OpsSummaryBar({ assets }: OpsSummaryBarProps) {
  const stats = useMemo(() => {
    let pending = 0, installed = 0, proofPending = 0, verified = 0;
    for (const a of assets) {
      const status = a.status || "Pending";
      if (status === "Pending" || status === "Assigned") pending++;
      else if (status === "Mounted" || status === "InProgress") installed++;
      else if (status === "PhotoUploaded") proofPending++;
      else if (status === "Verified" || status === "Completed") verified++;
      else pending++;
    }
    const total = assets.length;
    const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { count: total, pending, installedDone: installed + verified + proofPending, proofPending, verifiedPct };
  }, [assets]);

  const tiles = [
    { label: "Assets Shown", value: String(stats.count), icon: FileText, hint: "Total ops assets matching current filters" },
    { label: "Pending", value: String(stats.count - stats.installedDone), icon: Clock, hint: "Assets with status Pending or Assigned" },
    { label: "Installed / Done", value: String(stats.installedDone), icon: CheckCircle, hint: "Assets Mounted, PhotoUploaded, Verified, or Completed" },
    { label: "Proof Pending", value: String(stats.proofPending), icon: Camera, hint: "Assets with PhotoUploaded awaiting verification" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground truncate">{t.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]"><p className="text-xs">{t.hint}</p></TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm font-semibold truncate">{t.value}</p>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
