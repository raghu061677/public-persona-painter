import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  status: "completed" | "in_progress" | "pending" | "delayed";
  type: "milestone" | "delivery" | "approval" | "verification";
}

interface CampaignTimelineProps {
  campaignId: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  status: string;
  events: TimelineEvent[];
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  pending: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  delayed: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function CampaignTimeline({
  campaignName,
  startDate,
  endDate,
  status,
  events,
}: CampaignTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Campaign Timeline</CardTitle>
          <Badge variant="secondary">{status}</Badge>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>Start: {format(new Date(startDate), "MMM dd, yyyy")}</span>
          <span>•</span>
          <span>End: {format(new Date(endDate), "MMM dd, yyyy")}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const config = statusConfig[event.status];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Icon */}
                  <div
                    className={`absolute left-0 w-8 h-8 rounded-full ${config.bgColor} ${config.borderColor} border-2 flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.date), "MMM dd, yyyy 'at' h:mm a")}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
