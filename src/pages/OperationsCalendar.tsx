import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function OperationsCalendar() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchCampaigns();
  }, [currentMonth]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .or(`start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()}`)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCampaignsForDay = (day: Date) => {
    return campaigns.filter((campaign) => {
      const start = new Date(campaign.start_date);
      const end = new Date(campaign.end_date);
      return day >= start && day <= end;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "InProgress":
        return "bg-green-500";
      case "Planned":
        return "bg-blue-500";
      case "Completed":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/operations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Operations Calendar</h2>
            <p className="text-muted-foreground">Campaign schedules and mounting timelines</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-semibold text-sm p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const dayCampaigns = getCampaignsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Card
                      key={index}
                      className={`min-h-[120px] ${!isCurrentMonth ? "opacity-40" : ""} ${
                        isToday ? "border-primary border-2" : ""
                      }`}
                    >
                      <CardContent className="p-2 space-y-1">
                        <div
                          className={`text-sm font-medium ${
                            isToday ? "text-primary" : ""
                          }`}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {dayCampaigns.slice(0, 2).map((campaign) => (
                            <div
                              key={campaign.id}
                              className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                            >
                              <Badge
                                variant="secondary"
                                className={`w-full justify-start truncate text-xs ${getStatusColor(
                                  campaign.status
                                )}`}
                              >
                                {campaign.campaign_name}
                              </Badge>
                            </div>
                          ))}
                          {dayCampaigns.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayCampaigns.length - 2} more
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <span className="text-sm font-medium">Status:</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Planned</Badge>
                  <Badge className="bg-green-500">In Progress</Badge>
                  <Badge className="bg-gray-500">Completed</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign List for Current Month */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No campaigns scheduled this month</p>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{campaign.campaign_name}</div>
                    <div className="text-sm text-muted-foreground">{campaign.client_name}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(campaign.start_date), "MMM d")} -{" "}
                      {format(new Date(campaign.end_date), "MMM d")}
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
