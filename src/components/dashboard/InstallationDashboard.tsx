import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  MapPin, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Camera
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InstallationMetrics {
  totalAssignments: number;
  completedToday: number;
  pendingInstalls: number;
  proofsPending: number;
  assignments: Array<{
    id: string;
    campaign_id: string;
    asset_id: string;
    location: string;
    city: string;
    area: string;
    status: string;
    assigned_at: string;
  }>;
}

export function InstallationDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<InstallationMetrics>({
    totalAssignments: 0,
    completedToday: 0,
    pendingInstalls: 0,
    proofsPending: 0,
    assignments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstallationMetrics();
  }, []);

  const fetchInstallationMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all campaign assets
      const { data: assignments } = await supabase
        .from("campaign_assets")
        .select("*")
        .order("assigned_at", { ascending: false });

      const today = new Date().toDateString();

      const totalAssignments = assignments?.length || 0;
      const completedToday = assignments?.filter(
        a => a.status === "Verified" && 
        new Date(a.completed_at || "").toDateString() === today
      ).length || 0;
      const pendingInstalls = assignments?.filter(
        a => a.status === "Pending" || a.status === "Assigned"
      ).length || 0;
      const proofsPending = assignments?.filter(
        a => a.status === "Mounted" && !a.photos
      ).length || 0;

      setMetrics({
        totalAssignments,
        completedToday,
        pendingInstalls,
        proofsPending,
        assignments: assignments?.slice(0, 10) || [],
      });
    } catch (error) {
      console.error("Error fetching installation metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified": return "bg-green-100 text-green-800 border-green-300";
      case "PhotoUploaded": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Mounted": return "bg-blue-100 text-blue-800 border-blue-300";
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Assigned": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssignments}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Great work!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Installs</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pendingInstalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting installation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proofs Pending</CardTitle>
            <Camera className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.proofsPending}</div>
            <p className="text-xs text-muted-foreground mt-1">Upload photos</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Assignments</CardTitle>
            <Button 
              onClick={() => navigate("/admin/operations")}
              size="sm"
              variant="outline"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No assignments found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {metrics.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/campaigns/${assignment.campaign_id}`)}
                  >
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-sm">
                          {assignment.asset_id}
                        </span>
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assignment.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.area}, {assignment.city}
                      </p>
                      {assignment.status === "Pending" && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Awaiting installation</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/admin/operations")}>
            <Wrench className="mr-2 h-4 w-4" />
            View Operations
          </Button>
          <Button onClick={() => navigate("/admin/mobile-field-app")} variant="outline">
            <Camera className="mr-2 h-4 w-4" />
            Upload Proofs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
