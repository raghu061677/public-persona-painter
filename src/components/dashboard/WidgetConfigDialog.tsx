import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface Widget {
  id: string;
  type: string;
  metric: string;
  timeRange: string;
  visualizationType: string;
  title: string;
  config: any;
}

interface WidgetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: Widget | null;
  onSave: (widget: Widget) => void;
}

const METRICS = [
  { value: 'booking_requests', label: 'Booking Requests' },
  { value: 'ai_queries', label: 'AI Queries' },
  { value: 'portal_logins', label: 'Portal Logins' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'vacant_media', label: 'Vacant Media' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'clients', label: 'Clients' },
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

const VISUALIZATION_TYPES = [
  { value: 'kpi', label: 'KPI Card' },
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
];

export function WidgetConfigDialog({ open, onOpenChange, widget, onSave }: WidgetConfigDialogProps) {
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState('booking_requests');
  const [timeRange, setTimeRange] = useState('30d');
  const [visualizationType, setVisualizationType] = useState('kpi');

  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setMetric(widget.metric);
      setTimeRange(widget.timeRange);
      setVisualizationType(widget.visualizationType);
    } else {
      setTitle('');
      setMetric('booking_requests');
      setTimeRange('30d');
      setVisualizationType('kpi');
    }
  }, [widget, open]);

  const handleSave = () => {
    const newWidget: Widget = {
      id: widget?.id || `widget-${Date.now()}`,
      type: 'analytics',
      metric,
      timeRange,
      visualizationType,
      title: title || METRICS.find(m => m.value === metric)?.label || 'Widget',
      config: {}
    };
    onSave(newWidget);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{widget ? 'Edit Widget' : 'Add New Widget'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Widget Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter widget title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metric">Metric</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger id="metric">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeRange">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="timeRange">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(tr => (
                  <SelectItem key={tr.value} value={tr.value}>
                    {tr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visualization">Visualization Type</Label>
            <Select value={visualizationType} onValueChange={setVisualizationType}>
              <SelectTrigger id="visualization">
                <SelectValue placeholder="Select visualization" />
              </SelectTrigger>
              <SelectContent>
                {VISUALIZATION_TYPES.map(vt => (
                  <SelectItem key={vt.value} value={vt.value}>
                    {vt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {widget ? 'Update' : 'Add'} Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
