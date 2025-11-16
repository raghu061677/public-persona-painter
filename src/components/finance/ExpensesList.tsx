import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
}

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Paid: "bg-green-500",
      Pending: "bg-yellow-500",
      Overdue: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      printing: "bg-blue-500",
      mounting: "bg-purple-500",
      electricity: "bg-yellow-500",
      maintenance: "bg-orange-500",
      rent: "bg-pink-500",
      other: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expenses</CardTitle>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono text-sm">{expense.id}</TableCell>
                  <TableCell className="font-medium">{expense.vendor_name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(expense.category)}>
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(expense.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">₹{expense.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{expense.gst_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">₹{expense.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(expense.payment_status)}>
                      {expense.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
