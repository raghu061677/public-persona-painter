import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  listing_id: string | null;
  campaign_id: string | null;
  seller_company_id: string;
  buyer_company_id: string;
  transaction_value: number;
  platform_fee_percent: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  seller_company?: { name: string };
  buyer_company?: { name: string };
}

export default function MarketplaceTransactions() {
  const { company } = useCompany();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "sales" | "purchases">("all");

  useEffect(() => {
    if (company?.id) fetchTransactions();
  }, [company?.id]);

  const fetchTransactions = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_transactions")
      .select(`
        *,
        seller_company:companies!marketplace_transactions_seller_company_id_fkey(name),
        buyer_company:companies!marketplace_transactions_buyer_company_id_fkey(name)
      `)
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error);
    } else {
      setTransactions((data || []) as any);
    }
    setLoading(false);
  };

  const filtered = transactions.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (viewMode === "sales" && t.seller_company_id !== company?.id) return false;
    if (viewMode === "purchases" && t.buyer_company_id !== company?.id) return false;
    return true;
  });

  const totalSales = transactions
    .filter((t) => t.seller_company_id === company?.id && t.status === "completed")
    .reduce((s, t) => s + (t.net_amount || 0), 0);
  const totalPurchases = transactions
    .filter((t) => t.buyer_company_id === company?.id && t.status === "completed")
    .reduce((s, t) => s + (t.transaction_value || 0), 0);
  const totalFees = transactions
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + (t.platform_fee || 0), 0);

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      case "refunded": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Marketplace Transactions"
        description="Track all OOH Exchange transaction history and platform fees"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Transactions", value: transactions.length, icon: DollarSign, color: "text-primary" },
          { label: "Sales Revenue", value: `₹${totalSales.toLocaleString("en-IN")}`, icon: ArrowUpRight, color: "text-emerald-600" },
          { label: "Purchases", value: `₹${totalPurchases.toLocaleString("en-IN")}`, icon: ArrowDownRight, color: "text-blue-600" },
          { label: "Platform Fees", value: `₹${totalFees.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.label}
              </div>
              <div className="text-2xl font-bold mt-1">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sales">My Sales</SelectItem>
            <SelectItem value="purchases">My Purchases</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchTransactions}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => {
                  const isSeller = tx.seller_company_id === company?.id;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={isSeller ? "default" : "secondary"}>
                          {isSeller ? "Sale" : "Purchase"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isSeller
                          ? tx.buyer_company?.name || "—"
                          : tx.seller_company?.name || "—"}
                      </TableCell>
                      <TableCell>₹{tx.transaction_value?.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        ₹{tx.platform_fee?.toLocaleString("en-IN")}
                        <span className="text-xs text-muted-foreground ml-1">({tx.platform_fee_percent}%)</span>
                      </TableCell>
                      <TableCell className="font-medium">₹{tx.net_amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(tx.status) as any}>{tx.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
