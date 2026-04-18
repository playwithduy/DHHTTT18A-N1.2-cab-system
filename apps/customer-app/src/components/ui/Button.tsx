'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-100 disabled:bg-brand-200',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100 disabled:bg-red-200',
      outline: 'bg-transparent border-2 border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    };

    const sizes = {
      sm: 'h-9 px-4 rounded-xl text-xs font-bold',
      md: 'h-11 px-6 rounded-2xl text-sm font-bold',
      lg: 'h-14 px-8 rounded-2xl text-base font-bold',
      xl: 'h-16 px-10 rounded-3xl text-lg font-black w-full uppercase tracking-wider',
      icon: 'h-11 w-11 rounded-full flex items-center justify-center p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all active:scale-95 disabled:pointer-events-none disabled:active:scale-100',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
