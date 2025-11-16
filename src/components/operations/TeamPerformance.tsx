import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamPerformanceProps {
  tasks: any[];
  loading: boolean;
}

export function TeamPerformance({ tasks, loading }: TeamPerformanceProps) {
  const teamStats = useMemo(() => {
    const mounterMap = new Map<string, {
      name: string;
      assigned: number;
      completed: number;
      verified: number;
      avgCompletionTime: number;
    }>();

    tasks.forEach(task => {
      if (!task.mounter_name) return;

      const existing = mounterMap.get(task.mounter_name) || {
        name: task.mounter_name,
        assigned: 0,
        completed: 0,
        verified: 0,
        avgCompletionTime: 0,
      };

      existing.assigned++;
      
      if (task.status === 'PhotoUploaded' || task.status === 'Verified') {
        existing.completed++;
      }
      
      if (task.status === 'Verified') {
        existing.verified++;
      }

      // Calculate completion time if available
      if (task.completed_at && task.assigned_at) {
        const days = Math.ceil(
          (new Date(task.completed_at).getTime() - new Date(task.assigned_at).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        existing.avgCompletionTime = 
          (existing.avgCompletionTime * (existing.completed - 1) + days) / existing.completed;
      }

      mounterMap.set(task.mounter_name, existing);
    });

    return Array.from(mounterMap.values())
      .sort((a, b) => b.verified - a.verified);
  }, [tasks]);

  const overallStats = useMemo(() => {
    const total = tasks.length;
    const assigned = tasks.filter(t => t.status === 'Assigned').length;
    const inProgress = tasks.filter(t => t.status === 'Pending' || t.status === 'Mounted').length;
    const completed = tasks.filter(t => t.status === 'PhotoUploaded' || t.status === 'Verified').length;
    const verified = tasks.filter(t => t.status === 'Verified').length;

    return {
      total,
      assigned,
      inProgress,
      completed,
      verified,
      completionRate: total > 0 ? (verified / total) * 100 : 0,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.assigned} assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Active installations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Proof uploaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.verified}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members assigned yet
            </div>
          ) : (
            <div className="space-y-4">
              {teamStats.map((member, index) => (
                <div key={member.name} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </div>
                    
                    <Avatar>
                      <AvatarFallback>
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {member.assigned} assigned
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.completed} completed
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-600">
                          {member.verified} verified
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {member.assigned > 0 
                          ? Math.round((member.verified / member.assigned) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={member.assigned > 0 ? (member.verified / member.assigned) * 100 : 0} 
                    />
                  </div>

                  {member.avgCompletionTime > 0 && (
                    <div className="text-sm text-muted-foreground text-right">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {member.avgCompletionTime.toFixed(1)} days avg
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
