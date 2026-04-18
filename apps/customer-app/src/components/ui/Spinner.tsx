'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brand' | 'white' | 'slate';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', variant = 'brand', className }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
  };

  const variants = {
    brand: 'text-brand-500',
    white: 'text-white',
    slate: 'text-slate-400',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin', sizes[size], variants[variant])} />
    </div>
  );
};

export default Spinner;
