import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreditCard, Users, Building2, Megaphone, CheckCircle2, Lock, Sparkles, Crown,
  Calendar, ArrowUpRight, ShieldCheck, RefreshCcw,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALL_MODULES: { id: string; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "KPIs & insights" },
  { id: "media_assets", label: "Media Assets", description: "OOH inventory CRUD" },
  { id: "clients", label: "Clients & Leads", description: "CRM and KYC" },
  { id: "plans", label: "Plan Builder", description: "Quotations & rates" },
  { id: "campaigns", label: "Campaigns", description: "Execution lifecycle" },
  { id: "operations", label: "Operations", description: "Mounting & proofs" },
  { id: "finance", label: "Finance", description: "Invoices & expenses" },
  { id: "reports", label: "Reports", description: "Analytics suite" },
  { id: "ai_assistant", label: "AI Assistant", description: "Natural-language queries" },
  { id: "marketplace", label: "Marketplace", description: "Public asset listing" },
];

interface Tier {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Starter",
    price: "₹0",
    cadence: "forever",
    tagline: "Test drive the platform",
    features: ["Up to 3 users", "10 media assets", "5 campaigns", "Core modules", "Community support"],
    cta: "Current Plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹5,000",
    cadence: "per month",
    tagline: "For growing media businesses",
    highlight: true,
    features: ["Up to 25 users", "Unlimited assets", "Unlimited campaigns", "All modules incl. AI", "Branded portal", "Priority support"],
    cta: "Upgrade to Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    tagline: "White-label & dedicated",
    features: ["Unlimited everything", "White-label & SSO", "Custom integrations", "Dedicated success mgr", "99.9% SLA"],
    cta: "Contact Sales",
  },
];

const formatINR = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

const tierBadge = (tier?: string) => {
  switch (tier) {
    case "pro": return "default";
    case "enterprise": return "destructive";
    default: return "secondary";
  }
};

const usageTone = (pct: number) =>
  pct >= 90 ? "text-destructive" : pct >= 70 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";

function UsageCard({
  icon: Icon, label, used, limit,
}: { icon: any; label: string; used: number; limit: number | null }) {
  const isUnlimited = limit == null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </CardDescription>
          {!isUnlimited && <span className={cn("text-xs font-medium", usageTone(pct))}>{pct}%</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{used}</span>
          <span className="text-sm text-muted-foreground">/ {isUnlimited ? "Unlimited" : limit}</span>
        </div>
        {!isUnlimited && <Progress value={pct} />}
      </CardContent>
    </Card>
  );
}

export default function CompanySubscription() {
  const { subscription, loading: subLoading, refetch } = useSubscription();
  const { company, companyUser } = useCompany();
  const [usage, setUsage] = useState({ users: 0, assets: 0, campaigns: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const isAdmin = companyUser?.role === "admin";

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingExtra(true);
      try {
        const [usersR, assetsR, campaignsR, txR] = await Promise.all([
          supabase.from("company_users").select("*", { count: "exact", head: true })
            .eq("company_id", company.id).eq("status", "active"),
          supabase.from("media_assets").select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase.from("campaigns").select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase.from("transactions").select("*")
            .eq("company_id", company.id).order("created_at", { ascending: false }).limit(20),
        ]);
        if (cancelled) return;
        setUsage({
          users: usersR.count ?? 0,
          assets: assetsR.count ?? 0,
          campaigns: campaignsR.count ?? 0,
        });
        setHistory(txR.data ?? []);
      } catch (e) {
        console.error("subscription page extra fetch failed", e);
      } finally {
        if (!cancelled) setLoadingExtra(false);
      }
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  const handleUpgradeIntent = async (tierId: string) => {
    if (!company?.id) return;
    try {
      await supabase.from("transactions").insert({
        company_id: company.id,
        type: tierId === "enterprise" ? "other" : "subscription",
        amount: 0,
        gst_amount: 0,
        paid_status: "pending",
        notes: `Upgrade request to ${tierId} from /admin/subscription`,
      } as any);
      toast({
        title: "Request received",
        description: tierId === "enterprise"
          ? "Our team will reach out within one business day."
          : "Your upgrade request has been logged. Our billing team will contact you to complete payment.",
      });
    } catch (e: any) {
      toast({ title: "Could not submit request", description: e.message ?? "Try again later", variant: "destructive" });
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!company?.id) return;
    try {
      const { error } = await supabase
        .from("company_subscriptions")
        .update({ auto_renew: false } as any)
        .eq("company_id", company.id)
        .eq("status", "active");
      if (error) throw error;
      toast({ title: "Auto-renew disabled", description: "Your plan will not renew automatically." });
      refetch();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  if (subLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0,1,2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  const tier = subscription?.tier ?? "free";
  const status = subscription?.status ?? "active";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            Subscription & Billing
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your plan, monitor usage, and review billing history for {company?.name ?? "your company"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tierBadge(tier)} className="capitalize text-sm px-3 py-1">
            {tier === "enterprise" && <Crown className="h-3.5 w-3.5 mr-1" />}
            {tier === "pro" && <Sparkles className="h-3.5 w-3.5 mr-1" />}
            {tier} Plan
          </Badge>
          <Badge variant={status === "active" ? "outline" : "destructive"} className="capitalize">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            {status}
          </Badge>
        </div>
      </div>

      {/* Hero / Current plan */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardDescription>Current Plan</CardDescription>
              <CardTitle className="text-2xl mt-1 capitalize">
                {tier} {tier !== "enterprise" && "Tier"}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-3">
              {tier !== "enterprise" && (
                <Button onClick={() => handleUpgradeIntent(tier === "free" ? "pro" : "enterprise")} disabled={!isAdmin}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {tier === "free" ? "Upgrade to Pro" : "Upgrade to Enterprise"}
                </Button>
              )}
              {isAdmin && tier !== "free" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCcw className="h-4 w-4 mr-2" /> Cancel Auto-renew
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable auto-renewal?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your current subscription remains active until the end date. It will not renew automatically.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep auto-renew</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelAutoRenew}>Disable</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Billing</div>
              <div className="font-medium mt-1 capitalize">{(subscription as any)?.billing_cycle ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Amount</div>
              <div className="font-medium mt-1">{formatINR((subscription as any)?.amount)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Renewal
              </div>
              <div className="font-medium mt-1">{formatDate((subscription as any)?.end_date)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Auto-renew</div>
              <div className="font-medium mt-1">{(subscription as any)?.auto_renew === false ? "Off" : "On"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Usage Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <UsageCard icon={Users} label="Active Users" used={usage.users} limit={subscription?.user_limit ?? null} />
          <UsageCard icon={Building2} label="Media Assets" used={usage.assets} limit={subscription?.asset_limit ?? null} />
          <UsageCard icon={Megaphone} label="Campaigns" used={usage.campaigns} limit={subscription?.campaign_limit ?? null} />
        </div>
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Modules</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_MODULES.map((m) => {
                const enabled = subscription?.modules?.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                      enabled ? "bg-card" : "bg-muted/30 opacity-70"
                    )}
                  >
                    {enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{m.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {enabled ? m.description : "Upgrade to unlock"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Compare Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => {
            const isCurrent = t.id === tier;
            return (
              <Card
                key={t.id}
                className={cn(
                  "relative flex flex-col",
                  t.highlight && "border-primary shadow-lg",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {t.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {t.id === "enterprise" && <Crown className="h-5 w-5 text-primary" />}
                    {t.id === "pro" && <Sparkles className="h-5 w-5 text-primary" />}
                    {t.name}
                  </CardTitle>
                  <CardDescription>{t.tagline}</CardDescription>
                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-3xl font-bold">{t.price}</span>
                    <span className="text-sm text-muted-foreground">{t.cadence}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 text-sm flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Separator className="my-4" />
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : t.highlight ? "default" : "secondary"}
                    disabled={isCurrent || !isAdmin}
                    onClick={() => handleUpgradeIntent(t.id)}
                  >
                    {isCurrent ? "Current Plan" : t.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Billing History</h2>
        <Card>
          <CardContent className="pt-6">
            {loadingExtra ? (
              <div className="h-24 bg-muted animate-pulse rounded" />
            ) : history.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No billing transactions yet. Invoices for upgrades and portal fees will appear here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((tx) => {
                    const total = Number(tx.amount ?? 0) + Number(tx.gst_amount ?? 0);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.created_at)}</TableCell>
                        <TableCell className="capitalize">{String(tx.type ?? "").replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(Number(tx.amount ?? 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(Number(tx.gst_amount ?? 0))}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatINR(total)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.paid_status === "paid" ? "default" : tx.paid_status === "failed" ? "destructive" : "secondary"}
                            className="capitalize"
                          >
                            {tx.paid_status ?? "pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
