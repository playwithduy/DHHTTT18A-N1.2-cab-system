'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Star, MapPin, Navigation, Wallet, LogOut, TrendingUp,
  Phone, MessageSquare, CheckCircle2, Clock, ChevronUp,
  AlertCircle, BarChart3, User, Shield, Bike, Car, DollarSign, X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDriverStore } from '@/store/driverStore';
import { useRouter } from 'next/navigation';

const OSMMap = dynamic<any>(() => import('@/components/map/OSMMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#1a2a1a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#00b14f] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#00b14f] text-xs font-bold tracking-widest uppercase">Đang tải bản đồ...</p>
      </div>
    </div>
  ),
});

type TripStep = 'idle' | 'incoming' | 'going_pickup' | 'in_trip' | 'completed';
type BottomTab = 'home' | 'earnings' | 'account';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Mock trip data ───────────────────────────────────────────────────────────
const MOCK_TRIP = {
  id: '#CB-8821',
  customer: 'Trần Minh Nhật',
  rating: 4.8,
  trips: 42,
  pickup: 'Landmark 81, 720A Điện Biên Phủ, Vinhomes',
  dropoff: 'Bến Thành, Quận 1, TP.HCM',
  distance: '6.4 km',
  eta: '8 phút',
  fare: '73.500 đ',
  vehicle: 'GrabBike',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ isOnline }: { isOnline: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300',
      isOnline
        ? 'bg-[#00b14f] text-white shadow-lg shadow-[#00b14f]/40'
        : 'bg-[#1e2d1e] text-[#6b8f6b] border border-[#2d3d2d]'
    )}>
      <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-white animate-pulse' : 'bg-[#3d5c3d]')} />
      {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
    </div>
  );
}

function EarningsCard() {
  return (
    <div className="bg-[#111d11] rounded-3xl p-5 border border-[#1e2d1e]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[#6b8f6b] text-[10px] font-black uppercase tracking-widest mb-1">Thu nhập hôm nay</p>
          <p className="text-white text-3xl font-black">1.250.000 <span className="text-[#6b8f6b] text-base font-bold">đ</span></p>
        </div>
        <div className="flex items-center gap-1 bg-[#00b14f]/15 px-3 py-1.5 rounded-full">
          <TrendingUp size={12} className="text-[#00b14f]" />
          <span className="text-[#00b14f] text-[10px] font-black">+15%</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#1e2d1e]">
        {[
          { label: 'Chuyến', value: '14', icon: Car },
          { label: 'Giờ', value: '6.5', icon: Clock },
          { label: 'Đánh giá', value: '4.9 ★', icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="text-center">
            <p className="text-white font-black text-lg leading-none">{value}</p>
            <p className="text-[#6b8f6b] text-[9px] font-bold uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyChart() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const heights = [55, 75, 45, 90, 70, 100, 65];
  const today = 5; // T7

  return (
    <div className="bg-[#111d11] rounded-3xl p-5 border border-[#1e2d1e]">
      <div className="flex items-center justify-between mb-5">
        <p className="text-white font-black text-sm">Tuần này</p>
        <p className="text-[#6b8f6b] text-[10px] font-bold uppercase tracking-wider">7.850.000 đ</p>
      </div>
      <div className="flex items-end gap-2 h-20">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full rounded-xl overflow-hidden relative" style={{ height: '56px' }}>
              <div
                className={cn('absolute bottom-0 w-full rounded-xl transition-all duration-700',
                  i === today ? 'bg-[#00b14f] shadow-[0_0_12px_rgba(0,177,79,0.5)]' : 'bg-[#1e3a1e]'
                )}
                style={{ height: `${h}%` }}
              />
            </div>
            <span className={cn('text-[9px] font-bold', i === today ? 'text-[#00b14f]' : 'text-[#4a6b4a]')}>{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Trip Overlay Panels ──────────────────────────────────────────────────────

function IncomingRequestPanel({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    const t = setInterval(() => setTimer(p => {
      if (p <= 1) { clearInterval(t); onReject(); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [onReject]);

  const circumference = 2 * Math.PI * 24;
  const progress = (timer / 30) * circumference;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }}>
      <div className="bg-[#0e1a0e] rounded-t-[2.5rem] p-6 pb-8 animate-slide-up border-t border-[#1e3a1e]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#00b14f] animate-pulse" />
            <p className="text-[#00b14f] text-[10px] font-black uppercase tracking-widest">Yêu cầu chuyến mới</p>
          </div>
          {/* Countdown Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="absolute -rotate-90" width="56" height="56">
              <circle cx="28" cy="28" r="24" strokeWidth="3" fill="none" stroke="#1e3a1e" />
              <circle
                cx="28" cy="28" r="24" strokeWidth="3" fill="none"
                stroke="#00b14f" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className="text-white font-black text-lg z-10">{timer}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-4 mb-5 bg-[#111d11] rounded-2xl p-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00b14f]/10 flex items-center justify-center text-[#00b14f] font-black text-xl border border-[#00b14f]/20">
            {MOCK_TRIP.customer[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-base">{MOCK_TRIP.customer}</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Star size={11} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[#6b8f6b] text-xs font-bold">{MOCK_TRIP.rating}</span>
              </div>
              <span className="text-[#2d4a2d] text-xs">•</span>
              <span className="text-[#6b8f6b] text-xs font-bold">{MOCK_TRIP.trips} chuyến</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#00b14f] font-black text-lg">{MOCK_TRIP.fare}</p>
            <p className="text-[#6b8f6b] text-[10px]">{MOCK_TRIP.distance}</p>
          </div>
        </div>

        {/* Route */}
        <div className="bg-[#111d11] rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1 gap-1">
              <div className="w-3 h-3 rounded-full bg-[#00b14f] border-2 border-[#00b14f]/30" />
              <div className="w-px h-4 bg-[#1e3a1e]" />
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500/30" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[9px] font-black text-[#6b8f6b] uppercase tracking-widest">Điểm đón</p>
                <p className="text-white font-bold text-xs mt-0.5 leading-tight">{MOCK_TRIP.pickup}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-[#6b8f6b] uppercase tracking-widest">Điểm trả</p>
                <p className="text-white font-bold text-xs mt-0.5 leading-tight">{MOCK_TRIP.dropoff}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onReject}
            className="bg-[#1e2d1e] text-[#6b8f6b] font-black py-5 rounded-2xl text-sm border border-[#2d4a2d] active:scale-95 transition-all"
          >
            TỪ CHỐI
          </button>
          <button
            onClick={onAccept}
            className="bg-[#00b14f] text-white font-black py-5 rounded-2xl text-sm shadow-lg shadow-[#00b14f]/30 active:scale-95 transition-all"
          >
            NHẬN CHUYẾN
          </button>
        </div>
      </div>
    </div>
  );
}

function GoingPickupPanel({ onArrived }: { onArrived: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="bg-[#0e1a0e] rounded-t-[2.5rem] p-5 border-t border-[#1e3a1e] animate-slide-up">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider">Đang đến đón khách</span>
          </div>
          <span className="text-[#6b8f6b] text-xs font-bold">{MOCK_TRIP.eta}</span>
        </div>

        {/* Customer row */}
        <div className="flex items-center gap-4 bg-[#111d11] rounded-2xl p-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#00b14f]/10 flex items-center justify-center text-[#00b14f] font-black text-xl border border-[#00b14f]/20">
            {MOCK_TRIP.customer[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-black">{MOCK_TRIP.customer}</p>
            <p className="text-[#6b8f6b] text-xs mt-0.5 truncate">{MOCK_TRIP.pickup}</p>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-[#1e3a1e] flex items-center justify-center text-[#00b14f] border border-[#2d5a2d] active:scale-90 transition-all">
              <Phone size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#1e3a1e] flex items-center justify-center text-[#00b14f] border border-[#2d5a2d] active:scale-90 transition-all">
              <MessageSquare size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={onArrived}
          className="w-full bg-[#00b14f] text-white font-black py-5 rounded-2xl shadow-lg shadow-[#00b14f]/25 active:scale-95 transition-all text-base"
        >
          ĐÃ ĐẾN NƠI ĐÓN
        </button>
      </div>
    </div>
  );
}

function InTripPanel({ onComplete }: { onComplete: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="bg-[#0e1a0e] rounded-t-[2.5rem] p-5 border-t border-[#1e3a1e] animate-slide-up">
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-[#00b14f]/10 px-3 py-1.5 rounded-full border border-[#00b14f]/20">
            <div className="w-2 h-2 rounded-full bg-[#00b14f] animate-pulse" />
            <span className="text-[#00b14f] text-[10px] font-black uppercase tracking-wider">Đang trong chuyến</span>
          </div>
          <div className="flex items-center gap-2 bg-[#111d11] px-3 py-1.5 rounded-full border border-[#1e3a1e]">
            <Clock size={12} className="text-[#6b8f6b]" />
            <span className="text-white text-xs font-black tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-4 bg-[#111d11] rounded-2xl p-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
            <MapPin size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-[#6b8f6b] uppercase tracking-widest mb-0.5">Đang đến</p>
            <p className="text-white font-bold text-sm leading-tight">{MOCK_TRIP.dropoff}</p>
          </div>
          <div className="text-right">
            <p className="text-[#00b14f] font-black">{MOCK_TRIP.fare}</p>
            <p className="text-[#6b8f6b] text-[10px]">{MOCK_TRIP.distance}</p>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full bg-[#00b14f] text-white font-black py-5 rounded-2xl shadow-lg shadow-[#00b14f]/25 active:scale-95 transition-all text-base"
        >
          HOÀN THÀNH CHUYẾN ĐI
        </button>
      </div>
    </div>
  );
}

function CompletedScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="absolute inset-0 z-[70] bg-[#0a140a] flex flex-col items-center justify-center p-8">
      {/* Success icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[#00b14f]/20 rounded-full scale-150 animate-ping-slow" />
        <div className="w-28 h-28 bg-[#00b14f] rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-[#00b14f]/40 relative z-10">
          <CheckCircle2 size={56} className="text-white" />
        </div>
      </div>

      <h2 className="text-white text-3xl font-black mb-2 tracking-tight">Hoàn thành!</h2>
      <p className="text-[#6b8f6b] text-sm font-medium mb-8 text-center">Chuyến đi kết thúc thành công.</p>

      {/* Earnings */}
      <div className="w-full bg-[#0e1a0e] rounded-3xl p-6 mb-6 border border-[#1e3a1e]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00b14f]/10 flex items-center justify-center border border-[#00b14f]/20">
              <DollarSign size={18} className="text-[#00b14f]" />
            </div>
            <div>
              <p className="text-[#6b8f6b] text-[10px] font-black uppercase tracking-widest">Thu nhập chuyến</p>
              <p className="text-white font-black text-2xl">{MOCK_TRIP.fare}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#1e3a1e]">
          {[
            { label: 'Quãng đường', value: MOCK_TRIP.distance },
            { label: 'Mã chuyến', value: MOCK_TRIP.id },
            { label: 'ETA ban đầu', value: MOCK_TRIP.eta },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-white font-bold text-xs">{value}</p>
              <p className="text-[#4a6b4a] text-[9px] font-bold uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rating prompt */}
      <div className="w-full bg-[#0e1a0e] rounded-3xl p-5 mb-6 border border-[#1e3a1e] text-center">
        <p className="text-[#6b8f6b] text-[10px] uppercase tracking-widest font-bold mb-3">Khách hàng đánh giá bạn</p>
        <div className="flex justify-center gap-2 mb-2">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={24} className={cn(i <= 5 ? 'text-yellow-400 fill-yellow-400' : 'text-[#2d4a2d]')} />
          ))}
        </div>
        <p className="text-white font-black text-lg">5.0 / 5 ★</p>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#00b14f] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#00b14f]/25 active:scale-95 transition-all text-base"
      >
        TIẾP TỤC NHẬN CHUYẾN
      </button>
    </div>
  );
}

// ─── Main Home View ───────────────────────────────────────────────────────────

function HomeTab({
  isOnline, user, tripStep,
  onToggleOnline, onAccept, onReject, onArrived, onComplete, onContinue
}: {
  isOnline: boolean;
  user: any;
  tripStep: TripStep;
  onToggleOnline: () => void;
  onAccept: () => void;
  onReject: () => void;
  onArrived: () => void;
  onComplete: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map fills entire area - isolation: isolate contains Leaflet's z-indexes */}
      <div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
        <OSMMap driverLocation={isOnline ? { lat: 10.7769, lng: 106.7009 } : undefined} />
      </div>

      {/* Top bar - z-[500] to be above Leaflet's internal z-index 400 */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-10" style={{ zIndex: 500 }}>
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleOnline}
            className={cn(
              'flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all duration-300 active:scale-95',
              isOnline
                ? 'bg-[#00b14f] text-white shadow-[#00b14f]/50'
                : 'bg-[#0a140a]/90 backdrop-blur-md text-white border border-[#1e3a1e]'
            )}
          >
            <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', isOnline ? 'bg-white animate-pulse' : 'bg-[#3d5c3d]')} />
            {isOnline ? 'ĐANG NHẬN CHUYẾN' : 'NGOẠI TUYẾN'}
          </button>
          <div className="flex items-center gap-2 bg-[#0a140a]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#1e3a1e]">
            <div className="w-8 h-8 rounded-full bg-[#00b14f]/20 flex items-center justify-center border border-[#00b14f]/30">
              <span className="text-[#00b14f] font-black text-sm">{user?.name?.[0] || 'D'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xs font-bold">4.9</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline overlay */}
      {!isOnline && tripStep === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 450 }}>
          <div className="bg-[#0a140a]/80 backdrop-blur-md rounded-3xl px-8 py-6 text-center border border-[#1e3a1e]">
            <div className="w-14 h-14 rounded-full bg-[#1e3a1e] flex items-center justify-center mx-auto mb-3">
              <Zap size={24} className="text-[#6b8f6b]" />
            </div>
            <p className="text-white font-black text-base mb-1">Bạn đang ngoại tuyến</p>
            <p className="text-[#6b8f6b] text-xs">Bấm nút bên trên để bắt đầu</p>
          </div>
        </div>
      )}

      {/* Idle searching indicator */}
      {isOnline && tripStep === 'idle' && (
        <div className="absolute bottom-[170px] left-4 right-4 pointer-events-none" style={{ zIndex: 500 }}>
          <div className="bg-[#0a140a]/85 backdrop-blur-md rounded-2xl p-4 border border-[#1e3a1e] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00b14f]/10 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-[#00b14f] animate-pulse" />
            </div>
            <p className="text-[#6b8f6b] text-xs font-bold">Đang tìm kiếm chuyến đi gần bạn...</p>
          </div>
        </div>
      )}

      {/* Trip Overlay Panels */}

      {tripStep === 'incoming' && (
        <IncomingRequestPanel onAccept={onAccept} onReject={onReject} />
      )}
      {tripStep === 'going_pickup' && (
        <GoingPickupPanel onArrived={onArrived} />
      )}
      {tripStep === 'in_trip' && (
        <InTripPanel onComplete={onComplete} />
      )}
      {tripStep === 'completed' && (
        <CompletedScreen onContinue={onContinue} />
      )}
    </div>
  );
}

function EarningsTab() {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-28 space-y-4">
      <h2 className="text-white font-black text-2xl px-1">Thu nhập</h2>
      <EarningsCard />
      <WeeklyChart />

      {/* Trip history */}
      <div className="bg-[#111d11] rounded-3xl p-5 border border-[#1e2d1e]">
        <p className="text-white font-black text-sm mb-4">Chuyến gần đây</p>
        {[
          { id: '#CB-8820', from: 'Q.Bình Thạnh', to: 'Q.1', fare: '45.000đ', time: '14:25' },
          { id: '#CB-8819', from: 'Q.3', to: 'Q.Tân Bình', fare: '62.000đ', time: '13:10' },
          { id: '#CB-8818', from: 'Q.Phú Nhuận', to: 'Q.Gò Vấp', fare: '38.000đ', time: '11:52' },
        ].map(trip => (
          <div key={trip.id} className="flex items-center gap-4 py-3 border-b border-[#1e3a1e] last:border-0">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a1e] flex items-center justify-center">
              <Car size={18} className="text-[#00b14f]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{trip.from} → {trip.to}</p>
              <p className="text-[#6b8f6b] text-[10px] font-bold mt-0.5">{trip.id} • {trip.time}</p>
            </div>
            <p className="text-[#00b14f] font-black text-sm">{trip.fare}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountTab({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-28">
      {/* Profile header */}
      <div className="relative px-4 pt-10 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00b14f]/10 to-transparent" />
        <div className="relative text-center">
          <div className="w-24 h-24 rounded-[2rem] bg-[#00b14f]/10 border-2 border-[#00b14f]/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-[#00b14f] font-black text-4xl">{user?.name?.[0] || 'D'}</span>
          </div>
          <h2 className="text-white font-black text-xl uppercase tracking-tight">{user?.name || 'Tài Xế CabGo'}</h2>
          <p className="text-[#6b8f6b] text-sm mt-1">{user?.email}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <span className="text-white font-bold text-sm">4.9</span>
            <span className="text-[#6b8f6b] text-xs">• 1,250 chuyến</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-3">
        {/* Stats */}
        <div className="bg-[#111d11] rounded-3xl p-5 border border-[#1e2d1e] grid grid-cols-3 gap-4">
          {[
            { v: '6 tháng', l: 'Gia nhập' },
            { v: '98%', l: 'Tỉ lệ chấp nhận' },
            { v: '142h', l: 'Tổng giờ lái' },
          ].map(({ v, l }) => (
            <div key={l} className="text-center">
              <p className="text-white font-black text-lg">{v}</p>
              <p className="text-[#6b8f6b] text-[9px] font-bold uppercase tracking-wider mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Menu items */}
        {[
          { label: 'Tài khoản ngân hàng', icon: Wallet },
          { label: 'Hỗ trợ & Phản hồi', icon: MessageSquare },
          { label: 'Trung tâm an toàn', icon: Shield },
        ].map(({ label, icon: Icon }) => (
          <button key={label} className="w-full bg-[#111d11] rounded-2xl p-4 border border-[#1e2d1e] flex items-center gap-4 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a1e] flex items-center justify-center text-[#00b14f]">
              <Icon size={18} />
            </div>
            <p className="text-white font-bold text-sm">{label}</p>
            <ChevronUp size={16} className="text-[#6b8f6b] ml-auto rotate-90" />
          </button>
        ))}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center justify-center gap-3 active:scale-95 transition-all mt-2"
        >
          <LogOut size={18} className="text-red-400" />
          <span className="text-red-400 font-black text-sm uppercase tracking-wider">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function DriverHomePage() {
  const { user, isAuthenticated, isLoading, initialize, isOnline, setOnline } = useDriverStore();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [tripStep, setTripStep] = useState<TripStep>('idle');
  const [activeTab, setActiveTab] = useState<BottomTab>('home');

  useEffect(() => {
    setHasMounted(true);
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (hasMounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasMounted, isLoading, isAuthenticated, router]);

  // Simulate incoming request after going online
  useEffect(() => {
    if (!isOnline || tripStep !== 'idle') return;
    const timer = setTimeout(() => setTripStep('incoming'), 12000);
    return () => clearTimeout(timer);
  }, [isOnline, tripStep]);

  // Keep hooks ABOVE any early returns
  const handleToggleOnline = useCallback(() => {
    setOnline(!isOnline);
    setTripStep('idle');
  }, [isOnline, setOnline]);

  const handleLogout = useCallback(() => {
    useDriverStore.getState().logout();
    router.push('/login');
  }, [router]);

  const TABS: { id: BottomTab; label: string; icon: typeof User }[] = [
    { id: 'home', label: 'Trang chủ', icon: Bike },
    { id: 'earnings', label: 'Thu nhập', icon: BarChart3 },
    { id: 'account', label: 'Tài khoản', icon: User },
  ];

  if (!hasMounted || isLoading || !isAuthenticated) {
    return (
      <div className="h-screen bg-[#0a140a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#00b14f] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#00b14f] text-xs font-black uppercase tracking-widest">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050d05] flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="phone-frame">
        <div className="phone-content bg-[#0a140a] relative flex flex-col w-full h-full overflow-hidden">

          {/* Main Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === 'home' && (
              <HomeTab
                isOnline={isOnline}
                user={user}
                tripStep={tripStep}
                onToggleOnline={handleToggleOnline}
                onAccept={() => setTripStep('going_pickup')}
                onReject={() => setTripStep('idle')}
                onArrived={() => setTripStep('in_trip')}
                onComplete={() => setTripStep('completed')}
                onContinue={() => { setTripStep('idle'); }}
              />
            )}
            {activeTab === 'earnings' && <EarningsTab />}
            {activeTab === 'account' && <AccountTab user={user} onLogout={handleLogout} />}
          </div>

          {/* Bottom Navigation */}
          {tripStep !== 'completed' && (
            <div className="absolute bottom-0 left-0 right-0 z-[45] bg-[#0e1a0e]/95 backdrop-blur-xl border-t border-[#1e3a1e] px-6 py-3">
              <div className="flex items-center justify-around">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-4 py-1 rounded-2xl transition-all active:scale-90',
                      activeTab === id ? 'text-[#00b14f]' : 'text-[#4a6b4a]'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      activeTab === id ? 'bg-[#00b14f]/15 border border-[#00b14f]/30' : ''
                    )}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
