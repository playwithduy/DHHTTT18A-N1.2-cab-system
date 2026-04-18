'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, ChevronRight, Star, Phone, MessageCircle,
         Clock, X, CheckCircle2, CreditCard, Wallet, Banknote,
         Search, AlertCircle, ArrowLeft, Zap, Bell, User, Car, 
         Package, Gift, Compass, LogOut, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useRideStore, useAuthStore } from '@/store/rideStore';
import { MOCK_RIDE_OPTIONS } from '@/types/mock-data';
import type { VehicleType, PaymentMethod } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { apiFetch } from '@/lib/api';

// Dynamically import OSMMap to avoid SSR issues with Leaflet
const OSMMap = dynamic<any>(() => import('@/components/map/OSMMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">Đang tải bản đồ...</div>,
});

// ─── Utility ─────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount).replace('₫', 'đ');
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Sub-components ───────────────────────────────────────────

function PulsingDot({ color = 'bg-brand-500' }: { color?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={cn('relative inline-flex rounded-full h-3 w-3', color)} />
    </span>
  );
}

// ─── Bottom Sheet Steps ───────────────────────────────────────

function IdleSheet({ onStart, user }: { onStart: () => void, user: any }) {
  return (
    <div className="bg-white min-h-full w-full">
      {/* Search Header - Xanh SM Style */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium">Chào bạn,</p>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{user?.name || 'Nguyen Van Duy'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <span className="text-amber-500 text-lg leading-none">☀️</span>
              <span className="text-sm font-bold text-slate-600">32°C</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-500 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-white flex-shrink-0">
               <User size={20} />
            </div>
          </div>
        </div>

        {/* Search Bar - Modern Elegant Design */}
        <button
          onClick={onStart}
          className="w-full flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2.5rem] px-6 py-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group transition-all hover:bg-white active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
             <Search size={24} className="text-white" />
          </div>
          <span className="text-slate-400 font-black text-xl flex-1 text-left tracking-tight">Bạn muốn đi đâu?</span>
          <div className="bg-brand-50 text-brand-600 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-1.5 flex-shrink-0 tracking-widest uppercase">
             <Clock size={16} />
             <span>Hẹn giờ</span>
          </div>
        </button>
      </div>

      {/* Service Grid - 8 Icons */}
      <div className="px-5 grid grid-cols-4 gap-y-8 gap-x-2 mt-8 w-full">
        {[
          { icon: <Car size={28} />, label: 'Ô tô', color: 'bg-cyan-50 text-cyan-600', badge: 'NEW' },
          { icon: <Navigation size={28} />, label: 'Liên tỉnh', color: 'bg-blue-50 text-blue-600', badge: 'HOT' },
          { icon: <Zap size={28} />, label: 'Xe máy', color: 'bg-teal-50 text-teal-600' },
          { icon: <Star size={28} />, label: 'Hội viên', color: 'bg-amber-50 text-amber-600' },
          { icon: <CheckCircle2 size={28} />, label: 'Đồ ăn', color: 'bg-orange-50 text-orange-600' },
          { icon: <Package size={28} />, label: 'Giao hàng', color: 'bg-indigo-50 text-indigo-600' },
          { icon: <Gift size={28} />, label: 'Quà tặng', color: 'bg-rose-50 text-rose-600' },
          { icon: <Compass size={28} />, label: 'VinBus', color: 'bg-emerald-50 text-emerald-600' },
        ].map((item, idx) => (
          <button key={idx} onClick={onStart} className="flex flex-col items-center gap-2 group relative">
            <div className={cn('w-16 h-16 rounded-3xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm', item.color)}>
              {item.icon}
            </div>
            <span className="text-[10px] font-black text-slate-700 text-center leading-tight">{item.label}</span>
            {item.badge && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm animate-pulse">
                 {item.badge}
               </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-5 mt-10">
        <div className="relative rounded-[2rem] overflow-hidden bg-brand-500 aspect-[2.2/1] shadow-2xl shadow-brand-500/20 group cursor-pointer">
           <div className="absolute inset-0 bg-gradient-to-r from-brand-600/80 to-transparent z-10" />
           <img 
              src="https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?auto=format&fit=crop&q=80&w=1000" 
              alt="Promo" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
           />
           <div className="absolute top-0 bottom-0 left-6 flex flex-col justify-center z-20 max-w-[200px]">
              <h3 className="text-white font-black text-xl leading-tight uppercase tracking-tight">XANH DU HÍ</h3>
              <p className="text-brand-100 text-[10px] font-bold mt-2 opacity-80 uppercase tracking-widest">Giảm ngay 20%</p>
              <div className="mt-4 bg-white text-brand-600 text-[10px] font-black px-4 py-2 rounded-full w-fit shadow-lg active:scale-95 transition-all">
                ĐĂNG KÝ NGAY
              </div>
           </div>
        </div>
      </div>
      
      <div className="px-5 mt-10 pb-36">
        <h2 className="text-xl font-black text-slate-800 mb-5">Gợi ý quán Ngon</h2>
        <div className="grid grid-cols-2 gap-4">
           {[1, 2].map(i => (
             <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="aspect-square bg-slate-100 relative">
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Zap size={32} />
                  </div>
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">30%</div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-black text-slate-800 line-clamp-1">Combo Gà Rán Sasin</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">3.2km • 25 phút</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function HistorySheet({ userId }: { userId?: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    apiFetch(`/bookings?userId=${userId}`)
      .then((res) => { setBookings(res.data || []); })
      .catch(() => setBookings([]))
      .finally(() => setIsLoading(false));
  }, [userId]);

  const statusLabel: Record<string, { text: string; color: string }> = {
    COMPLETED: { text: 'Hoàn tất', color: 'text-emerald-500 bg-emerald-50' },
    REQUESTED:  { text: 'Đã đặt',  color: 'text-blue-500 bg-blue-50'    },
    CANCELLED:  { text: 'Đã huỷ',  color: 'text-red-500 bg-red-50'      },
    FAILED:     { text: 'Thất bại', color: 'text-red-500 bg-red-50'      },
    SEARCHING:  { text: 'Tìm xe',  color: 'text-amber-500 bg-amber-50'  },
  };

  return (
    <div className="bg-white min-h-full w-full p-6 pt-10">
      <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-6">Lịch sử chuyến đi</h2>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      )}
      {!isLoading && bookings.length === 0 && (
        <div className="text-center py-12">
          <Car size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-black text-slate-400">Chưa có chuyến đi nào</p>
        </div>
      )}
      <div className="space-y-4">
        {bookings.map((b) => {
          const st = statusLabel[b.status] || { text: b.status, color: 'text-slate-500 bg-slate-50' };
          const date = new Date(b.createdAt);
          const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return (
            <div key={b.id} className="flex gap-4 p-4 rounded-3xl border border-slate-100 shadow-sm bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 shadow-sm flex-shrink-0">
                <Car size={20} />
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-sm line-clamp-1">
                  {b.pickupAddress || `${b.pickupLat?.toFixed(4)}, ${b.pickupLng?.toFixed(4)}`} → {b.dropoffAddress || `${b.dropLat?.toFixed(4)}, ${b.dropLng?.toFixed(4)}`}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
                  {dateStr} • {formatCurrency(b.price)}
                </p>
              </div>
              <div className={`text-[10px] font-black px-2 py-1 h-fit rounded-lg shadow-sm ${st.color}`}>
                {st.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountSheet({ onLogout, user }: { onLogout: () => void, user: any }) {
  return (
    <div className="bg-white min-h-full w-full p-6 pt-12 flex flex-col items-center">
       <div className="w-24 h-24 rounded-full border-4 border-brand-100 p-1 mb-4 shadow-xl">
         <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden relative">
            <img src="https://ui-avatars.com/api/?name=User&background=0284c7&color=fff" alt="User" className="w-full h-full object-cover" />
         </div>
       </div>
       <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{user?.name || 'CabGo User'}</h2>
       <p className="text-sm font-bold text-slate-400 mb-10">{user?.email || 'user@cabgo.vn'}</p>
       
       <div className="w-full bg-slate-50 rounded-3xl p-2 border border-slate-100 shadow-inner mb-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white transition-all group cursor-pointer">
             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
               <Star size={20} />
             </div>
             <div className="flex-1 text-left">
               <p className="font-black text-slate-800 text-sm">Hội viên VIP</p>
               <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">1,200 điểm</p>
             </div>
             <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500" />
          </div>
       </div>

       <button onClick={onLogout} className="w-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 border border-red-100 font-black py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95">
         <LogOut size={18} /> ĐĂNG XUẤT
       </button>
    </div>
  );
}

function LocationSheet({ onConfirm }: { onConfirm: () => void }) {
  const { pickup, dropoff, setPickup, setDropoff } = useRideStore();
  const [focusField, setFocusField] = useState<'pickup' | 'dropoff'>('dropoff');

  const [tempPickup, setTempPickup] = useState(pickup?.address || '');
  const [tempDropoff, setTempDropoff] = useState(dropoff?.address || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const defaultSuggestions = [
    { icon: '🏙️', name: 'Landmark 81', address: 'Bình Thạnh, TP.HCM', lat: 10.7952, lng: 106.7218 },
    { icon: '✈️', name: 'Sân bay Tân Sơn Nhất', address: 'Tân Bình, TP.HCM', lat: 10.8231, lng: 106.6627 }, 
    { icon: '🛍️', name: 'Vincom Center', address: 'Quận 1, TP.HCM', lat: 10.7711, lng: 106.7016 },
  ];

  const searchLocation = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&accept-language=vi-VN,vi&addressdetails=1&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
           const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi-VN,vi`);
           const data = await res.json();
           const houseNumber = data.address?.house_number ? `${data.address.house_number} ` : '';
           const road = data.address?.road || data.address?.suburb || '';
           const shortName = houseNumber + road || 'Vị trí của bạn';
           const fullAddress = data.display_name || 'Vị trí của bạn';
           
           const loc = { lat, lng, address: `${shortName}, ${fullAddress.split(',').slice(1,3).join(',')}` };
           setPickup(loc);
           setTempPickup(loc.address);
           setFocusField('dropoff');
        } catch (err) {
           const loc = { lat, lng, address: 'Vị trí của bạn' };
           setPickup(loc);
           setTempPickup('Vị trí của bạn');
           setFocusField('dropoff');
        }
        setIsSearching(false);
      }, () => {
        alert('Không thể lấy vị trí hiện tại. Vui lòng bật GPS trên thiết bị.');
        setIsSearching(false);
      }, { enableHighAccuracy: true });
    } else {
      alert('Trình duyệt của bạn không hỗ trợ định vị.');
    }
  };

  useEffect(() => {
    const activeQuery = focusField === 'pickup' ? tempPickup : tempDropoff;
    const timeout = setTimeout(() => searchLocation(activeQuery), 600);
    return () => clearTimeout(timeout);
  }, [tempPickup, tempDropoff, focusField]);

  useEffect(() => {
    if (pickup?.address && focusField !== 'pickup') setTempPickup(pickup.address);
    if (dropoff?.address && focusField !== 'dropoff') setTempDropoff(dropoff.address);
  }, [pickup, dropoff, focusField]);

  const handleSelect = (item: any, isApi: boolean = true) => {
    let loc;
    if (isApi) {
      const addrDetails = item.address;
      const shortName = addrDetails.house_number || addrDetails.road || addrDetails.suburb || addrDetails.city || item.display_name.split(',')[0];
      loc = { lat: parseFloat(item.lat), lng: parseFloat(item.lon), address: `${shortName}, ${item.display_name.split(',').slice(1, 3).join(',')}` };
    } else {
      loc = { lat: item.lat, lng: item.lng, address: `${item.name}, ${item.address}` };
    }
    
    if (focusField === 'pickup') { 
      setPickup(loc); 
      setTempPickup(loc.address);
      setFocusField('dropoff'); 
    } else { 
      setDropoff(loc); 
      setTempDropoff(loc.address);
    }
    setSearchResults([]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white w-full sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <ArrowLeft size={22} className="text-slate-800 -ml-1 cursor-pointer" onClick={() => onConfirm()} />
        <button 
           onClick={handleGetCurrentLocation}
           className="flex items-center gap-3 active:opacity-70 transition-opacity"
        >
          <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center border-[3px] border-white ring-2 ring-slate-900 shadow-sm">
             <div className="w-1.5 h-1.5 bg-white rounded-full bg-transparent" />
          </div>
          <span className="font-bold text-[15px] text-slate-800">Sử dụng vị trí hiện tại</span>
        </button>
      </div>

      {/* Input Section */}
      <div className="pt-4 pb-2 px-4 bg-white z-20 space-y-2">
        <div className={cn('flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors', focusField === 'pickup' ? 'bg-brand-50/40 border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200')}>
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0 ml-1" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-slate-800 placeholder:text-slate-400"
            placeholder="Tìm điểm đón..."
            value={tempPickup}
            onChange={(e) => {
              setTempPickup(e.target.value);
              setFocusField('pickup');
            }}
            onFocus={() => setFocusField('pickup')}
          />
          {tempPickup && focusField === 'pickup' && (
            <button onClick={() => setTempPickup('')} className="bg-slate-300 rounded-full p-1 hover:bg-slate-400 transition-colors">
              <X size={12} className="text-white" />
            </button>
          )}
        </div>

        <div className={cn('flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors', focusField === 'dropoff' ? 'bg-brand-50/40 border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200')}>
          <MapPin size={18} className="text-amber-500 fill-amber-500 flex-shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-slate-800 placeholder:text-amber-500/60"
            placeholder="Tới điểm?"
            autoFocus
            value={tempDropoff}
            onChange={(e) => {
              setTempDropoff(e.target.value);
              setFocusField('dropoff');
            }}
            onFocus={() => setFocusField('dropoff')}
          />
          {tempDropoff && focusField === 'dropoff' && (
            <button onClick={() => setTempDropoff('')} className="bg-slate-300 rounded-full p-1 hover:bg-slate-400 transition-colors">
              <X size={12} className="text-white" />
            </button>
          )}
          <div className="w-6 h-6 bg-brand-400 rounded-lg flex items-center justify-center text-white font-bold ml-1 text-lg shadow-sm leading-none">+</div>
        </div>
      </div>

      {/* Utilities / Tabs */}
      {!isSearching && tempDropoff === '' && (
        <div className="px-4 py-2 bg-white z-10">
          <div className="flex items-center justify-between mb-4 bg-orange-50/60 px-3 py-2.5 rounded-xl border border-orange-100">
             <span className="text-[12px] font-semibold text-slate-600">Hiển thị địa chỉ sau sát nhập tỉnh</span>
             <div className="w-10 h-6 bg-brand-400 rounded-full flex items-center p-0.5 justify-end shadow-inner cursor-pointer">
               <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
             </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
             <button className="px-5 py-2 bg-slate-800 text-white text-[13px] font-bold rounded-full shadow-md shadow-slate-800/20">Đề xuất</button>
             <button className="px-5 py-2 bg-slate-100 text-slate-600 text-[13px] font-bold rounded-full hover:bg-slate-200 transition-colors">Đã lưu</button>
          </div>
        </div>
      )}

      {/* Search Results Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-[60px]">
        {isSearching && (
          <div className="flex flex-col items-center justify-center p-10 text-brand-500 gap-3">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xs font-black uppercase tracking-widest text-slate-400">Đang quét vị trí...</span>
          </div>
        )}

        {/* Real API Search Results */}
        {!isSearching && searchResults.length > 0 && (
          <div className="flex flex-col">
            {searchResults.map((s, idx) => {
              const addrDetails = s.address || {};
              const houseNum = addrDetails.house_number ? `${addrDetails.house_number} ` : '';
              const road = addrDetails.road || addrDetails.suburb || addrDetails.city || s.display_name.split(',')[0];
              const shortName = houseNum + road;
              const desc = s.display_name.split(',').slice(1).join(',').trim();
              const dist = (1.2 + idx * 0.8).toFixed(1); // Fake distance
              return (
              <button
                key={s.place_id || idx}
                onClick={() => handleSelect(s, true)}
                className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left group"
              >
                <div className="mt-1 flex-shrink-0 flex flex-col items-center gap-1 w-10">
                   <MapPin size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                   <span className="text-[10px] text-slate-400 font-bold">{dist} km</span>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[15px] font-semibold text-slate-800 leading-tight mb-1">{shortName}</p>
                  <p className="text-[13px] text-slate-500 font-medium leading-snug line-clamp-2">{desc}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                   <div className="w-5 h-6 border-l-2 border-b-2 border-slate-300 rounded-bl-lg opacity-0" />
                   {/* Bookmark icon mock */}
                   <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                   <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>
              </button>
            )})}
            {searchResults.length > 3 && (
              <div className="p-4 rounded-b-3xl shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)]">
                 <span className="text-brand-500 font-bold text-sm">Xem thêm</span>
              </div>
            )}
          </div>
        )}

        {/* Static Suggestions (When empty) */}
        {!isSearching && searchResults.length === 0 && (
          <div className="flex flex-col">
            {defaultSuggestions.map((s, idx) => {
              const dist = (3.8 + idx * 1.5).toFixed(1);
              return (
              <button
                key={s.name}
                onClick={() => handleSelect(s, false)}
                className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left group"
              >
                <div className="mt-1 flex-shrink-0 flex flex-col items-center gap-1 w-10">
                   <MapPin size={20} className="text-slate-400" />
                   <span className="text-[10px] text-slate-400 font-bold">{dist} km</span>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[15px] font-semibold text-slate-800 leading-tight mb-1">{s.name}</p>
                  <p className="text-[13px] text-slate-500 font-medium leading-snug line-clamp-2">{s.address}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                   <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                   <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>
              </button>
            )})}
          </div>
        )}
      </div>

      {/* Tìm trên bản đồ Fixed bottom button */}
      <div className="sticky bottom-0 w-full bg-white border-t border-slate-100 p-4 flex justify-center z-40 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
        <button 
          onClick={onConfirm}
          className="flex items-center justify-center gap-2 text-slate-600 font-bold text-[13px] w-full py-1 hover:text-brand-500 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>
          Tìm trên bản đồ
        </button>
      </div>
    </div>
  );
}

function VehicleSheet({ onConfirm }: { onConfirm: () => void }) {
  const { selectedVehicle, setVehicle, estimatedFare, pickup, dropoff, faresMap, isFetchingFares, fetchFares } = useRideStore();
  const fare = estimatedFare();

  // Compute real distance from actual coords
  const distKm = pickup && dropoff
    ? (Math.sqrt(
        Math.pow(pickup.lat - dropoff.lat, 2) +
        Math.pow(pickup.lng - dropoff.lng, 2)
      ) * 111).toFixed(1)
    : null;

  // Fetch real fares on mount
  useEffect(() => {
    fetchFares();
  }, [fetchFares]);

  return (
    <div className="p-4 w-full">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="font-black text-slate-800 text-lg">Chọn loại xe</h3>
        {distKm && (
          <span className="text-xs text-slate-400 font-bold">~{distKm} km</span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {MOCK_RIDE_OPTIONS.map((opt: any) => {
          const realPrice = faresMap[opt.type];
          return (
          <button
            key={opt.type}
            onClick={() => setVehicle(opt.type as VehicleType)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-all',
              selectedVehicle === opt.type
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-slate-50 bg-white hover:border-slate-200 shadow-sm'
            )}
          >
            <span className="text-3xl">{opt.icon}</span>
            <div className="flex-1 text-left">
              <p className="font-black text-slate-800 text-sm">{opt.label}</p>
              <p className="text-[10px] font-bold text-slate-400">{opt.capacity} chỗ • {opt.eta} phút</p>
            </div>
            {isFetchingFares && !realPrice ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : (
              <p className="font-black text-slate-800 text-sm">{formatCurrency(realPrice ?? opt.basePrice)}</p>
            )}
          </button>
        )})}
      </div>

      <button
        onClick={onConfirm}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-black py-5 rounded-[2.5rem] transition-all shadow-xl active:scale-95 shadow-brand-500/10"
      >
        ĐẶT XE • {formatCurrency(fare ?? (faresMap[selectedVehicle] ?? 0))}
      </button>
    </div>
  );
}

function SearchingSheet({ onCancel, seconds }: { onCancel: () => void; seconds: number }) {
  return (
    <div className="p-8 flex flex-col items-center gap-6 w-full">
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-ping" />
        <div className="absolute inset-4 rounded-full bg-brand-500 flex items-center justify-center shadow-2xl">
          <Zap size={40} className="text-white fill-white" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-black text-slate-800 text-xl mb-1 tracking-tight">ĐANG TÌM TÀI XẾ...</p>
        <p className="text-slate-400 text-sm font-bold tracking-tight">Vui lòng chờ ({seconds}s)</p>
      </div>
      <button onClick={onCancel} className="text-red-500 font-black text-sm uppercase tracking-widest hover:bg-neutral-50 px-6 py-2 rounded-full transition-all">Huỷ chuyến</button>
    </div>
  );
}

function DriverFoundSheet({ onStart, isArriving = false }: { onStart: () => void; isArriving?: boolean }) {
  const { currentRide } = useRideStore();
  const driver = currentRide?.driver;
  const eta = currentRide?.eta ?? currentRide?.estimated_arrival ?? 3;
  const vehicleLabel: Record<string, string> = {
    bike: 'Xe máy', car: 'Ô tô 4 chỗ', premium: 'Xe cao cấp', xl: 'Xe 7 chỗ'
  };
  const vType = (currentRide as any)?.vehicleType || 'car';

  return (
    <div className="p-4 px-6 w-full">
      <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
          <Zap size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
            {isArriving ? 'TÀI XẾ ĐANG ĐẾN' : 'AI MATCHING SUCCESS'}
          </p>
          <p className="text-xs font-bold text-slate-700">
            {isArriving ? `Tài xế đang trên đường đến điểm đón của bạn.` : 'Agent đã tìm thấy tài xế gần bạn nhất.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-3xl mb-6 border border-slate-100">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 shadow-inner overflow-hidden">
            {driver?.avatar
              ? <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
              : <img src="https://i.pravatar.cc/150?u=driver" alt="Driver" />}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-black">✓</div>
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-800 text-lg leading-none mb-1">{driver?.name || 'Đang kết nối...'}</p>
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-black text-slate-700">{driver?.rating?.toFixed(1) || '4.8'}</span>
            <span className="text-slate-400 text-xs font-bold">• {driver?.totalRides ?? '—'} chuyến</span>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">
            {vehicleLabel[vType] || 'Xe'}{driver?.vehicleModel ? ` ${driver.vehicleModel}` : ''}{driver?.vehiclePlate ? ` • ${driver.vehiclePlate}` : ''}
          </p>
        </div>
        <div className="text-center bg-white rounded-2xl p-3 shadow-sm border border-slate-50 min-w-[60px]">
          <p className="text-2xl font-black text-brand-600 leading-none">{eta}</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">phút</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="flex items-center justify-center gap-3 p-4 bg-neutral-900 text-white rounded-[2rem] shadow-xl active:scale-95 transition-all font-black text-sm uppercase tracking-widest">
           LIÊN HỆ
        </button>
        <button onClick={onStart} className="flex items-center justify-center gap-3 p-4 bg-neutral-100 text-slate-800 rounded-[2rem] active:scale-95 transition-all font-black text-sm uppercase tracking-widest">
           MESSAGE
        </button>
      </div>
    </div>
  );
}

function InTripSheet() {
  const { currentRide, pickup, dropoff } = useRideStore();
  const distKm = currentRide?.distance ?? (pickup && dropoff
    ? parseFloat((Math.sqrt(
        Math.pow(pickup.lat - dropoff.lat, 2) +
        Math.pow(pickup.lng - dropoff.lng, 2)
      ) * 111).toFixed(1))
    : null);
  const price = currentRide?.price ?? currentRide?.fare?.total ?? null;
  const duration = currentRide?.duration ?? null;
  const dropoffAddr = currentRide?.dropoff?.address || dropoff?.address || 'Điểm đến';
  // Rough ETA: now + duration
  const etaStr = duration
    ? new Date(Date.now() + duration * 60000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <div className="p-6 w-full">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
           <Car size={32} />
        </div>
        <div className="flex-1">
           <p className="text-[11px] font-black text-brand-500 uppercase tracking-widest mb-1">Đang đến</p>
           <h3 className="text-lg font-black text-slate-800 leading-none line-clamp-1">{dropoffAddr}</h3>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2 mb-1"><PulsingDot /> <span className="text-xs font-black text-slate-800">{etaStr} ĐẾN</span></div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dự kiến</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
         <div className="p-4 bg-slate-50 rounded-3xl text-center border border-slate-100">
            <Navigation size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-xs font-black text-slate-800 leading-none mt-1">{distKm != null ? `${distKm} km` : '...'}</p>
         </div>
         <div className="p-4 bg-slate-50 rounded-3xl text-center border border-slate-100">
            <Zap size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-xs font-black text-slate-800 leading-none mt-1">{price != null ? formatCurrency(price) : '...'}</p>
         </div>
         <div className="p-4 bg-slate-50 rounded-3xl text-center border border-slate-100">
            <Clock size={16} className="text-brand-500 mx-auto mb-1" />
            <p className="text-xs font-black text-slate-800 leading-none mt-1">{duration != null ? `${duration}m` : '...'}</p>
         </div>
      </div>
    </div>
  );
}

function CompletedSheet({ onReset }: { onReset: () => void }) {
  return (
    <div className="p-8 text-center flex flex-col items-center w-full">
       <div className="w-20 h-20 bg-brand-50 rounded-[2.5rem] flex items-center justify-center text-brand-500 shadow-sm mb-6">
          <CheckCircle2 size={46} />
       </div>
       <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">HOÀN TẤT CHUYẾN ĐI!</h2>
       <p className="text-slate-400 font-bold text-sm mb-10 px-6">Cảm ơn bạn đã đồng hành cùng CabGo. Hẹn gặp lại!</p>
       <button onClick={onReset} className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/20 active:scale-95 transition-all">ĐẶT CHUYẾN MỚI</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function CustomerHomePage() {
  const { step, setStep, setPickup, resetBooking, pickup, dropoff, createBooking } = useRideStore();
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [searchSeconds, setSearchSeconds] = useState(30);
  const [hasMounted, setHasMounted] = useState(false);

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/login');
  };

  useEffect(() => {
    setHasMounted(true);
    initialize();
    setStep('idle');
  }, [initialize, setStep]);

  useEffect(() => {
    if (hasMounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasMounted, isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (step !== 'searching') { setSearchSeconds(30); return; }
    const interval = setInterval(() => {
      setSearchSeconds(s => {
        if (s <= 1) { clearInterval(interval); setStep('driver_found'); return 30; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, setStep]);

  if (!hasMounted || isLoading || !isAuthenticated) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
         <Car size={48} className="text-brand-500 animate-bounce mb-4" />
         <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="w-full h-full bg-brand-500 origin-left animate-pulse" />
         </div>
      </div>
    );
  }

  const isBooking = step !== 'idle';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden">
      <div className="phone-frame">
        <div className="phone-content bg-white relative flex flex-col w-full h-full overflow-hidden">
          
          {/* Main Area */}
          <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
             {/* Map Area */}
             <ErrorBoundary componentName="MapArea">
               <div className={cn('absolute inset-0 transition-opacity duration-1000', isBooking ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                 <OSMMap 
                   pickup={pickup ? { lat: pickup.lat, lng: pickup.lng, name: pickup.address } : undefined}
                   dropoff={dropoff ? { lat: dropoff.lat, lng: dropoff.lng, name: dropoff.address } : undefined}
                   driverLocation={['driver_found', 'arriving', 'in_trip'].includes(step) ? { lat: 10.7769 + 0.005, lng: 106.7009 + 0.005 } : undefined}
                 />
               </div>
             </ErrorBoundary>

             {/* Home View */}
             <div className={cn('absolute inset-0 bg-slate-50 transition-all duration-700 flex flex-col w-full h-full overflow-y-auto no-scrollbar pb-32', isBooking ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100')}>
                {activeTab === 'home' && <IdleSheet onStart={() => setStep('selecting')} user={user} />}
                {activeTab === 'history' && <HistorySheet userId={user?.id} />}
                {activeTab === 'discover' && <div className="p-8 text-center pt-20"><Compass size={48} className="mx-auto text-brand-500 opacity-50 mb-4" /><p className="font-black text-slate-400">Khám phá đang cập nhật</p></div>}
                {activeTab === 'account' && <AccountSheet onLogout={handleLogout} user={user} />}
             </div>
          </div>

          {/* Floating UI Elements */}
          {isBooking && (
            <div className="absolute top-12 left-0 right-0 z-30 px-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => resetBooking()}
                  className="w-14 h-14 bg-white/95 backdrop-blur-3xl rounded-[1.8rem] shadow-[0_15px_35px_rgba(0,0,0,0.1)] flex items-center justify-center text-slate-800 active:scale-90 transition-all border border-white"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="bg-neutral-900 rounded-[1.8rem] px-7 py-3 shadow-[0_15px_35px_rgba(0,0,0,0.2)] border border-white/10 flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                   <span className="font-black text-white text-[10px] tracking-[0.2em] uppercase">CABGO ACTIVE</span>
                </div>
                <div className="w-14 h-14" />
              </div>
            </div>
          )}

          {/* Bottom Sheet UI */}
          {isBooking && (
            <ErrorBoundary componentName="BottomSheet">
              <div className={cn(
                'absolute bottom-0 left-0 right-0 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.15)] z-40 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col rounded-t-[3.5rem] border-t border-slate-50',
                 step === 'selecting'    ? 'h-[85%]' : 
                 step === 'options'      ? 'h-[75%]' : 
                 ['searching', 'in_trip', 'completed'].includes(step) ? 'h-[40%]' : 'h-[55%]'
              )}>
                <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
                  {step === 'selecting'    && <LocationSheet onConfirm={() => setStep('options')} />}
                  {step === 'options'      && <VehicleSheet onConfirm={() => createBooking(user!.id).catch((err: any) => alert(err.message))} />}
                  {step === 'searching'    && <SearchingSheet onCancel={resetBooking} seconds={searchSeconds} />}
                  {step === 'driver_found' && <DriverFoundSheet onStart={() => setStep('arriving')} />}
                  {step === 'arriving'     && <DriverFoundSheet onStart={() => setStep('in_trip')} isArriving={true} />}
                  {step === 'in_trip'      && <InTripSheet />}
                  {step === 'completed'    && <CompletedSheet onReset={resetBooking} />}
                </div>
              </div>
            </ErrorBoundary>
          )}

          {/* Persistent Bottom Nav Dock - Floating with Glassmorphism */}
          {!isBooking && (
            <div className="absolute bottom-10 left-6 right-6 z-50">
               <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] px-8 py-5 flex items-center justify-between shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)]">
                 {[
                   { id: 'home', icon: <Zap size={22} />, label: 'Trang chủ' },
                   { id: 'history', icon: <Clock size={22} />, label: 'Lịch sử' },
                   { id: 'discover', icon: <Compass size={22} />, label: 'Khám phá' },
                   { id: 'account', icon: <User size={22} />, label: 'Tài khoản' },
                 ].map((item, i) => {
                   const active = activeTab === item.id;
                   return (
                   <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn('flex flex-col items-center gap-1.5 transition-all group', active ? 'text-brand-500' : 'text-slate-400 opacity-60')}>
                      <div className={cn('transition-all duration-300 p-2 rounded-2xl', active ? 'bg-brand-50 text-brand-500 scale-110' : 'group-hover:bg-slate-50')}>
                        {item.icon}
                      </div>
                      <span className={cn('text-[9px] font-black uppercase tracking-widest leading-none', active ? 'opacity-100' : 'opacity-40')}>
                        {item.label}
                      </span>
                   </button>
                 )})}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
