'use client';

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', ...props }, ref) => {
    const variants = {
      brand: 'bg-brand-100 text-brand-700 border-brand-200',
      success: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-amber-100 text-amber-700 border-amber-200',
      danger: 'bg-red-100 text-red-700 border-red-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-[10px] rounded-lg',
      md: 'px-2.5 py-1 text-[11px] rounded-xl font-bold uppercase tracking-wider',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center border transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
