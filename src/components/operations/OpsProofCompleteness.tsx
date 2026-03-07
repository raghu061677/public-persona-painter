import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const REQUIRED_PROOF_TYPES = [
  { key: "mounting", label: "Mounting" },
  { key: "geotag", label: "Geo-tag" },
  { key: "newspaper", label: "Newspaper" },
  { key: "traffic_1", label: "Traffic 1" },
  { key: "traffic_2", label: "Traffic 2" },
];

interface OpsProofCompletenessProps {
  photos: any;
  photoCount?: number;
  hasGps?: boolean;
  compact?: boolean;
}

export function OpsProofCompleteness({ photos, photoCount, hasGps, compact }: OpsProofCompletenessProps) {
  const uploaded = getUploadedTypes(photos);
  const total = REQUIRED_PROOF_TYPES.length;
  const done = REQUIRED_PROOF_TYPES.filter(t => uploaded.includes(t.key)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "text-xs font-medium",
          pct === 100 ? "text-emerald-600 dark:text-emerald-400" :
          pct > 0 ? "text-amber-600 dark:text-amber-400" :
          "text-muted-foreground"
        )}>
          {done}/{total}
        </span>
        {!hasGps && done > 0 && (
          <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">
            No GPS
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-muted-foreground/20"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{done}/{total}</span>
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1">
        {REQUIRED_PROOF_TYPES.map((type) => {
          const isDone = uploaded.includes(type.key);
          return (
            <Badge
              key={type.key}
              variant={isDone ? "secondary" : "outline"}
              className={cn(
                "text-[9px] gap-0.5",
                isDone
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : "opacity-40"
              )}
            >
              {isDone ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Circle className="h-2.5 w-2.5" />}
              {type.label}
            </Badge>
          );
        })}
      </div>

      {/* GPS warning */}
      {!hasGps && done > 0 && (
        <p className="text-[10px] text-destructive flex items-center gap-1">
          ⚠ GPS coordinates missing from uploaded proofs
        </p>
      )}
    </div>
  );
}

function getUploadedTypes(photos: any): string[] {
  if (!photos) return [];
  let obj = photos;
  if (typeof photos === "string") {
    try { obj = JSON.parse(photos); } catch { return []; }
  }
  if (typeof obj !== "object" || obj === null) return [];
  return Object.keys(obj).filter(k => !!obj[k]);
}
