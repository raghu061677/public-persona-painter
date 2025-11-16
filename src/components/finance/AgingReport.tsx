import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgingData {
  clientName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export function AgingReport() {
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgingData();
  }, []);

  const loadAgingData = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("client_name, balance_due, due_date, status")
        .neq("status", "Paid");

      if (error) throw error;

      const grouped = new Map<string, AgingData>();

      invoices?.forEach((invoice) => {
        const daysOverdue = differenceInDays(new Date(), new Date(invoice.due_date));
        const clientName = invoice.client_name;

        if (!grouped.has(clientName)) {
          grouped.set(clientName, {
            clientName,
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            over90: 0,
            total: 0,
          });
        }

        const data = grouped.get(clientName)!;

        if (daysOverdue <= 0) {
          data.current += invoice.balance_due;
        } else if (daysOverdue <= 30) {
          data.days30 += invoice.balance_due;
        } else if (daysOverdue <= 60) {
          data.days60 += invoice.balance_due;
        } else if (daysOverdue <= 90) {
          data.days90 += invoice.balance_due;
        } else {
          data.over90 += invoice.balance_due;
        }

        data.total += invoice.balance_due;
      });

      setAgingData(Array.from(grouped.values()));
    } catch (error) {
      console.error("Error loading aging data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading aging report...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable Aging Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">90+ Days</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agingData.map((data) => (
              <TableRow key={data.clientName}>
                <TableCell className="font-medium">{data.clientName}</TableCell>
                <TableCell className="text-right">₹{data.current.toLocaleString()}</TableCell>
                <TableCell className="text-right text-yellow-600">₹{data.days30.toLocaleString()}</TableCell>
                <TableCell className="text-right text-orange-600">₹{data.days60.toLocaleString()}</TableCell>
                <TableCell className="text-right text-red-600">₹{data.days90.toLocaleString()}</TableCell>
                <TableCell className="text-right text-red-700 font-medium">₹{data.over90.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">₹{data.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
