'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  MapPin, Clock, Calendar, 
  ChevronRight, ArrowLeft, 
  Car, Star, Filter, Search
} from 'lucide-react';
import { MOCK_RIDES } from '@/types/mock-data';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

type RideStatus = 'all' | 'completed' | 'cancelled';

export default function RideHistoryPage() {
  const [filter, setFilter] = useState<RideStatus>('all');

  const filteredRides = MOCK_RIDES.filter(ride => 
    filter === 'all' ? true : ride.status.toLowerCase() === filter
  );

  const stats = {
    total: MOCK_RIDES.length,
    completed: MOCK_RIDES.filter(r => r.status === 'completed').length,
    rating: 4.8
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-6 font-bold flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Chuyến đi</h1>
        </div>
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
          <Search size={20} className="text-slate-400" />
        </div>
      </header>

      {/* Stats Hero */}
      <div className="px-6 py-8">
        <Card variant="elevated" className="bg-brand-500 border-none relative overflow-hidden" padding="lg">
          <div className="relative z-10 text-white flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-brand-100 text-xs font-black uppercase tracking-[0.2em]">Tổng hành trình</p>
              <h2 className="text-4xl font-black tracking-tighter">{stats.total}</h2>
            </div>
            <div className="h-12 w-[1px] bg-white/20" />
            <div className="space-y-1 text-right">
              <p className="text-brand-100 text-xs font-black uppercase tracking-[0.2em]">Đánh giá</p>
              <div className="flex items-center justify-end gap-2">
                <Star size={20} className="fill-white text-white" />
                <h2 className="text-2xl font-black tracking-tighter">{stats.rating}</h2>
              </div>
            </div>
          </div>
          {/* Abstract deco */}
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-black/10 rounded-full blur-3xl" />
        </Card>
      </div>

      {/* Filters */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-[24px] backdrop-blur-sm">
          {(['all', 'completed', 'cancelled'] as RideStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "flex-1 py-2.5 rounded-[18px] text-xs font-black uppercase tracking-wider transition-all",
                filter === s 
                  ? "bg-white text-brand-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {s === 'all' ? 'Tất cả' : s === 'completed' ? 'Thành công' : 'Đã hủy'}
            </button>
          ))}
        </div>
      </div>

      {/* Ride List */}
      <div className="px-6 space-y-6">
        {filteredRides.length > 0 ? (
          filteredRides.map((ride) => (
            <Card key={ride.id} className="group" isHoverable padding="none">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{ride.vehicleType}</h3>
                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(ride.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={ride.status === 'completed' ? 'success' : 'danger'}>
                  {ride.status}
                </Badge>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[7px] top-[10px] bottom-[10px] w-[2px] bg-slate-100" />
                  
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-brand-500 mt-1 shadow-sm" />
                    <p className="text-sm font-bold text-slate-600 line-clamp-1">{ride.pickup.address}</p>
                  </div>
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-4 h-4 rounded-full bg-brand-500 mt-1 shadow-md shadow-brand-200" />
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{ride.dropoff.address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quãng đường</p>
                      <p className="text-sm font-bold text-slate-800">{ride.distance} km</p>
                    </div>
                    <div className="w-[1px] h-6 bg-slate-100" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</p>
                      <p className="text-sm font-bold text-slate-800">{ride.duration} phút</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Thanh toán</p>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(ride.fare.total)}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-4 bg-slate-50/50 flex items-center justify-between group-hover:bg-brand-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={ride.driver?.avatar || ''} alt={ride.driver?.name || 'Driver'} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                  <span className="text-xs font-bold text-slate-600">{ride.driver?.name || 'Driver'}</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 translate-x-0 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Filter size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Không tìm thấy chuyến đi</h3>
              <p className="text-slate-500 font-medium max-w-[240px] mt-1 mx-auto">
                Hãy thử thay đổi bộ lọc để xem các kết quả khác.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setFilter('all')}>Hiện tất cả</Button>
          </div>
        )}
      </div>

      {/* Floating Action Button for Support? */}
      <div className="fixed bottom-10 right-6 z-50">
        <Button size="icon" className="w-14 h-14 bg-slate-800 hover:bg-slate-900 border-4 border-white shadow-2xl">
          <Star size={24} className="text-amber-400 fill-amber-400" />
        </Button>
      </div>
    </div>
  );
}
