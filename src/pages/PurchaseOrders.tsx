import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Expense {
  id: string;
  vendor_name: string;
  category: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  notes: string | null;
}

export default function PurchaseOrders() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load purchase orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground">
          Manage vendor purchase orders and expenses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Orders ({expenses.length})
          </CardTitle>
          <CardDescription>
            Track all vendor orders and expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No purchase orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Vendor orders will appear here once created
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-border/50 rounded-lg">
                  <Table className="min-w-max w-full table-auto whitespace-nowrap">
                    <TableHeader className="bg-muted sticky top-0 z-20">
                      <TableRow>
                        <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">Order ID</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Vendor</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Category</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Date</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">Amount</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">GST</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">Total</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense, index) => (
                        <TableRow 
                          key={expense.id}
                          className={`transition-all duration-150 hover:bg-muted/80 ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                          }`}
                        >
                          <TableCell className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium border-r">{expense.id}</TableCell>
                          <TableCell className="px-4 py-3">{expense.vendor_name}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(expense.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">₹{expense.amount.toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right">₹{expense.gst_amount.toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right font-medium">
                            <div className="flex items-center gap-1 justify-end">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              ₹{expense.total_amount.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">{getStatusBadge(expense.payment_status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
