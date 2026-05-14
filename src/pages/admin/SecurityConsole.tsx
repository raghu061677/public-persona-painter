import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Activity, FileDown, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type AuthEvent = {
  id: string;
  email: string | null;
  event_type: 'login_success' | 'login_failure' | 'signup_success' | 'signup_failure';
  error_reason: string | null;
  user_agent: string | null;
  ip_hint: string | null;
  created_at: string;
};

type Pageview = {
  id: string;
  user_id: string;
  user_email: string | null;
  path: string;
  user_agent: string | null;
  created_at: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const fmtDate = (iso: string) => format(new Date(iso), 'dd/MM/yyyy HH:mm:ss');

export default function SecurityConsole() {
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [emailFilter, setEmailFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [views, setViews] = useState<Pageview[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromTs = new Date(from + 'T00:00:00').toISOString();
    const toTs = new Date(to + 'T23:59:59').toISOString();
    const [evRes, pvRes] = await Promise.all([
      supabase.from('auth_events').select('*').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false }).limit(1000),
      supabase.from('admin_pageviews').select('*').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false }).limit(1000),
    ]);
    setEvents((evRes.data as AuthEvent[]) ?? []);
    setViews((pvRes.data as Pageview[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      (!emailFilter || (e.email ?? '').toLowerCase().includes(emailFilter.toLowerCase())) &&
      (!ipFilter || (e.ip_hint ?? '').includes(ipFilter))
    );
  }, [events, emailFilter, ipFilter]);

  const failedByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === 'login_failure') {
        const day = e.created_at.slice(0, 10);
        map.set(day, (map.get(day) ?? 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  const verifiedByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of views) {
      const day = v.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, new Set());
      map.get(day)!.add(v.user_id);
    }
    return [...map.entries()]
      .map(([day, set]) => ({ day, users: set.size, views: views.filter(v => v.created_at.startsWith(day)).length }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [views]);

  const totalFailed = failedByDay.reduce((s, [, c]) => s + c, 0);
  const totalSuccess = events.filter(e => e.event_type === 'login_success').length;
  const totalVerifiedViews = views.length;
  const uniqueAdmins = new Set(views.map(v => v.user_id)).size;

  const exportCsv = () => {
    const rows = [
      ['Section', 'Timestamp', 'Email/User', 'Type', 'Detail', 'IP', 'User Agent'],
      ...filteredEvents.map(e => ['auth_event', fmtDate(e.created_at), e.email ?? '', e.event_type, e.error_reason ?? '', e.ip_hint ?? '', e.user_agent ?? '']),
      ...views.map(v => ['admin_pageview', fmtDate(v.created_at), v.user_email ?? v.user_id, 'verified_access', v.path, '', v.user_agent ?? '']),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Go-Ads 360° — Security Audit Report', 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(from), 'dd/MM/yyyy')} – ${format(new Date(to), 'dd/MM/yyyy')}`, 14, 21);
    doc.text(`Login successes: ${totalSuccess} | Login failures: ${totalFailed} | Verified admin pageviews: ${totalVerifiedViews} | Unique admins: ${uniqueAdmins}`, 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [['Timestamp', 'Email', 'Event', 'Detail', 'IP']],
      body: filteredEvents.map(e => [fmtDate(e.created_at), e.email ?? '—', e.event_type, e.error_reason ?? '—', e.ip_hint ?? '—']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    autoTable(doc, {
      head: [['Timestamp', 'Admin', 'Path']],
      body: views.map(v => [fmtDate(v.created_at), v.user_email ?? v.user_id.slice(0, 8), v.path]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`security-audit_${from}_to_${to}.pdf`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-primary" /> Security Console
        </h1>
        <p className="text-muted-foreground mt-1">Verified admin access, login attempts, and audit exports.</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About these numbers</AlertTitle>
        <AlertDescription>
          The <strong>Lovable Analytics</strong> "Visitors" count includes every page load — including unauthenticated landings on <code>/</code> and redirects to <code>/auth</code>.
          The numbers below show <strong>verified admin access</strong> only — recorded after a session is authenticated. They will always be lower than raw analytics.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-5">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={load} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportCsv} className="w-full"><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={exportPdf} className="w-full"><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Verified pageviews" value={totalVerifiedViews} hint="Authenticated admin loads" />
        <KpiCard title="Unique admins" value={uniqueAdmins} hint="Distinct logged-in users" />
        <KpiCard title="Login successes" value={totalSuccess} hint="Successful sign-ins" />
        <KpiCard title="Login failures" value={totalFailed} hint="Failed attempts" tone={totalFailed > 5 ? 'warn' : 'ok'} />
      </div>

      <Tabs defaultValue="alerts">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="logs">Auth Logs</TabsTrigger>
          <TabsTrigger value="verified">Verified Access</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Failed login attempts by day</CardTitle>
              <CardDescription>Spikes may indicate credential-stuffing or brute force activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {failedByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">No failed login attempts in this period — your platform is clean.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Failures</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {failedByDay.map(([day, count]) => (
                      <TableRow key={day}>
                        <TableCell>{format(new Date(day), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-mono">{count}</TableCell>
                        <TableCell>
                          {count >= 10 ? <Badge variant="destructive">High</Badge>
                            : count >= 3 ? <Badge className="bg-amber-500">Medium</Badge>
                            : <Badge variant="secondary">Low</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Auth log viewer</CardTitle>
              <CardDescription>Filter by email or IP. Showing up to 1000 most recent events in the selected range.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Filter by email…" value={emailFilter} onChange={e => setEmailFilter(e.target.value)} />
                <Input placeholder="Filter by IP…" value={ipFilter} onChange={e => setIpFilter(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No events match.</TableCell></TableRow>
                    ) : filteredEvents.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{fmtDate(e.created_at)}</TableCell>
                        <TableCell>{e.email ?? '—'}</TableCell>
                        <TableCell>
                          {e.event_type === 'login_success'
                            ? <Badge className="bg-emerald-500">success</Badge>
                            : <Badge variant="destructive">{e.event_type}</Badge>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{e.error_reason ?? '—'}</TableCell>
                        <TableCell>{e.ip_hint ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified admin access</CardTitle>
              <CardDescription>Pageviews recorded after authentication. This is your true admin usage signal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Unique admins</TableHead><TableHead>Pageviews</TableHead></TableRow></TableHeader>
                <TableBody>
                  {verifiedByDay.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No verified pageviews yet — start navigating admin to populate.</TableCell></TableRow>
                  ) : verifiedByDay.map(r => (
                    <TableRow key={r.day}>
                      <TableCell>{format(new Date(r.day), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono">{r.users}</TableCell>
                      <TableCell className="font-mono">{r.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader><CardTitle>How tracking works</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Lovable Analytics (visitors / pageviews)</strong> — counts every browser pageview, including anonymous landings on <code>/</code> and redirects to <code>/auth</code>. Useful for marketing reach but does not represent admin access.</p>
              <p><strong>Verified admin pageviews</strong> — recorded by the <code>AdminAuthGate</code> only after Supabase confirms a valid session. One row per route navigation.</p>
              <p><strong>Auth events</strong> — recorded on the sign-in form for every login attempt (success or failure). Used for the security alerts and audit report.</p>
              <p>Both tables are admin-read-only via Postgres RLS.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ title, value, hint, tone = 'ok' }: { title: string; value: number; hint: string; tone?: 'ok' | 'warn' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className={`text-3xl font-bold mt-1 ${tone === 'warn' ? 'text-destructive' : ''}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}