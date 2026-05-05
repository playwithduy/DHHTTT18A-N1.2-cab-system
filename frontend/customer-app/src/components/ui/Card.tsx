'use client';

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isHoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', isHoverable = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-slate-100 shadow-sm',
      elevated: 'bg-white shadow-xl shadow-slate-200/50',
      bordered: 'bg-white border-2 border-slate-100',
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[32px] transition-all overflow-hidden',
          variants[variant],
          paddings[padding],
          isHoverable && 'hover:shadow-lg hover:-translate-y-1 hover:border-brand-200 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
