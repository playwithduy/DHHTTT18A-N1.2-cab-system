'use client';

import React from 'react';
import { Toaster, toast, ToastOptions } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CustomToaster = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        className: 'bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-50 px-4 py-3 min-w-[300px]',
        style: {
          padding: '12px 16px',
          borderRadius: '20px',
        },
      }}
    />
  );
};

const defaultOptions: ToastOptions = {
  style: {
    borderRadius: '24px',
    background: '#fff',
    color: '#1e293b',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      ...defaultOptions,
      icon: <CheckCircle2 size={20} className="text-green-500" />,
      ...options,
    }),
  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      ...defaultOptions,
      icon: <XCircle size={20} className="text-red-500" />,
      ...options,
    }),
  warning: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...defaultOptions,
      icon: <AlertCircle size={20} className="text-amber-500" />,
      ...options,
    }),
  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...defaultOptions,
      icon: <Info size={20} className="text-blue-500" />,
      ...options,
    }),
  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, {
      ...defaultOptions,
      ...options,
    }),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};

export default showToast;
