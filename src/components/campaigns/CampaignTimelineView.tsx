import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Camera,
  MapPin,
  DollarSign,
  PlayCircle,
  Calendar
} from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  event_title: string;
  event_description: string | null;
  event_time: string;
  metadata: any;
}

interface CampaignTimelineViewProps {
  campaignId: string;
  isPublicView?: boolean;
}

const eventTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  draft_created: { icon: FileText, color: "text-gray-600", bgColor: "bg-gray-100" },
  plan_approved: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  upcoming: { icon: Calendar, color: "text-blue-600", bgColor: "bg-blue-100" },
  running: { icon: PlayCircle, color: "text-green-600", bgColor: "bg-green-100" },
  qr_verified: { icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-100" },
  photo_uploaded: { icon: Camera, color: "text-blue-600", bgColor: "bg-blue-100" },
  operations_completed: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  qa_verified: { icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  completed: { icon: CheckCircle2, color: "text-gray-600", bgColor: "bg-gray-100" },
  invoice_created: { icon: DollarSign, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  payment_received: { icon: DollarSign, color: "text-green-600", bgColor: "bg-green-100" },
};

export function CampaignTimelineView({ campaignId, isPublicView = false }: CampaignTimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [campaignId]);

  const fetchTimeline = async () => {
    try {
      let query = supabase
        .from('campaign_timeline')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('event_time', { ascending: false });

      // Filter events for public view
      if (isPublicView) {
        query = query.in('event_type', [
          'qr_verified',
          'photo_uploaded',
          'operations_completed',
          'completed',
          'invoice_created',
          'payment_received',
        ]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          {events.map((event, index) => {
            const config = eventTypeConfig[event.event_type] || {
              icon: Clock,
              color: "text-gray-600",
              bgColor: "bg-gray-100",
            };
            const Icon = config.icon;

            return (
              <div key={event.id} className="relative pl-14">
                {/* Icon */}
                <div
                  className={`absolute left-0 w-10 h-10 rounded-full ${config.bgColor} border-2 border-background flex items-center justify-center z-10`}
                >
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-semibold">{event.event_title}</h4>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {format(new Date(event.event_time), "MMM dd, HH:mm")}
                    </Badge>
                  </div>
                  {event.event_description && (
                    <p className="text-sm text-muted-foreground">
                      {event.event_description}
                    </p>
                  )}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {event.metadata.latitude && event.metadata.longitude && (
                        <div>📍 {event.metadata.latitude.toFixed(6)}, {event.metadata.longitude.toFixed(6)}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
