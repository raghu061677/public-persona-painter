import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatDate } from "@/utils/plans";
import { normalizeCampaignAssetStatus, isCampaignAssetStatusAtLeast } from "@/lib/constants/campaignAssetStatus";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Camera,
  MapPin,
  DollarSign,
  PlayCircle,
  Calendar,
  RefreshCw,
  Archive,
  Receipt,
  Circle
} from "lucide-react";

interface DbTimelineEvent {
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
  campaign_extended: { icon: RefreshCw, color: "text-primary", bgColor: "bg-primary/10" },
  campaign_renewed: { icon: RefreshCw, color: "text-primary", bgColor: "bg-primary/10" },
  photos_archived: { icon: Archive, color: "text-orange-600", bgColor: "bg-orange-100" },
  renewal_invoice_created: { icon: Receipt, color: "text-emerald-600", bgColor: "bg-emerald-100" },
};

export function CampaignTimelineView({ campaignId, isPublicView = false }: CampaignTimelineViewProps) {
  const [dbEvents, setDbEvents] = useState<DbTimelineEvent[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [campaignAssets, setCampaignAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [campaignId]);

  const fetchAll = async () => {
    try {
      // Fetch DB timeline events + campaign + assets in parallel
      const [timelineRes, campaignRes, assetsRes] = await Promise.all([
        supabase
          .from('campaign_timeline')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('event_time', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id, start_date, end_date, status, created_at')
          .eq('id', campaignId)
          .single(),
        supabase
          .from('campaign_assets')
          .select('id, status, assigned_at, created_at, completed_at, is_removed')
          .eq('campaign_id', campaignId)
          .eq('is_removed', false),
      ]);

      if (isPublicView && timelineRes.data) {
        const publicTypes = ['qr_verified', 'photo_uploaded', 'operations_completed', 'completed', 'invoice_created', 'payment_received'];
        setDbEvents((timelineRes.data || []).filter(e => publicTypes.includes(e.event_type)));
      } else {
        setDbEvents(timelineRes.data || []);
      }

      setCampaign(campaignRes.data);
      setCampaignAssets(assetsRes.data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Campaign Timeline</CardTitle></CardHeader>
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

  // If DB has timeline events, render them
  if (dbEvents.length > 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Campaign Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="relative space-y-6">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            {dbEvents.map((event) => {
              const config = eventTypeConfig[event.event_type] || { icon: Clock, color: "text-gray-600", bgColor: "bg-gray-100" };
              const Icon = config.icon;
              return (
                <div key={event.id} className="relative pl-14">
                  <div className={`absolute left-0 w-10 h-10 rounded-full ${config.bgColor} border-2 border-background flex items-center justify-center z-10`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold">{event.event_title}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(event.event_time), "MMM dd, HH:mm")}
                      </Badge>
                    </div>
                    {event.event_description && (
                      <p className="text-sm text-muted-foreground">{event.event_description}</p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        {event.metadata.latitude && event.metadata.longitude && (
                          <div>📍 {event.metadata.latitude.toFixed(6)}, {event.metadata.longitude.toFixed(6)}</div>
                        )}
                        {event.metadata.extension_days && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>+{event.metadata.extension_days} days extension</span>
                          </div>
                        )}
                        {event.metadata.amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>₹{Number(event.metadata.amount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {event.metadata.invoice_id && (
                          <div className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            <span>Invoice: {event.metadata.invoice_id}</span>
                          </div>
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

  // Fallback: compute milestones dynamically from campaign + assets (same logic as CampaignTimelineCard)
  if (!campaign) {
    return (
      <Card>
        <CardHeader><CardTitle>Campaign Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAssets = campaignAssets.length;
  const assignedAssets = campaignAssets.filter(a => a.assigned_at).length;
  const mountedAssets = campaignAssets.filter(a => isCampaignAssetStatusAtLeast(normalizeCampaignAssetStatus(a.status), 'Installed')).length;
  const verifiedAssets = campaignAssets.filter(a => normalizeCampaignAssetStatus(a.status) === 'Verified').length;

  const firstAssignedDate = campaignAssets
    .filter(a => a.assigned_at)
    .sort((a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime())[0]?.assigned_at;
  const firstMountedDate = campaignAssets
    .filter(a => isCampaignAssetStatusAtLeast(normalizeCampaignAssetStatus(a.status), 'Installed'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]?.created_at;
  const lastVerifiedDate = campaignAssets
    .filter(a => normalizeCampaignAssetStatus(a.status) === 'Verified')
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

  const milestones = [
    {
      label: 'Campaign Start',
      date: campaign.start_date,
      status: getEventStatus(campaign.start_date),
    },
    {
      label: `Assets Assigned (${assignedAssets}/${totalAssets})`,
      date: firstAssignedDate || null,
      status: assignedAssets > 0 ? 'completed' as const : 'upcoming' as const,
    },
    {
      label: `Mounting Started (${mountedAssets}/${totalAssets})`,
      date: firstMountedDate || null,
      status: mountedAssets > 0 ? 'completed' as const : 'upcoming' as const,
    },
    {
      label: `Assets Verified (${verifiedAssets}/${totalAssets})`,
      date: lastVerifiedDate || null,
      status: verifiedAssets === totalAssets ? 'completed' as const : verifiedAssets > 0 ? 'current' as const : 'upcoming' as const,
    },
    {
      label: 'Campaign End',
      date: campaign.end_date,
      status: getEventStatus(campaign.end_date, true),
    },
  ];

  const completedMilestones = milestones.filter(e => e.status === 'completed').length;
  const progress = (completedMilestones / milestones.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Campaign Timeline</CardTitle>
          <Badge variant="outline" className="font-normal">
            {completedMilestones}/{milestones.length} Milestones
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="relative space-y-6">
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />
          {milestones.map((event, index) => (
            <div key={index} className="relative flex items-start gap-4">
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
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <p className={`font-medium ${
                    event.status === 'completed'
                      ? 'text-foreground'
                      : event.status === 'current'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  }`}>
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
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(event.date)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
