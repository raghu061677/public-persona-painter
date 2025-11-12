import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Activity, Clock, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserActivity {
  id: string;
  username: string;
  email: string;
  last_login: string | null;
  total_actions: number;
  recent_actions: Array<{
    activity_type: string;
    activity_description: string;
    created_at: string;
  }>;
}

export default function UserActivityDashboard() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);

  useEffect(() => {
    loadUserActivities();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadDetailedLogs(selectedUser);
    }
  }, [selectedUser]);

  const loadUserActivities = async () => {
    try {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username");

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Get auth users for email and last sign in
      const { data: authData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      
      const users = authData?.users || [];

      // Get activity logs count and recent actions for each user
      const activitiesData: UserActivity[] = [];
      
      for (const profile of profiles || []) {
        const authUser = users?.find(u => u.id === profile.id);
        
        // Get total actions count
        const { count } = await supabase
          .from("user_activity_logs")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", profile.id);

        // Get recent 5 actions
        const { data: recentActions } = await supabase
          .from("user_activity_logs")
          .select("activity_type, activity_description, created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        activitiesData.push({
          id: profile.id,
          username: profile.username || 'Unknown',
          email: authUser?.email || '',
          last_login: authUser?.last_sign_in_at || null,
          total_actions: count || 0,
          recent_actions: recentActions || [],
        });
      }

      setActivities(activitiesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedLogs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setDetailedLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'default';
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div>Loading activity data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(a => {
                if (!a.last_login) return false;
                const loginDate = new Date(a.last_login);
                const today = new Date();
                return loginDate.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.reduce((sum, a) => sum + a.total_actions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Activity Overview</CardTitle>
          <CardDescription>Last login and recent actions for each user</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Total Actions</TableHead>
                <TableHead>Recent Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow 
                  key={activity.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedUser(activity.id)}
                >
                  <TableCell className="font-medium">{activity.username}</TableCell>
                  <TableCell>{activity.email}</TableCell>
                  <TableCell>
                    {activity.last_login 
                      ? new Date(activity.last_login).toLocaleString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{activity.total_actions}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {activity.recent_actions.slice(0, 3).map((action, idx) => (
                        <Badge 
                          key={idx} 
                          variant={getActivityBadgeColor(action.activity_type)}
                          className="text-xs"
                        >
                          {action.activity_type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Activity Log</CardTitle>
            <CardDescription>
              Showing recent activities for {activities.find(a => a.id === selectedUser)?.username}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActivityBadgeColor(log.activity_type)}>
                        {log.activity_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.activity_description || 'No description'}</TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
