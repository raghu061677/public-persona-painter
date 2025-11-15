import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImpactScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

export function ImpactScoreBadge({ 
  score, 
  size = 'sm', 
  showIcon = true,
  showLabel = false 
}: ImpactScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: '#2ecc71', text: '#ffffff' };
    if (score >= 60) return { bg: '#f1c40f', text: '#000000' };
    if (score >= 40) return { bg: '#e67e22', text: '#ffffff' };
    return { bg: '#e74c3c', text: '#ffffff' };
  };

  const colors = getScoreColor(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", sizeClasses[size])}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.bg,
      }}
    >
      {showIcon && <Zap className={cn(iconSizes[size], "mr-1")} />}
      {showLabel && <span className="mr-1">Impact:</span>}
      {score}
    </Badge>
  );
}
