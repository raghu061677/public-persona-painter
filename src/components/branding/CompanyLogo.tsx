/**
 * Reusable company logo component with fallback
 */

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showFallbackIcon?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function CompanyLogo({ 
  logoUrl, 
  companyName = 'Go-Ads 360°',
  className,
  size = 'md',
  showFallbackIcon = true
}: CompanyLogoProps) {
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={companyName}
        className={cn(
          'object-contain rounded',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (showFallbackIcon) {
    return (
      <Building2 
        className={cn(
          'text-primary',
          sizeClasses[size],
          className
        )} 
      />
    );
  }

  return null;
}
