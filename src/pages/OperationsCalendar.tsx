import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

interface CampaignAsset {
  id: string;
  asset_id: string;
  campaign_id: string;
  location: string;
  status: string;
  assigned_at: string | null;
  campaign_name: string;
  client_name: string;
  mounter_name: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CampaignAsset;
}

export default function OperationsCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();

    // Set up real-time subscription
    const channel = supabase
      .channel("campaign-assets-calendar")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_assets",
        },
        () => {
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          campaigns!inner(campaign_name, client_name, start_date, end_date)
        `)
        .not('assigned_at', 'is', null)
        .order("assigned_at", { ascending: true });

      if (error) throw error;

      // Transform data into calendar events
      const calendarEvents: CalendarEvent[] = (data || []).map((asset: any) => {
        const assignedDate = new Date(asset.assigned_at);
        const endDate = new Date(assignedDate);
        endDate.setHours(assignedDate.getHours() + 2); // 2 hour default duration

        return {
          id: asset.id,
          title: `${asset.asset_id} - ${asset.mounter_name || 'Unassigned'}`,
          start: assignedDate,
          end: endDate,
          resource: {
            id: asset.id,
            asset_id: asset.asset_id,
            campaign_id: asset.campaign_id,
            location: asset.location,
            status: asset.status,
            assigned_at: asset.assigned_at,
            campaign_name: asset.campaigns.campaign_name,
            client_name: asset.campaigns.client_name,
            mounter_name: asset.mounter_name,
          },
        };
      });

      setEvents(calendarEvents);
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch mounting assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventDrop = useCallback(
    async ({ event, start, end }: any) => {
      try {
        const { error } = await supabase
          .from("campaign_assets")
          .update({
            assigned_at: start.toISOString(),
          })
          .eq("id", event.resource.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Mounting schedule updated",
        });

        fetchAssignments();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    []
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: any) => {
      try {
        // Update the assigned_at time
        const { error } = await supabase
          .from("campaign_assets")
          .update({
            assigned_at: start.toISOString(),
          })
          .eq("id", event.resource.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Mounting schedule updated",
        });

        fetchAssignments();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    []
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      navigate(`/admin/campaigns/${event.resource.campaign_id}`);
    },
    [navigate]
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    const { status } = event.resource;
    let backgroundColor = '#3b82f6'; // blue

    switch (status) {
      case 'Verified':
        backgroundColor = '#22c55e'; // green
        break;
      case 'PhotoUploaded':
      case 'Mounted':
        backgroundColor = '#f59e0b'; // amber
        break;
      case 'Assigned':
        backgroundColor = '#8b5cf6'; // purple
        break;
      case 'Pending':
        backgroundColor = '#6b7280'; // gray
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/operations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Operations Schedule</h2>
            <p className="text-muted-foreground">
              Drag and drop to reschedule mounting assignments
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">Status:</span>
            <Badge className="bg-gray-600">Pending</Badge>
            <Badge className="bg-purple-600">Assigned</Badge>
            <Badge className="bg-amber-600">Mounted/Photos Uploaded</Badge>
            <Badge className="bg-green-600">Verified</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Mounting Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          ) : (
            <div className="h-[600px]">
              <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: CalendarEvent) => event.start}
                endAccessor={(event: CalendarEvent) => event.end}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                resizable
                defaultView={Views.WEEK}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                step={30}
                showMultiDayTimes
                defaultDate={new Date()}
                popup
                selectable
                style={{ height: '100%' }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Drag & Drop:</strong> Move assignments to reschedule mounting dates</p>
            <p>• <strong>Resize:</strong> Drag the edges to adjust time allocation</p>
            <p>• <strong>Click:</strong> Click on an event to view campaign details</p>
            <p>• <strong>Views:</strong> Switch between Month, Week, Day, and Agenda views</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
