import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/utils/finance";
import { Bell, BellRing, AlertTriangle, Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ReminderCandidate {
  invoiceId: string;
  invoiceNo: string;
  clientName: string;
  overdueDays: number;
  balanceDue: number;
  reminderType: "soft" | "overdue" | "final" | "promise_broken";
  reason: string;
}

interface Props {
  candidates: ReminderCandidate[];
  isLoading: boolean;
  onExecuteAll: () => void;
  onExecuteSelected: (candidates: ReminderCandidate[]) => void;
  isExecuting: boolean;
}

const typeConfig = {
  soft: { label: "Soft", icon: Bell, color: "text-blue-600", badge: "outline" as const },
  overdue: { label: "Overdue", icon: BellRing, color: "text-amber-600", badge: "outline" as const },
  final: { label: "Final", icon: AlertTriangle, color: "text-red-600", badge: "destructive" as const },
  promise_broken: { label: "Promise Broken", icon: Zap, color: "text-orange-600", badge: "destructive" as const },
};

export function AutoReminderPanel({ candidates, isLoading, onExecuteAll, onExecuteSelected, isExecuting }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Scanning for reminders...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-600" />
            Auto Reminders
            {candidates.length > 0 && (
              <Badge variant="destructive" className="text-xs">{candidates.length} pending</Badge>
            )}
          </CardTitle>
          {candidates.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                onExecuteAll();
                toast.success(`Processing ${candidates.length} auto-reminders...`);
              }}
              disabled={isExecuting}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {isExecuting ? "Processing..." : `Send All (${candidates.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {candidates.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-emerald-500 opacity-50" />
            <p>No pending auto-reminders — all caught up!</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.slice(0, 15).map((c) => {
                  const cfg = typeConfig[c.reminderType];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={`${c.invoiceId}-${c.reminderType}`}>
                      <TableCell>
                        <Badge variant={cfg.badge} className="gap-1 text-[10px]">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">{c.clientName}</TableCell>
                      <TableCell className="text-xs font-mono">{c.invoiceNo}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 font-medium">{c.overdueDays}d</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatINR(c.balanceDue)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.reason}</TableCell>
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
