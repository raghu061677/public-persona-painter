import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnomalyBadge } from "./AnomalyBadge";
import { AlertCircle, Calendar, MapPin } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface UnpaidBill {
  id: string;
  asset_id: string;
  consumer_name: string | null;
  service_number: string | null;
  ero_name: string | null;
  section_name: string | null;
  bill_date: string | null;
  due_date: string | null;
  bill_month: string | null;
  total_due: number | null;
  payment_status: string | null;
  is_anomaly: boolean | null;
  anomaly_type: string | null;
}

export default function UnpaidBillsTable({ bills }: { bills: UnpaidBill[] }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getOverdueDays = (dueDate: string | null) => {
    if (!dueDate) return 0;
    return differenceInDays(new Date(), new Date(dueDate));
  };

  const getOverdueBadge = (dueDate: string | null) => {
    const days = getOverdueDays(dueDate);
    if (days <= 0) return null;
    
    if (days > 30) {
      return <Badge variant="destructive" className="ml-2">Overdue {days}d</Badge>;
    } else if (days > 7) {
      return <Badge variant="outline" className="ml-2 border-orange-500 text-orange-600">Due {days}d ago</Badge>;
    }
    return <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">Due {days}d ago</Badge>;
  };

  if (!bills.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unpaid Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No unpaid bills found.</p>
            <p className="text-xs text-muted-foreground mt-1">All bills are up to date!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by due date (oldest first)
  const sortedBills = [...bills].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Unpaid Bills</span>
          <Badge variant="destructive">{bills.length} Pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Consumer</TableHead>
                <TableHead>Bill Month</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.map((bill) => {
                const isOverdue = bill.due_date ? getOverdueDays(bill.due_date) > 0 : false;
                
                return (
                  <TableRow key={bill.id} className={isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {bill.asset_id}
                        {bill.is_anomaly && (
                          <AnomalyBadge 
                            isAnomaly={true}
                            anomalyType={bill.anomaly_type}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{bill.consumer_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill.service_number || 'No service #'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bill.bill_month ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(bill.bill_month), 'MMM yyyy')}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {bill.due_date ? (
                        <div className="flex items-center">
                          {format(new Date(bill.due_date), 'dd MMM yyyy')}
                          {getOverdueBadge(bill.due_date)}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(bill.total_due || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOverdue ? "destructive" : "outline"}>
                        {bill.payment_status || 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
