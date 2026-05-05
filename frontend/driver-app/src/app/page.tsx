'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Bell, Star, ShieldCheck, Navigation, Power, 
  TrendingUp, Wallet, User, MessageSquare, ChevronUp, CheckCircle2,
  MapPin, X, Phone
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDriverStore } from '@/store/driverStore';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const { notifications, markNotificationsAsRead } = useDriverStore();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markNotificationsAsRead(); }}
        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 border border-slate-100 relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-ping" />
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Thông báo ({notifications.length})</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">Không có thông báo mới</p>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={`p-4 border-b border-slate-50 ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-slate-800">{n.title}</h4>
                    <span className="text-[10px] text-slate-400">{new Date(n.time || Date.now()).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OSMMap = dynamic<any>(() => import('@/components/map/OSMMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100" />,
});

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function DriverHomePage() {
  const { 
    user, 
    driver, 
    isAuthenticated, 
    isLoading, 
    initialize, 
    isOnline, 
    setOnline, 
    addNotification 
  } = useDriverStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'wallet' | 'account'>('home');
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [rideAccepted, setRideAccepted] = useState<any>(null);
  const declinedRideIds = useRef<Set<string>>(new Set());

  // --- Simulation & Navigation States ---
  const [currentPos, setCurrentPos] = useState({ lat: 10.82, lng: 106.69 });
  const [ridePhase, setRidePhase] = useState<'IDLE' | 'PICKING_UP' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'>('IDLE');
  const [simProgress, setSimProgress] = useState(0);
  const [instruction, setInstruction] = useState<string>('');
  const lastSpokenRef = useRef<string>('');
  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Voice Navigation (TTS) with Translation
  useEffect(() => {
    if (instruction && instruction !== lastSpokenRef.current && typeof window !== 'undefined') {
      let msg = instruction;
      // Simple translation for better UX
      msg = msg.replace(/Head/i, 'Đi hướng')
               .replace(/Turn left/i, 'Rẽ trái')
               .replace(/Turn right/i, 'Rẽ phải')
               .replace(/onto/i, 'vào đường')
               .replace(/at the roundabout/i, 'tại vòng xuyến')
               .replace(/take the (\d+)(st|nd|rd|th) exit/i, 'đi ra tại lối ra thứ $1')
               .replace(/You have arrived at your destination/i, 'Bạn đã đến điểm đến');

      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current = instruction;
    }
  }, [instruction]);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  // Poll for incoming rides when driver is online
  const [pollPaused, setPollPaused] = useState(false);

  useEffect(() => {
    if (!isOnline || !user) return;
    
    const driverId = user.id || user._id;
    let active = true;

    const poll = async () => {
      if (pollPaused) return;
      try {
        // Only fetch REQUESTED rides for this driver - server filters by status
        const res = await apiFetch(`/bookings?driverId=${driverId}&status=REQUESTED`);
        if (res.success && active) {
          if (res.data?.length > 0) {
            const requested = res.data.find((r: any) =>
              r.status === 'REQUESTED' && !declinedRideIds.current.has(r.id)
            );
            if (requested && !incomingRide && !rideAccepted) {
              console.log('[DRIVER] New ride request found:', requested.id);
              setIncomingRide(requested);
              toast.success('Có chuyến xe mới!');
              addNotification({ title: 'Cuốc xe mới!', message: `Khoảng cách: ${requested.distance_km}km. Loại xe: ${requested.vehicle_type?.toUpperCase()}`, type: 'info' });
            }
          }
          const resAll = await apiFetch(`/bookings?driverId=${driverId}&status=ACCEPTED`);
          if (resAll.success && active && resAll.data?.length > 0) {
            const accepted = resAll.data[0];
            if (accepted && !rideAccepted) {
              setRideAccepted(accepted);
              setIncomingRide(null);
              // Initialize simulation phase if not already set
              setRidePhase(accepted.status === 'ACCEPTED' ? 'PICKING_UP' : 'IN_PROGRESS');
            }
          }
        }
      } catch (err: any) {
        console.error('[DRIVER] Poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => { active = false; clearInterval(interval); };
  }, [isOnline, user, incomingRide, rideAccepted, pollPaused]);

  const handleAcceptRide = useCallback(async () => {
    if (!incomingRide) return;
    try {
      const res = await apiFetch(`/bookings/${incomingRide.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED', driverId: user?.id || user?._id })
      });
      if (res.success) {
        toast.success('Đã nhận chuyến! Đang đến đón khách...');
        const acceptedRide = res.data;
        setRideAccepted(acceptedRide);
        setIncomingRide(null);
        addNotification({ title: 'Đã nhận chuyến', message: `Hãy di chuyển đến ${acceptedRide.pickup_address || 'điểm đón'}`, type: 'success' });
        
        // Start Simulation: PICKING_UP
        setRidePhase('PICKING_UP');
        setSimProgress(0);
      }
    } catch (err: any) {
      toast.error('Lỗi nhận chuyến: ' + (err.message || ''));
    }
  }, [incomingRide, user]);

  // Simulation Logic
  useEffect(() => {
    if (ridePhase === 'IDLE' || !rideAccepted) return;

    const startPos = ridePhase === 'PICKING_UP' ? { lat: 10.82, lng: 106.69 } : { lat: rideAccepted.pickup_lat, lng: rideAccepted.pickup_lng };
    const endPos = ridePhase === 'PICKING_UP' ? { lat: rideAccepted.pickup_lat, lng: rideAccepted.pickup_lng } : { lat: rideAccepted.drop_lat, lng: rideAccepted.drop_lng };
    
    // Total time for simulation: 1:1 real time (60s per minute)
    const duration = ridePhase === 'PICKING_UP' 
      ? (rideAccepted.driver_eta || 2) * 60000 
      : Math.ceil((rideAccepted.distance_km || 1) * 2) * 60000; // Estimate 2 mins per km if no trip_eta

    const startTime = Date.now();

    const updatePosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentLat = startPos.lat + (endPos.lat - startPos.lat) * progress;
      const currentLng = startPos.lng + (endPos.lng - startPos.lng) * progress;
      
      setCurrentPos({ lat: currentLat, lng: currentLng });
      setSimProgress(progress * 100);

      if (progress < 1) {
        simInterval.current = requestAnimationFrame(updatePosition) as any;
      } else {
        if (ridePhase === 'PICKING_UP') {
          setRidePhase('ARRIVED');
          toast('Đã đến điểm đón!', { icon: '📍' });
        } else if (ridePhase === 'IN_PROGRESS') {
          setRidePhase('COMPLETED');
          toast('Đã đến điểm trả khách!', { icon: '🏁' });
        }
      }
    };

    simInterval.current = requestAnimationFrame(updatePosition) as any;

    return () => {
      if (simInterval.current) cancelAnimationFrame(simInterval.current as any);
    };
  }, [ridePhase, rideAccepted]);

  const handleStartRide = useCallback(async () => {
    if (!rideAccepted) return;
    setRidePhase('IN_PROGRESS');
    setSimProgress(0);
    toast.success('Bắt đầu hành trình!');
  }, [rideAccepted]);

  const handleDeclineRide = useCallback(async () => {
    const rideId = incomingRide?.id;
    if (rideId) {
      declinedRideIds.current.add(rideId);
      setPollPaused(true); // pause polling briefly
      // Cancel in DB so it never comes back
      try {
        await apiFetch(`/bookings/${rideId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CANCELLED' })
        });
        console.log('[DRIVER] Booking cancelled in DB:', rideId);
      } catch (e) {
        console.warn('[DRIVER] Could not cancel booking in DB:', e);
      } finally {
        setTimeout(() => setPollPaused(false), 5000); // resume after 5s
      }
    }
    setIncomingRide(null);
    toast('Đã từ chối chuyến xe', { icon: '🚫' });
  }, [incomingRide]);

  const handleCompleteRide = useCallback(async () => {
    if (!rideAccepted) return;
    try {
      const res = await apiFetch(`/bookings/${rideAccepted.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.success) {
        toast.success('Hoàn thành chuyến xe! 🎉');
        addNotification({ title: 'Hoàn thành chuyến đi', message: `Bạn đã hoàn thành cuốc xe. Phí thu: ${rideAccepted.price?.toLocaleString('vi-VN')}đ`, type: 'success' });
        declinedRideIds.current.clear(); // Reset declined list after completing
        setRideAccepted(null);
        setRidePhase('IDLE');
        setCurrentPos({ lat: 10.82, lng: 106.69 }); // Return to base
      }
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message);
    }
  }, [rideAccepted]);

  if (!mounted || isLoading || !isAuthenticated) {
    return (
      <div className="h-full w-full bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden font-sans">
      
      {/* 1. MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <OSMMap 
          driverLocation={isOnline ? currentPos : undefined} 
          pickup={rideAccepted ? { lat: rideAccepted.pickup_lat, lng: rideAccepted.pickup_lng, name: rideAccepted.pickup_address } : undefined}
          dropoff={rideAccepted ? { lat: rideAccepted.drop_lat, lng: rideAccepted.drop_lng, name: rideAccepted.dropoff_address } : undefined}
          onInstruction={setInstruction}
        />
        {!isOnline && <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[5]" />}
      </div>

      {/* 1b. DYNAMIC ISLAND NAVIGATION */}
      <div className="absolute top-3 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
        <div 
          className={cn(
            "bg-black text-white transition-all duration-700 ease-[cubic-bezier(0.18,0.89,0.32,1.28)] overflow-hidden flex items-center pointer-events-auto",
            (ridePhase !== 'IDLE' && ridePhase !== 'COMPLETED' && instruction) 
              ? "w-[90%] h-20 rounded-[28px] px-4 shadow-2xl" 
              : "w-[110px] h-8 rounded-full"
          )}
        >
          {ridePhase !== 'IDLE' && ridePhase !== 'COMPLETED' && instruction ? (
            <div className="flex items-center gap-4 w-full animate-fade-in">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <Navigation size={26} className={cn("text-white", instruction.toLowerCase().includes('left') ? '-rotate-90' : instruction.toLowerCase().includes('right') ? 'rotate-90' : '')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Navigation</p>
                <h4 className="text-[13px] font-bold leading-tight truncate">{instruction}</h4>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/40 uppercase">ETA</span>
                <span className="text-sm font-black text-white">{rideAccepted?.driver_eta || 0}m</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center items-center gap-1.5 h-full">
               <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
               <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP NAVIGATION */}
      <div className="absolute top-12 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="bg-white shadow-md rounded-full py-1.5 px-2 pr-4 flex items-center gap-2 border border-slate-100">
            <div className="w-9 h-9 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center">
              <User size={18} className="text-slate-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">{user?.name?.split(' ').pop() || 'Tài xế'}</span>
              <div className="flex items-center gap-1">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-semibold text-slate-600">{driver?.rating || 4.5}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>

        {isOnline && !incomingRide && !rideAccepted && (
          <div className="mt-4 flex justify-center pointer-events-auto animate-fade-in">
            <div className="bg-[#10b981] text-white px-5 py-2 rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-2 border border-emerald-400">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              <span className="text-xs font-bold tracking-wide">ĐANG TÌM CHUYẾN</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. INCOMING RIDE REQUEST OVERLAY */}
      {incomingRide && (
        <div className="absolute inset-x-0 bottom-0 z-[200] animate-slide-up">
          <div className="bg-white rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.2)] p-5 border-t-4 border-[#FACC15]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-lg font-black text-slate-800">Chuyến xe mới!</h3>
              </div>
              <span className="text-xl font-black text-green-600">{incomingRide.price?.toLocaleString('vi-VN') || '---'}đ</span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Điểm đón</p>
                  <p className="text-sm font-bold text-slate-800">
                    {incomingRide.pickup_address && incomingRide.pickup_address !== 'Vị trí hiện tại'
                      ? incomingRide.pickup_address
                      : `${incomingRide.pickup_lat?.toFixed(5)}, ${incomingRide.pickup_lng?.toFixed(5)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Điểm đến</p>
                  <p className="text-sm font-bold text-slate-800">
                    {incomingRide.dropoff_address || `${incomingRide.drop_lat?.toFixed(5)}, ${incomingRide.drop_lng?.toFixed(5)}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tới điểm đón</span>
                <span className="text-sm font-black text-blue-600">⏱ {incomingRide.driver_eta || '?'} phút</span>
              </div>
              <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Thời gian chuyến</span>
                <span className="text-sm font-black text-slate-700">⌛ ~{Math.ceil((incomingRide.distance_km || 0) * 2)} phút</span>
              </div>
              <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Quãng đường</span>
                <span className="text-sm font-black text-slate-700">📏 {incomingRide.distance_km?.toFixed(1) || '?'} km</span>
              </div>
              <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Loại xe</span>
                <span className="text-sm font-black text-slate-700">🚗 {incomingRide.vehicle_type?.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleDeclineRide}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <X size={18} /> TỪ CHỐI
              </button>
              <button 
                onClick={handleAcceptRide}
                className="flex-[2] py-3.5 bg-[#FACC15] text-slate-900 font-black rounded-xl shadow-lg shadow-yellow-500/30 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> NHẬN CHUYẾN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3b. ACTIVE RIDE OVERLAY */}
      {rideAccepted && !incomingRide && (
        <div className="absolute inset-x-0 bottom-0 z-[200]">
          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-5 border-t-4 border-green-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <h3 className="text-base font-black text-slate-800">
                {ridePhase === 'PICKING_UP' && `Đang đón khách (${Math.round(simProgress)}%)`}
                {ridePhase === 'ARRIVED' && 'Đã đến điểm đón'}
                {ridePhase === 'IN_PROGRESS' && `Đang di chuyển (${Math.round(simProgress)}%)`}
                {ridePhase === 'COMPLETED' && 'Đã đến điểm trả'}
              </h3>
              <span className="ml-auto text-lg font-black text-green-600">{rideAccepted.price?.toLocaleString('vi-VN')}đ</span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
                <MapPin size={16} className="text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-slate-800 truncate">{rideAccepted.pickup_address || 'Điểm đón'}</p>
              </div>
              <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                <MapPin size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-slate-800 truncate">{rideAccepted.dropoff_address || 'Điểm đến'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {ridePhase === 'ARRIVED' ? (
                <button 
                  onClick={handleStartRide}
                  className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <Navigation size={16} /> BẮT ĐẦU CHUYẾN
                </button>
              ) : ridePhase === 'COMPLETED' ? (
                <button 
                  onClick={handleCompleteRide}
                  className="flex-1 py-3 bg-green-500 text-white font-black rounded-xl shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> HOÀN THÀNH
                </button>
              ) : (
                <>
                  <button className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2">
                    <Phone size={16} /> GỌI KHÁCH
                  </button>
                  <div className="flex-[2] py-3 bg-slate-100 text-slate-400 font-black rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                    {ridePhase === 'PICKING_UP' ? 'ĐANG ĐẾN...' : 'ĐANG CHẠY...'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM SHEET CONTENT (when no ride activity) */}
      {!incomingRide && !rideAccepted && (
        <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto">
          
          {!isOnline && (
            <div className="px-4 pb-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Bạn đang ngoại tuyến</h3>
                    <p className="text-xs text-slate-500 mt-1">Bật kết nối để bắt đầu nhận chuyến xe</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <Power size={24} className="text-slate-400" />
                  </div>
                </div>
                <button 
                  onClick={() => setOnline(true)}
                  className="w-full bg-[#FACC15] hover:bg-[#eab308] text-slate-900 font-bold text-lg py-4 rounded-2xl shadow-lg shadow-yellow-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Power size={22} /> BẬT KẾT NỐI
                </button>
              </div>
            </div>
          )}

          {isOnline && activeTab !== 'account' && (
            <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pt-2 pb-0 flex flex-col border border-slate-100">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="px-5 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thu nhập hôm nay</p>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-2xl font-black text-slate-800">{driver?.totalRides ? (driver.totalRides * 75000).toLocaleString('vi-VN') : '0'}</h2>
                    <span className="text-sm font-bold text-slate-500">đ</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Số chuyến</p>
                  <h2 className="text-xl font-black text-slate-800">{driver?.totalRides || 0} <span className="text-sm font-bold text-slate-500">chuyến</span></h2>
                </div>
              </div>
              <div className="px-5 pb-4">
                <button 
                  onClick={() => setOnline(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Power size={18} className="text-red-500" /> TẮT KẾT NỐI
                </button>
              </div>
            </div>
          )}

          {/* Account Tab View */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pt-5 px-5 pb-4 flex flex-col border border-slate-100">
              <button 
                onClick={() => { useDriverStore.getState().logout(); router.push('/login'); }}
                className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                Đăng xuất
              </button>
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="bg-white border-t border-slate-100 px-6 py-3 safe-bottom flex items-center justify-between">
            {[
              { id: 'home' as const, icon: <CheckCircle2 size={24} />, label: 'Nhận chuyến' },
              { id: 'earnings' as const, icon: <TrendingUp size={24} />, label: 'Thu nhập' },
              { id: 'wallet' as const, icon: <Wallet size={24} />, label: 'Ví tiền' },
              { id: 'account' as const, icon: <Menu size={24} />, label: 'Tài khoản' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn("flex flex-col items-center gap-1", activeTab === tab.id ? "text-[#eab308]" : "text-slate-400")}
              >
                {tab.icon}
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
