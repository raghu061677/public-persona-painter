import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle2, Circle, Clock } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface TimelineEvent {
  label: string;
  date: string | null;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ReactNode;
}

interface CampaignTimelineCardProps {
  campaign: any;
  campaignAssets: any[];
}

export function CampaignTimelineCard({ campaign, campaignAssets }: CampaignTimelineCardProps) {
  // Calculate milestones
  const totalAssets = campaignAssets.length;
  const assignedAssets = campaignAssets.filter(a => a.assigned_at).length;
  const mountedAssets = campaignAssets.filter(a => a.status === 'Mounted' || a.status === 'PhotoUploaded' || a.status === 'Verified').length;
  const verifiedAssets = campaignAssets.filter(a => a.status === 'Verified').length;

  const firstAssignedDate = campaignAssets
    .filter(a => a.assigned_at)
    .sort((a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime())[0]?.assigned_at;

  const firstMountedDate = campaignAssets
    .filter(a => a.status === 'Mounted' || a.status === 'PhotoUploaded' || a.status === 'Verified')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]?.created_at;

  const lastVerifiedDate = campaignAssets
    .filter(a => a.status === 'Verified')
    .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())[0]?.completed_at;

  const today = new Date();
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);

  const getEventStatus = (date: string | null, isEndDate?: boolean): 'completed' | 'current' | 'upcoming' => {
    if (!date) return 'upcoming';
    const eventDate = new Date(date);
    if (isEndDate) {
      return today >= eventDate ? 'completed' : today >= startDate ? 'current' : 'upcoming';
    }
    return today >= eventDate ? 'completed' : 'upcoming';
  };

  const events: TimelineEvent[] = [
    {
      label: 'Campaign Start',
      date: campaign.start_date,
      status: getEventStatus(campaign.start_date),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: `Assets Assigned (${assignedAssets}/${totalAssets})`,
      date: firstAssignedDate || null,
      status: assignedAssets > 0 ? 'completed' : 'upcoming',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: `Mounting Started (${mountedAssets}/${totalAssets})`,
      date: firstMountedDate || null,
      status: mountedAssets > 0 ? 'completed' : 'upcoming',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: `Assets Verified (${verifiedAssets}/${totalAssets})`,
      date: lastVerifiedDate || null,
      status: verifiedAssets === totalAssets ? 'completed' : verifiedAssets > 0 ? 'current' : 'upcoming',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: 'Campaign End',
      date: campaign.end_date,
      status: getEventStatus(campaign.end_date, true),
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  const completedEvents = events.filter(e => e.status === 'completed').length;
  const progress = (completedEvents / events.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Campaign Timeline</CardTitle>
          <Badge variant="outline" className="font-normal">
            {completedEvents}/{events.length} Milestones
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Timeline */}
        <div className="relative space-y-6">
          {/* Vertical Line */}
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />

          {events.map((event, index) => (
            <div key={index} className="relative flex items-start gap-4">
              {/* Icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  event.status === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : event.status === 'current'
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                {event.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : event.status === 'current' ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <p
                    className={`font-medium ${
                      event.status === 'completed'
                        ? 'text-foreground'
                        : event.status === 'current'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {event.label}
                  </p>
                  {event.status === 'completed' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      Completed
                    </Badge>
                  )}
                  {event.status === 'current' && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                      In Progress
                    </Badge>
                  )}
                </div>
                {event.date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(event.date)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
