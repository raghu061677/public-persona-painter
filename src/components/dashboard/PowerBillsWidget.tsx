import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/utils/finance";
import { Zap, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface BillSummary {
  upcomingCount: number;
  upcomingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingBills: Array<{
    id: string;
    asset_id: string;
    bill_amount: number;
    bill_month: string;
    daysUntilDue: number;
  }>;
  overdueBills: Array<{
    id: string;
    asset_id: string;
    bill_amount: number;
    bill_month: string;
    daysPastDue: number;
  }>;
}

export default function PowerBillsWidget() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BillSummary>({
    upcomingCount: 0,
    upcomingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    upcomingBills: [],
    overdueBills: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillsSummary();
  }, []);

  const fetchBillsSummary = async () => {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      // Fetch upcoming bills (due in next 7 days)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('asset_power_bills')
        .select('id, asset_id, bill_amount, bill_month')
        .eq('payment_status', 'Pending')
        .gte('bill_month', today.toISOString().split('T')[0])
        .lte('bill_month', sevenDaysFromNow.toISOString().split('T')[0])
        .order('bill_month', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Fetch overdue bills
      const { data: overdueData, error: overdueError } = await supabase
        .from('asset_power_bills')
        .select('id, asset_id, bill_amount, bill_month')
        .eq('payment_status', 'Pending')
        .lt('bill_month', today.toISOString().split('T')[0])
        .order('bill_month', { ascending: true })
        .limit(5);

      if (overdueError) throw overdueError;

      const upcomingBills = upcomingData?.map(bill => ({
        ...bill,
        bill_amount: Number(bill.bill_amount),
        daysUntilDue: Math.ceil(
          (new Date(bill.bill_month).getTime() - today.getTime()) / (1000 * 3600 * 24)
        ),
      })) || [];

      const overdueBills = overdueData?.map(bill => ({
        ...bill,
        bill_amount: Number(bill.bill_amount),
        daysPastDue: Math.ceil(
          (today.getTime() - new Date(bill.bill_month).getTime()) / (1000 * 3600 * 24)
        ),
      })) || [];

      setSummary({
        upcomingCount: upcomingBills.length,
        upcomingAmount: upcomingBills.reduce((sum, b) => sum + b.bill_amount, 0),
        overdueCount: overdueBills.length,
        overdueAmount: overdueBills.reduce((sum, b) => sum + b.bill_amount, 0),
        upcomingBills,
        overdueBills,
      });
    } catch (error) {
      console.error('Error fetching bills summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Power Bills Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const hasAlerts = summary.upcomingCount > 0 || summary.overdueCount > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Power Bills Overview
          </CardTitle>
          <Button
            onClick={() => navigate('/admin/power-bills')}
            variant="ghost"
            size="sm"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAlerts ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No upcoming or overdue bills</p>
          </div>
        ) : (
          <>
            {/* Overdue Bills Alert */}
            {summary.overdueCount > 0 && (
              <div className="border-l-4 border-destructive bg-destructive/10 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-destructive">Overdue Bills</h3>
                      <Badge variant="destructive">{summary.overdueCount}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total: {formatINR(summary.overdueAmount)}
                    </p>
                    <div className="space-y-1">
                      {summary.overdueBills.map(bill => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-mono">{bill.asset_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-destructive font-medium">
                              {bill.daysPastDue}d overdue
                            </span>
                            <span className="font-semibold">
                              {formatINR(bill.bill_amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Bills */}
            {summary.upcomingCount > 0 && (
              <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4 rounded">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                        Due in Next 7 Days
                      </h3>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {summary.upcomingCount}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total: {formatINR(summary.upcomingAmount)}
                    </p>
                    <div className="space-y-1">
                      {summary.upcomingBills.map(bill => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-mono">{bill.asset_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-700 dark:text-amber-400">
                              {bill.daysUntilDue}d left
                            </span>
                            <span className="font-semibold">
                              {formatINR(bill.bill_amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              {summary.overdueCount > 0 && (
                <Button
                  onClick={() => navigate('/admin/power-bills-bulk-payment')}
                  size="sm"
                  className="flex-1"
                  variant="destructive"
                >
                  Pay Overdue Bills
                </Button>
              )}
              <Button
                onClick={() => navigate('/admin/power-bills-analytics')}
                size="sm"
                className="flex-1"
                variant="outline"
              >
                View Analytics
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
