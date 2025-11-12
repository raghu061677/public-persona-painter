import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  role: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string | null;
  delegator_username?: string;
  delegate_username?: string;
}

export default function ApprovalDelegation() {
  const { user, roles } = useAuth();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    delegate_id: "",
    role: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    notes: ""
  });

  useEffect(() => {
    fetchDelegations();
    fetchUsers();
  }, [user]);

  const fetchDelegations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("approval_delegations")
      .select("*")
      .or(`delegator_id.eq.${user.id},delegate_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const delegationsWithUsers = await Promise.all(
        data.map(async (del) => {
          const [delegatorProfile, delegateProfile] = await Promise.all([
            supabase.from("profiles").select("username").eq("id", del.delegator_id).single(),
            supabase.from("profiles").select("username").eq("id", del.delegate_id).single()
          ]);
          
          return {
            ...del,
            delegator_username: delegatorProfile.data?.username || "Unknown",
            delegate_username: delegateProfile.data?.username || "Unknown"
          };
        })
      );
      setDelegations(delegationsWithUsers);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .neq("id", user?.id || "");
    
    if (data) setUsers(data);
  };

  const handleCreate = async () => {
    if (!formData.delegate_id || !formData.role || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("approval_delegations").insert({
      delegate_id: formData.delegate_id,
      role: formData.role,
      start_date: formData.start_date,
      end_date: formData.end_date,
      notes: formData.notes || null
    });

    if (error) {
      toast.error("Failed to create delegation");
      console.error(error);
    } else {
      toast.success("Delegation created successfully");
      setShowDialog(false);
      setFormData({
        delegate_id: "",
        role: "",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        notes: ""
      });
      fetchDelegations();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("approval_delegations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete delegation");
    } else {
      toast.success("Delegation removed");
      fetchDelegations();
    }
  };

  const isActive = (delegation: Delegation) => {
    const now = new Date();
    const endDate = new Date(delegation.end_date);
    return delegation.is_active && endDate > now;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approval Delegation</h1>
          <p className="text-muted-foreground mt-2">
            Temporarily assign your approval responsibilities to another user
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Delegation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Approval Delegation</DialogTitle>
              <DialogDescription>
                Assign your approval authority to another user for a specified period
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Delegate To</Label>
                <Select value={formData.delegate_id} onValueChange={(val) => setFormData({...formData, delegate_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Reason for delegation..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Delegation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            My Delegations
          </CardTitle>
          <CardDescription>
            View and manage approval delegations you've created or received
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : delegations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No delegations found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegations.map((del) => (
                  <TableRow key={del.id}>
                    <TableCell className="font-medium">{del.delegator_username}</TableCell>
                    <TableCell>{del.delegate_username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{del.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(del.start_date)} → {formatDate(del.end_date)}
                    </TableCell>
                    <TableCell>
                      {isActive(del) ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Expired</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {del.notes || "-"}
                    </TableCell>
                    <TableCell>
                      {del.delegator_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(del.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
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
