/**
 * Branded button component that uses company colors
 * Can be used in client portals and public-facing pages
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface BrandedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  themeColor?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export const BrandedButton = forwardRef<HTMLButtonElement, BrandedButtonProps>(
  ({ themeColor, variant = 'primary', className, children, style, ...props }, ref) => {
    const customStyle = themeColor && variant === 'primary' 
      ? {
          backgroundColor: themeColor,
          color: 'white',
          ...style
        }
      : style;

    return (
      <Button
        ref={ref}
        className={cn(
          variant === 'primary' && 'hover:opacity-90',
          className
        )}
        style={customStyle}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

BrandedButton.displayName = 'BrandedButton';
