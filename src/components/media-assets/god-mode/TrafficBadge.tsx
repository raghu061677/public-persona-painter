import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { TrafficBand, getTrafficBandColor, getTrafficBandTextColor } from '@/hooks/use-traffic-data';

interface TrafficBadgeProps {
  band: TrafficBand;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function TrafficBadge({ band, size = 'sm', showIcon = true }: TrafficBadgeProps) {
  const bgColor = getTrafficBandColor(band);
  const textColor = getTrafficBandTextColor(band);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={sizeClasses[size]}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: bgColor,
      }}
    >
      {showIcon && <TrendingUp className="h-3 w-3 mr-1" />}
      {band}
    </Badge>
  );
}
