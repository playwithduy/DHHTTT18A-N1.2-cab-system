'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, Car, Bike, Package, Grid,
  ChevronRight, Star, Clock, Bell, Menu, X, User, XCircle, CheckCircle2, Phone
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRideStore, useAuthStore } from '@/store/rideStore';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import LocationSearch from '@/components/LocationSearch';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const { notifications, markNotificationsAsRead } = useRideStore();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markNotificationsAsRead(); }}
        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 relative"
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
                    <span className="text-[10px] text-slate-400">{new Date(n.time || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
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
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" />,
});

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function CustomerHomePage() {
  const { pickup, dropoff, setStep, step, fetchFares, faresMap, availableVehicles, selectedVehicle, setVehicle, isFetchingFares, createBooking, currentRide, resetBooking, setPickup } = useRideStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [isCancelling, setIsCancelling] = useState(false);

  // --- Simulation States (Parallel to Driver) ---
  const [simDriverPos, setSimDriverPos] = useState<{ lat: number, lng: number } | null>(null);
  const [simEta, setSimEta] = useState<number | null>(null);
  const [simPhase, setSimPhase] = useState<'IDLE' | 'PICKING_UP' | 'IN_PROGRESS' | 'COMPLETED'>('IDLE');
  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Get real GPS for pickup on load
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'CabGoApp/1.0' } }
        );
        const data = await res.json();
        const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setPickup({ lat, lng, address });
      } catch {
        setPickup({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    }, () => {/* silently ignore if denied */ }, { timeout: 5000 });
  }, []);

  const handleCancelRide = async () => {
    if (!currentRide?.id) { resetBooking(); setStep('idle'); return; }
    setIsCancelling(true);
    try {
      await apiFetch(`/bookings/${currentRide.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      toast('Đã hủy chuyến xe', { icon: '🚫' });
    } catch {
      toast.error('Không thể hủy, vui lòng thử lại');
    } finally {
      resetBooking();
      setStep('idle');
      setIsCancelling(false);
      setSimPhase('IDLE');
      setSimDriverPos(null);
    }
  };

  // Parallel Simulation Logic for Customer
  useEffect(() => {
    if (!currentRide || (currentRide.status !== 'ACCEPTED' && currentRide.status !== 'IN_PROGRESS' && currentRide.status !== 'COMPLETED')) {
      setSimPhase('IDLE');
      setSimDriverPos(null);
      return;
    }

    const phase = currentRide.status === 'ACCEPTED' ? 'PICKING_UP' : (currentRide.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
    setSimPhase(phase);

    if (phase === 'COMPLETED') {
      setSimDriverPos({ lat: currentRide.drop_lat, lng: currentRide.drop_lng });
      setSimEta(0);
      return;
    }

    const startPos = phase === 'PICKING_UP' ? { lat: 10.82, lng: 106.69 } : { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng };
    const endPos = phase === 'PICKING_UP' ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng } : { lat: currentRide.drop_lat, lng: currentRide.drop_lng };

    const baseEta = phase === 'PICKING_UP' ? (currentRide.driver_eta || 2) : Math.ceil((currentRide.distance_km || 1) * 2);
    const duration = baseEta * 60000; // 1:1 Real time (60 seconds per minute)
    const startTime = Date.now();

    const updateSim = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const lat = startPos.lat + (endPos.lat - startPos.lat) * progress;
      const lng = startPos.lng + (endPos.lng - startPos.lng) * progress;

      setSimDriverPos({ lat, lng });
      setSimEta(Math.max(0, Math.ceil(baseEta * (1 - progress))));

      if (progress < 1) {
        simInterval.current = requestAnimationFrame(updateSim) as any;
      }
    };

    simInterval.current = requestAnimationFrame(updateSim) as any;
    return () => { if (simInterval.current) cancelAnimationFrame(simInterval.current as any); };
  }, [currentRide?.id, currentRide?.status]);

  return (
    <div className="h-full w-full relative bg-white overflow-hidden flex flex-col font-sans">

      {/* 1. Header Area (Solid) */}
      <div className="bg-white px-6 pt-14 pb-4 z-50">
        <div className="flex items-center justify-between mb-6">
          <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
            <Menu size={20} />
          </button>
          <div className="bg-slate-50 px-4 py-2 rounded-full border border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hồ Chí Minh, VN</span>
          </div>
          <NotificationBell />
        </div>

        <div className="mb-8">
          <h1 className="text-slate-900 font-black text-3xl tracking-tighter leading-tight">
            Chào buổi tối, Duy! 👋
          </h1>
          <p className="text-slate-400 text-sm font-medium">Hôm nay bạn muốn đi đâu?</p>
        </div>

        {/* Search Bar - Solid & Integrated */}
        <div
          onClick={() => setStep('selecting')}
          className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary transition-colors shadow-sm"
        >
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-slate-950">
            <Search size={20} />
          </div>
          <span className="text-slate-400 font-bold text-sm">Tìm kiếm điểm đến...</span>
        </div>
      </div>

      {/* 2. Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">

        {/* Quick Services Grid */}
        <div className="grid grid-cols-4 gap-4 mb-10 mt-4">
          {[
            { icon: <Car size={24} />, label: 'Ô tô', color: 'bg-green-500' },
            { icon: <Bike size={24} />, label: 'Xe máy', color: 'bg-yellow-400' },
            { icon: <Package size={24} />, label: 'Giao hàng', color: 'bg-orange-500' },
            { icon: <Grid size={24} />, label: 'Thêm', color: 'bg-slate-100', textColor: 'text-slate-400' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all group-hover:scale-110 shadow-sm",
                item.color,
                item.textColor || 'text-white'
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Promotions Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest">Ưu đãi độc quyền</h3>
            <button className="text-primary font-bold text-[10px] uppercase flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </button>
          </div>

          <div className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt="Promo"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full inline-block mb-3">
                <span className="text-slate-950 font-black text-[8px] uppercase tracking-widest">Mã: CABGO50</span>
              </div>
              <h4 className="text-white font-black text-xl leading-tight">Giảm 50% chuyến đầu</h4>
              <p className="text-white/60 text-[10px] font-bold">Áp dụng cho mọi dịch vụ di chuyển</p>
            </div>
            <div className="absolute top-6 right-6">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <span className="text-white font-black text-[8px] uppercase">NEW</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-10">
          <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { title: '81 Cách Mạng Tháng 8', sub: 'Quận 1, TP.HCM', time: '2 giờ trước' },
              { title: 'Sân bay Tân Sơn Nhất', sub: 'Tân Bình, TP.HCM', time: 'Hôm qua' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-black text-sm">{item.title}</p>
                    <p className="text-slate-400 text-[10px] font-bold">{item.sub}</p>
                  </div>
                </div>
                <span className="text-slate-300 text-[9px] font-bold">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Bottom Navigation (Fixed) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
        <div className="flex items-center justify-around">
          {[
            { id: 'home', icon: <Search size={22} />, label: 'Trang chủ' },
            { id: 'activity', icon: <Clock size={22} />, label: 'Hoạt động' },
            { id: 'explore', icon: <MapPin size={22} />, label: 'Khám phá' },
            { id: 'account', icon: <User size={22} />, label: 'Tài khoản' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn("flex flex-col items-center gap-1 transition-all", activeTab === tab.id ? "text-primary scale-110" : "text-slate-300")}
            >
              {tab.icon}
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Full-screen Location Search Overlay */}
      {step === 'selecting' && (
        <LocationSearch onClose={() => setStep('idle')} />
      )}

      {/* 5. Full-screen Map Layer (Booking Options & Tracking) */}
      {step !== 'idle' && step !== 'selecting' && (
        <div className="absolute inset-0 z-[100] animate-fade-in flex flex-col">
          {/* Map area */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute top-14 left-6 z-[110]">
              <button
                onClick={() => { setStep('idle'); }}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl border border-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <OSMMap
              driverLocation={simDriverPos || undefined}
              pickup={currentRide ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_address } : (pickup ? { lat: pickup.lat, lng: pickup.lng, name: pickup.address } : undefined)}
              dropoff={dropoff ? { lat: dropoff.lat, lng: dropoff.lng, name: dropoff.address } : undefined}
            />
          </div>

          {/* Bottom Sheet — compact, always visible */}
          <div className="bg-white rounded-t-[2rem] px-5 pt-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-[110] flex-shrink-0">
            {/* Pickup & Dropoff mini-summary */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <div className="w-0.5 h-5 bg-slate-200" />
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-slate-900 font-semibold text-xs truncate">{pickup?.address || 'Vị trí của bạn'}</p>
                <div className="h-px bg-slate-100" />
                <p className="text-slate-900 font-semibold text-xs truncate">{dropoff?.address || 'Điểm đến'}</p>
              </div>
            </div>

            {step === 'options' ? (
              <>
                {isFetchingFares ? (
                  <div className="flex flex-col gap-2 mb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 mb-4 max-h-[35vh] overflow-y-auto">
                    {availableVehicles.map((v: any) => {
                      const vName = v.name || (v.type === 'bike' ? 'CabGo Bike' : v.type === 'car' ? 'CabGo Car' : v.type === 'premium' ? 'CabGo Premium' : 'CabGo XL');
                      return (
                        <div
                          key={v.type}
                          onClick={() => setVehicle(v.type)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer",
                            selectedVehicle === v.type ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                              {v.type === 'bike' ? <Bike size={20} className="text-slate-700" /> : <Car size={20} className="text-slate-700" />}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">{vName}</h5>
                              <p className="text-[10px] text-slate-400 font-medium">3-5 phút</p>
                            </div>
                          </div>
                          <p className="font-black text-slate-900 text-sm">{faresMap[v.type] ? faresMap[v.type].toLocaleString('vi-VN') : '---'}<span className="text-[10px] text-slate-400">đ</span></p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => { console.log('[UI] Book button clicked'); createBooking(); }}
                  disabled={isFetchingFares}
                  className="w-full h-14 bg-slate-900 text-white font-black text-base rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  ĐẶT {selectedVehicle.toUpperCase()} NGAY
                </button>
              </>
            ) : step === 'searching' ? (
              <div className="text-center py-5">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Đang tìm tài xế...</h3>
                <p className="text-slate-400 text-sm mt-1 mb-5">Vui lòng đợi trong giây lát</p>
                <button
                  onClick={handleCancelRide}
                  disabled={isCancelling}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  <XCircle size={18} />
                  {isCancelling ? 'Đang hủy...' : 'Hủy chuyến xe'}
                </button>
              </div>
            ) : step === 'driver_found' || step === 'in_trip' ? (
              <div>
                {/* Driver found success banner */}
                <div className="flex items-center gap-3 bg-green-50 rounded-2xl p-3 mb-4 border border-green-200">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={22} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-green-800 text-sm">
                      {simPhase === 'PICKING_UP' && 'Tài xế đang đến 🚗'}
                      {simPhase === 'IN_PROGRESS' && 'Đang trên chuyến 🏁'}
                      {simPhase === 'COMPLETED' && 'Đã đến nơi! 🎉'}
                    </p>
                    <p className="text-green-600 text-xs font-semibold">
                      {simPhase === 'PICKING_UP' && `Dự kiến: ${simEta || 0} phút nữa`}
                      {simPhase === 'IN_PROGRESS' && 'Chúc bạn chuyến đi vui vẻ'}
                      {simPhase === 'COMPLETED' && 'Cảm ơn bạn đã sử dụng dịch vụ'}
                    </p>
                  </div>
                  <span className="text-green-700 font-black text-base">{currentRide?.price?.toLocaleString('vi-VN')}đ</span>
                </div>

                {/* Trip info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                    <p className="text-xs font-semibold text-slate-700 truncate">{currentRide?.pickup_address || pickup?.address || 'Điểm đón'}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                    <p className="text-xs font-semibold text-slate-700 truncate">{currentRide?.dropoff_address || dropoff?.address || 'Điểm đến'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>⏱ ETA: {simEta !== null ? simEta : (currentRide?.driver_eta || '?')} phút</span>
                  <span>📏 {currentRide?.distance_km?.toFixed(1) || '?'} km</span>
                  <span>🚗 {currentRide?.vehicle_type?.toUpperCase()}</span>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">
                    <Phone size={16} /> Gọi tài xế
                  </button>
                  <button
                    onClick={handleCancelRide}
                    disabled={isCancelling}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200 disabled:opacity-50"
                  >
                    <XCircle size={16} /> {isCancelling ? 'Đang hủy...' : 'Hủy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Đang xử lý...</h3>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Account Tab View */}
      {activeTab === 'account' && (
        <div className="absolute bottom-[100px] left-0 right-0 p-4 transition-all duration-500 z-50">
          <div className="bg-white/95 backdrop-blur-3xl shadow-2xl rounded-3xl p-6 border border-white/50 relative overflow-hidden">
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-4">Tài khoản</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <p className="font-bold text-slate-800">{useAuthStore.getState().user?.name || 'Khách hàng'}</p>
                  <p className="text-xs text-slate-500">{useAuthStore.getState().user?.email || 'Chưa đăng nhập'}</p>
                </div>
              </div>
              <button
                onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
                className="w-full bg-red-50 text-red-600 font-bold py-3.5 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
