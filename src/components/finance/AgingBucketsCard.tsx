import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/utils/finance";
import { Progress } from "@/components/ui/progress";

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  color: string;
}

interface Props {
  buckets: AgingBucket[];
  total: number;
}

export function AgingBucketsCard({ buckets, total }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Aging Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((b) => {
          const pct = total > 0 ? (b.amount / total) * 100 : 0;
          return (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <span className="text-muted-foreground">{b.count} inv · {formatINR(b.amount)}</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
        <div className="pt-2 border-t flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
