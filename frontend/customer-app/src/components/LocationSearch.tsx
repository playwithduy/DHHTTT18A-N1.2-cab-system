'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Search, Plus, Bookmark, Navigation2 } from 'lucide-react';
import { useRideStore } from '@/store/rideStore';

export default function LocationSearch({ onClose }: { onClose: () => void }) {
  const { pickup, setPickup, dropoff, setDropoff, setStep, fetchFares } = useRideStore();
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff'>('dropoff');
  const [query, setQuery] = useState('');
  const [pickupQuery, setPickupQuery] = useState(pickup?.address || 'Vị trí của bạn');
  const [dropoffQuery, setDropoffQuery] = useState(dropoff?.address || '');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const searchLocations = async (text: string) => {
    if (!text.trim() || text === 'Vị trí của bạn') {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      if (text.toLowerCase().includes('iuh') || text.toLowerCase().includes('công nghiệp')) {
        // Mock results for IUH specifically to provide a great UX matching Google Maps
        setResults([
          { lat: '10.8222', lon: '106.6875', display_name: 'Đại học Công nghiệp TP.HCM (IUH), 12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, Hồ Chí Minh', name: 'Đại học Công nghiệp TP.HCM (IUH)', place_id: 'iuh_1' },
          { lat: '10.8225', lon: '106.6872', display_name: 'Ký Túc Xá IUH, 12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, Hồ Chí Minh', name: 'Ký Túc Xá IUH', place_id: 'iuh_2' },
          { lat: '10.8219', lon: '106.6879', display_name: 'Khoa Cơ Khí - IUH, 12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, Hồ Chí Minh', name: 'Khoa Cơ Khí - IUH', place_id: 'iuh_3' }
        ]);
        return;
      }

      // Use Nominatim API for real OpenStreetMap data (Vietnam focus)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=vn`, {
        headers: { 'User-Agent': 'CabGoApp/1.0' }
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const currentQuery = activeField === 'pickup' ? pickupQuery : dropoffQuery;
    
    // Don't search if it's the exact same as current selected or "Vị trí của bạn"
    if (activeField === 'pickup' && (currentQuery === 'Vị trí của bạn' || currentQuery === pickup?.address)) {
      setResults([]);
      return;
    }
    if (activeField === 'dropoff' && currentQuery === dropoff?.address) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      searchLocations(currentQuery);
    }, 500); // Debounce
    return () => clearTimeout(timeoutRef.current);
  }, [pickupQuery, dropoffQuery, activeField]);

  const handleSelect = async (place: any) => {
    if (activeField === 'pickup') {
      setPickup({
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name,
        placeId: place.place_id
      });
      setPickupQuery(place.display_name);
      setActiveField('dropoff'); // Move to dropoff after selecting pickup
    } else {
      setDropoff({
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name,
        placeId: place.place_id
      });
      setDropoffQuery(place.display_name);
      setStep('options');
      await fetchFares();
    }
  };

  const currentQuery = activeField === 'pickup' ? pickupQuery : dropoffQuery;

  return (
    <div className="absolute inset-0 z-[200] bg-white flex flex-col font-sans animate-fade-in">
      {/* Header with pt-14 to avoid notch */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-800 rounded-full hover:bg-slate-100">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-bold text-slate-900">Bạn muốn đi đâu?</h2>
        </div>
        <button className="text-blue-600 font-medium text-sm">
          Chọn từ bản đồ
        </button>
      </div>

      {/* Input Fields */}
      <div className="px-4 py-4 flex gap-3 relative">
        <div className="flex flex-col items-center mt-3 gap-1 w-6">
          <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
          </div>
          <div className="w-[2px] h-8 bg-slate-200 rounded-full my-1" />
          <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <MapPin size={10} className="text-yellow-600" />
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="relative">
            <input 
              type="text" 
              value={pickupQuery}
              onFocus={() => setActiveField('pickup')}
              onChange={(e) => setPickupQuery(e.target.value)}
              placeholder="Nhập điểm đón"
              className={activeField === 'pickup' ? 
                "w-full bg-white border-2 border-blue-500 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 outline-none shadow-[0_0_0_4px_rgba(59,130,246,0.1)] transition-all" : 
                "w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 outline-none"}
            />
            {activeField === 'pickup' && pickupQuery && pickupQuery !== 'Vị trí của bạn' && (
              <button 
                onClick={() => setPickupQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center text-white"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            )}
          </div>
          <div className="relative">
            <input 
              type="text" 
              autoFocus
              value={dropoffQuery}
              onFocus={() => setActiveField('dropoff')}
              onChange={(e) => setDropoffQuery(e.target.value)}
              placeholder="Nhập điểm đến"
              className={activeField === 'dropoff' ? 
                "w-full bg-white border-2 border-blue-500 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 outline-none shadow-[0_0_0_4px_rgba(59,130,246,0.1)] transition-all" : 
                "w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 outline-none"}
            />
            {activeField === 'dropoff' && dropoffQuery && (
              <button 
                onClick={() => setDropoffQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center text-white"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col justify-end pb-2">
          <button className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
            <Navigation2 size={16} />
          </button>
        </div>
      </div>

      <button className="flex items-center gap-2 px-12 pb-4 text-sm font-medium text-slate-500 border-b-8 border-slate-50">
        <Plus size={16} /> Nhấn để thêm điểm đến
      </button>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && results.map((place, idx) => {
          const parts = place.display_name.split(',');
          const mainText = place.name || parts[0];
          const subText = parts.slice(1).join(',').trim();
          // Simulate distance
          const dist = (Math.random() * 5 + 0.5).toFixed(1);

          return (
            <div 
              key={idx} 
              onClick={() => handleSelect(place)}
              className="flex items-start gap-4 px-4 py-4 border-b border-slate-100 active:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mt-1 flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <MapPin size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{place.display_name.split(',')[0]}</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  <span className="font-bold text-slate-700">{dist}km từ bạn • </span>
                  {place.display_name.split(',').slice(1).join(',')}
                </p>
                <button className="text-blue-600 text-xs font-medium mt-2 flex items-center gap-1">
                  Xem địa chỉ mới <Plus size={10} className="rotate-45" />
                </button>
              </div>
              <button className="text-slate-400 p-2 hover:text-blue-600">
                <Bookmark size={20} />
              </button>
            </div>
          );
        })}

        {!isLoading && results.length === 0 && !currentQuery && (
          <div className="p-4">
            <h3 className="text-slate-900 font-bold text-sm mb-3">Lịch sử tìm kiếm</h3>
            <div className="flex items-center gap-4 px-2 py-3 border-b border-slate-100 cursor-pointer">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                <Search size={16} />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">Sân bay Tân Sơn Nhất</p>
                <p className="text-slate-500 text-xs">Tân Bình, TP.HCM</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && currentQuery && currentQuery !== 'Vị trí của bạn' && (
          <div className="p-8 text-center">
            <h3 className="text-slate-900 font-bold text-sm mb-2">Không tìm thấy kết quả</h3>
            <p className="text-slate-500 text-xs">Vui lòng thử tìm kiếm bằng địa chỉ cụ thể hơn.</p>
          </div>
        )}
      </div>
    </div>
  );
}
