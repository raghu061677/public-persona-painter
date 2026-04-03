import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatusCount {
  status: string;
  count: number;
  color: string;
}

interface Props {
  statuses: StatusCount[];
}

export function InvoiceStatusSummary({ statuses }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invoice Status Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {statuses.map((s) => (
            <div key={s.status} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Badge variant="outline" className={s.color}>{s.status}</Badge>
              <span className="text-lg font-bold">{s.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
