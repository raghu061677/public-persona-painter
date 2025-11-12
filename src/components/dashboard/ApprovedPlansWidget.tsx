import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, ArrowRight, TrendingUp } from "lucide-react";
import { formatDate } from "@/utils/plans";
import { formatCurrency } from "@/utils/mediaAssets";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApprovedPlan {
  id: string;
  plan_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  grand_total: number;
  created_at: string;
}

export function ApprovedPlansWidget() {
  const navigate = useNavigate();
  const [approvedPlans, setApprovedPlans] = useState<ApprovedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedPlans();

    // Real-time subscription
    const channel = supabase
      .channel('approved-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plans',
          filter: 'status=eq.Approved'
        },
        () => {
          fetchApprovedPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovedPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('id, plan_name, client_name, start_date, end_date, grand_total, created_at')
      .eq('status', 'Approved')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setApprovedPlans(data);
    }
    setLoading(false);
  };

  const totalValue = approvedPlans.reduce((sum, plan) => sum + (plan.grand_total || 0), 0);

  return (
    <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Ready to Convert</CardTitle>
              <CardDescription className="text-xs">
                Approved plans awaiting campaign creation
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            {approvedPlans.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total Value */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-muted-foreground">Total Value</span>
          </div>
          <span className="text-lg font-bold text-green-700 dark:text-green-400">
            {formatCurrency(totalValue)}
          </span>
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : approvedPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Rocket className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No approved plans waiting for conversion</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {approvedPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/admin/plans/${plan.id}`)}
                  className="group p-3 rounded-lg border bg-card hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-700 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {plan.plan_name}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {plan.id}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {plan.client_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(plan.start_date)}</span>
                        <span>→</span>
                        <span>{formatDate(plan.end_date)}</span>
                      </div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(plan.grand_total)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* View All Button */}
        {approvedPlans.length > 0 && (
          <Button
            variant="outline"
            className="w-full border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            onClick={() => {
              navigate('/admin/plans');
              // Trigger filter for approved plans
              setTimeout(() => {
                const event = new CustomEvent('filterApprovedPlans');
                window.dispatchEvent(event);
              }, 100);
            }}
          >
            View All Approved Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
