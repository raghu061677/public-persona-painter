import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User } from "lucide-react";
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

interface Estimation {
  id: string;
  client_name: string;
  estimation_date: string;
  status: string;
  total_amount: number;
  sub_total: number;
  gst_amount: number;
}

export default function SalesOrders() {
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEstimations();
  }, []);

  const loadEstimations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("estimations")
        .select("*")
        .order("estimation_date", { ascending: false });

      if (error) throw error;
      setEstimations(data || []);
    } catch (error: any) {
      console.error("Error loading estimations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load sales orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge variant="outline">Sent</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
        <p className="text-muted-foreground">
          Manage sales orders and quotations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Orders ({estimations.length})
          </CardTitle>
          <CardDescription>
            View and manage all sales orders and estimations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : estimations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No sales orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sales orders will appear here once created
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimations.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-medium">{est.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {est.client_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(est.estimation_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>₹{est.sub_total.toLocaleString()}</TableCell>
                    <TableCell>₹{est.gst_amount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">
                      ₹{est.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(est.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
