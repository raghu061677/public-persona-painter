import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsContentWrapper, SectionHeader } from "@/components/settings/zoho-style";
import { format } from "date-fns";

export default function EmailSuppressions() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("bounce");

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_suppressions").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const addSuppression = async () => {
    if (!email) return;
    const { error } = await supabase.from("email_suppressions").insert({ email, reason, is_active: true });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Email suppressed" });
      setShowAdd(false);
      setEmail("");
      fetch();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("email_suppressions").delete().eq("id", id);
    toast({ title: "Suppression removed" });
    fetch();
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader title="Email Suppressions" description="Emails on this list will not receive any outgoing messages. Bounces and complaints are auto-added." />

      <div className="flex justify-end mb-4">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Suppression</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Suppress Email Address</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" /></div>
              <div><Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bounce">Bounce</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addSuppression} className="w-full">Add to Suppression List</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ShieldOff className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No suppressed emails</p>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell><Badge variant="outline">{item.reason}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(item.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsContentWrapper>
  );
}
