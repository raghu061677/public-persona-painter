import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

interface HeatmapDay {
  day: string;
  day_status: string;
  campaign_id: string | null;
  client_name: string | null;
}

interface AssetCalendarHeatmapProps {
  assetId: string;
  monthsAhead?: number;
}

export function AssetCalendarHeatmap({ assetId, monthsAhead = 3 }: AssetCalendarHeatmapProps) {
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchHeatmap();
  }, [assetId]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(
        new Date(Date.now() + monthsAhead * 30 * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );

      const { data, error } = await supabase
        .from('media_calendar_heatmap' as any)
        .select('*')
        .eq('asset_id', assetId)
        .gte('day', startDate)
        .lte('day', endDate)
        .order('day', { ascending: true });

      if (error) throw error;
      setHeatmapData((data as any) || []);
    } catch (error: any) {
      console.error('Heatmap error:', error);
      toast({
        title: "Error loading calendar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Availability Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Group by month
  const monthsData: { [key: string]: HeatmapDay[] } = {};
  heatmapData.forEach(day => {
    const month = day.day.substring(0, 7); // YYYY-MM
    if (!monthsData[month]) monthsData[month] = [];
    monthsData[month].push(day);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Calendar ({monthsAhead} months)</CardTitle>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>Booked</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(monthsData).map(([month, days]) => {
          const monthDate = new Date(month + '-01');
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

          return (
            <div key={month}>
              <h4 className="font-semibold mb-2">
                {format(monthDate, 'MMMM yyyy')}
              </h4>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs text-center font-medium p-1">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {/* Calendar days */}
                {allDaysInMonth.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayData = days.find(d => d.day === dateStr);
                  const isBooked = dayData?.day_status === 'Booked';
                  
                  return (
                    <div
                      key={dateStr}
                      className={`
                        aspect-square rounded-sm flex items-center justify-center text-xs
                        ${isBooked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
                        hover:ring-2 hover:ring-primary cursor-pointer transition-all
                      `}
                      title={
                        isBooked && dayData
                          ? `Booked: ${dayData.client_name || 'Unknown'}`
                          : 'Available'
                      }
                    >
                      {format(date, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}