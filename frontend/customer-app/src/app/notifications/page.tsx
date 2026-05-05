'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  ArrowLeft, Bell, Calendar, 
  MapPin, CreditCard, Tag, 
  Info, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { MOCK_NOTIFICATIONS } from '@/types/mock-data';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'ride_update': return <MapPin className="text-blue-500" size={18} />;
      case 'payment': return <CreditCard className="text-green-500" size={18} />;
      case 'promotion': return <Tag className="text-amber-500" size={18} />;
      case 'system': return <Info className="text-slate-500" size={18} />;
      default: return <Bell className="text-slate-500" size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-6 font-bold flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Thông báo</h1>
        </div>
        <button className="text-sm font-bold text-brand-500 active:opacity-70">
          Đọc tất cả
        </button>
      </header>

      <div className="px-6 py-8 space-y-6">
        {MOCK_NOTIFICATIONS.length > 0 ? (
          <div className="space-y-4">
            {MOCK_NOTIFICATIONS.map((notification) => (
              <Card 
                key={notification.id} 
                className={notification.read ? 'opacity-80' : 'border-l-4 border-brand-500 shadow-md'}
                padding="sm"
                isHoverable
              >
                <div className="flex gap-4">
                  <div className="mt-1 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 leading-tight">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      {notification.message}
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Calendar size={12} />
                      {formatDate(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Bell size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Không có thông báo mới</h3>
              <p className="text-slate-500 font-medium max-w-[240px] mt-1 mx-auto">
                Chúng tôi sẽ thông báo cho bạn khi có tin nhắn hoặc cập nhật mới.
              </p>
            </div>
            <Link href="/">
              <Button variant="secondary">Quay lại trang chủ</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
