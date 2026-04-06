import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/utils/finance";
import { ClientRiskScore } from "@/hooks/useClientRiskScoring";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";

interface Props {
  scores: ClientRiskScore[];
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const riskConfig = {
  HIGH: { icon: ShieldAlert, color: "text-red-600", badge: "destructive" as const, bg: "bg-red-50 dark:bg-red-950/20" },
  MEDIUM: { icon: Shield, color: "text-amber-600", badge: "outline" as const, bg: "bg-amber-50 dark:bg-amber-950/20" },
  LOW: { icon: ShieldCheck, color: "text-emerald-600", badge: "secondary" as const, bg: "" },
};

export function ClientRiskPanel({ scores, isLoading, onRefresh, isRefreshing }: Props) {
  const topRisks = scores.filter(s => s.riskLevel !== "LOW").slice(0, 10);
  const highCount = scores.filter(s => s.riskLevel === "HIGH").length;
  const medCount = scores.filter(s => s.riskLevel === "MEDIUM").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            Client Risk Scores
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <Badge variant="destructive" className="text-xs">{highCount} High</Badge>
              <Badge variant="outline" className="text-xs">{medCount} Medium</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Computing risk scores...</div>
        ) : topRisks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">All clients are low risk 🎉</div>
        ) : (
          <div className="overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Avg Delay</TableHead>
                  <TableHead className="text-right">Overdue Freq</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Consistency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.map((s) => {
                  const cfg = riskConfig[s.riskLevel];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={s.clientId} className={cfg.bg}>
                      <TableCell className="font-medium max-w-[180px] truncate">{s.clientName}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.badge} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {s.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{s.avgDelayDays}d</TableCell>
                      <TableCell className="text-right">{s.overdueFrequency}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(s.totalOutstanding)}</TableCell>
                      <TableCell className="text-right">
                        <span className={s.paymentConsistencyScore < 50 ? "text-red-600" : s.paymentConsistencyScore < 75 ? "text-amber-600" : "text-emerald-600"}>
                          {s.paymentConsistencyScore}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Small badge for use in tables (collections/ledger) */
export function ClientRiskBadge({ riskLevel }: { riskLevel: "HIGH" | "MEDIUM" | "LOW" | undefined }) {
  if (!riskLevel || riskLevel === "LOW") return null;
  const cfg = riskConfig[riskLevel];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.badge} className="gap-0.5 text-[10px] px-1.5 py-0">
      <Icon className="h-2.5 w-2.5" />
      {riskLevel}
    </Badge>
  );
}
