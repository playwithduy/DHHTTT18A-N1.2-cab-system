// store/rideStore.ts — Global state with Zustand
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiFetch } from '@/lib/api';
import type { Ride, Location, VehicleType, Driver, LatLng, PaymentMethod, RideStep } from '@/types';

// ─── Auth Store ───────────────────────────────────────────────
interface AuthStore {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  login: (token: string, user: any) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
    initialize: () => {
      try {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('cabgo_token');
        const userStr = localStorage.getItem('cabgo_user');
        
        if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
          // Manual JWT Decode to check expiry
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
              console.warn('Token expired, logging out...');
              localStorage.removeItem('cabgo_token');
              localStorage.removeItem('cabgo_user');
              set({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }
            
            console.log('Token is valid. Subject:', payload.sub);
          } catch (e) {
            console.error('Token decode failed:', e);
          }

          const user = JSON.parse(userStr);
          set({ user, isAuthenticated: true, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (e) {
        console.error('Auth initialization failed:', e);
        localStorage.removeItem('cabgo_token');
        localStorage.removeItem('cabgo_user');
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
    login: (token, user) => {
      localStorage.setItem('cabgo_token', token);
      localStorage.setItem('cabgo_user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    },
    logout: () => {
      localStorage.removeItem('cabgo_token');
      localStorage.removeItem('cabgo_user');
      set({ user: null, isAuthenticated: false });
    },
  }))
);

// ─── Ride Store ───────────────────────────────────────────────
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'success' | 'info' | 'warning';
}

interface RideStore {
  step: RideStep;
  pickup: Location | null;
  dropoff: Location | null;
  selectedVehicle: VehicleType;
  paymentMethod: PaymentMethod;
  faresMap: Record<string, number>;
  isFetchingFares: boolean;
  currentRide: Ride | null;
  promotions: any[];
  assignedDriver: Driver | null;
  availableVehicles: any[];
  
  // Actions
  setStep: (step: RideStep) => void;
  setPickup: (loc: Location | null) => void;
  setDropoff: (loc: Location | null) => void;
  setVehicle: (type: VehicleType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  fetchFares: () => Promise<void>;
  createBooking: () => Promise<void>;
  resetBooking: () => void;
  initRideStore: () => void;
  fetchPromotions: () => Promise<void>;
  pollBookingStatus: (bookingId: string) => Promise<void>;
  
  // Notifications
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationsAsRead: () => void;
}

export const useRideStore = create<RideStore>()(
  devtools((set, get) => ({
    step: 'idle',
    pickup: { lat: 10.7769, lng: 106.7009, address: 'Vị trí hiện tại' },
    dropoff: null,
    selectedVehicle: 'car',
    paymentMethod: 'cash',
    faresMap: {},
    isFetchingFares: false,
    currentRide: null,
    promotions: [],
    assignedDriver: null,
    availableVehicles: [],
    selectedVehicle: 'car',
    paymentMethod: 'CASH',
    notifications: [],

    addNotification: (n) => {
      set(state => ({
        notifications: [
          { ...n, id: Math.random().toString(36).substr(2, 9), time: new Date().toISOString(), read: false },
          ...state.notifications
        ]
      }));
    },

    markNotificationsAsRead: () => {
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      }));
    },

    setStep: (step) => set({ step }),
    setPickup: (loc) => set({ pickup: loc }),
    setDropoff: (loc) => set({ dropoff: loc }),
    setVehicle: (type) => set({ selectedVehicle: type }),
    setPaymentMethod: (method) => set({ paymentMethod: method }),

    fetchFares: async () => {
      const { pickup, dropoff } = get();
      if (!pickup || !dropoff) return;

      set({ isFetchingFares: true });
      try {
        // Precise Distance Calculation (Haversine-ish for local)
        const R = 6371; // Earth radius in km
        const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
        const dLon = (dropoff.lng - pickup.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance_km = parseFloat((R * c).toFixed(2));

        // Fetch supported vehicles from Backend
        const vehicleRes = await apiFetch('/pricing/vehicles');
        let vehicleTypes = ['bike', 'car', 'premium', 'xl'];
        let vehicles = [];
        if (vehicleRes.success) {
           vehicleTypes = vehicleRes.data.map((v: any) => v.type);
           vehicles = vehicleRes.data;
        }

        const fares: Record<string, number> = {};
        await Promise.all(vehicleTypes.map(async (type) => {
          try {
            const res = await apiFetch('/pricing', {
              method: 'POST',
              body: JSON.stringify({ distance_km, vehicle_type: type })
            });
            if (res.success) fares[type] = res.data.final_price;
          } catch {
            fares[type] = 0;
          }
        }));

        set({ faresMap: fares, availableVehicles: vehicles, isFetchingFares: false });
      } catch (error) {
        console.error('Fare calculation failed:', error);
        set({ isFetchingFares: false });
      }
    },

    fetchPromotions: async () => {
      try {
        // Fetch from backend in future, now dynamic mock
        const promos = [
          { id: 1, title: 'Giảm 50% chuyến đầu', code: 'CABGO50', image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400' },
          { id: 2, title: 'Đồng giá 15k xe máy', code: 'BIKE15', image: 'https://images.unsplash.com/photo-1558981403-c5f91cbba523?w=400' },
          { id: 3, title: 'Premium Luxury', code: 'LUXE24', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400' }
        ];
        set({ promotions: promos });
      } catch (e) { console.error(e); }
    },

    createBooking: async () => {
      const { pickup, dropoff, selectedVehicle, paymentMethod, faresMap } = get();
      const user = useAuthStore.getState().user;
      
      console.log('[createBooking] Starting...', { user: !!user, pickup: !!pickup, dropoff: !!dropoff, selectedVehicle });

      if (!user) {
        console.error('[createBooking] No user found in auth store');
        import('react-hot-toast').then(m => m.default.error('Vui lòng đăng nhập trước khi đặt xe'));
        return;
      }
      if (!pickup || !dropoff) {
        console.error('[createBooking] Missing pickup or dropoff');
        import('react-hot-toast').then(m => m.default.error('Vui lòng chọn điểm đón và điểm đến'));
        return;
      }

      set({ step: 'searching' });
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('cabgo_token') : null;
        const GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';
        
        const payload = {
          userId: user.id || user._id || user.sub,
          pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
          drop: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
          vehicleType: selectedVehicle,
          payment_method: 'CASH'
        };

        console.log('[createBooking] Sending payload:', JSON.stringify(payload));

        const response = await fetch(`${GATEWAY}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': `ui-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        const res = await response.json();
        console.log('[createBooking] Response:', response.status, res);

        if (res.success && res.data) {
          const toastMsg = res.message || 'Đặt xe thành công! Đang tìm tài xế...';
          import('react-hot-toast').then(m => m.default.success(toastMsg));
          get().addNotification({ title: 'Hệ thống nhận chuyến', message: toastMsg, type: 'success' });
          set({ currentRide: res.data, step: 'searching' });
          get().pollBookingStatus(res.data.id);
        } else {
          console.error('[createBooking] Backend error:', res.message);
          import('react-hot-toast').then(m => m.default.error(res.message || 'Không thể đặt xe'));
          set({ step: 'options' });
        }
      } catch (error: any) {
        console.error('[createBooking] Network/fetch error:', error);
        import('react-hot-toast').then(m => m.default.error('Lỗi kết nối. Vui lòng thử lại.'));
        set({ step: 'options' });
      }
    },

    pollBookingStatus: async (bookingId: string) => {
      const interval = setInterval(async () => {
        const { step, resetBooking } = get();
        if (step !== 'searching' && step !== 'driver_found' && step !== 'arriving') {
          clearInterval(interval);
          return;
        }

        try {
          const res = await apiFetch(`/bookings/${bookingId}`);
          if (res.success) {
            const ride = res.data;
            if (ride.status === 'ACCEPTED' && get().step === 'searching') {
              set({ currentRide: ride, step: 'driver_found' });
              get().addNotification({ title: 'Đã tìm thấy tài xế!', message: 'Tài xế đã nhận chuyến và đang trên đường đến đón bạn.', type: 'success' });
            } else if (ride.status === 'IN_PROGRESS' && get().step !== 'in_trip') {
              set({ currentRide: ride, step: 'in_trip' });
              get().addNotification({ title: 'Bắt đầu chuyến đi', message: 'Tài xế đã đến đón. Chúc bạn một chuyến đi vui vẻ!', type: 'info' });
            } else if (ride.status === 'COMPLETED' && get().step !== 'completed') {
              set({ currentRide: ride, step: 'completed' });
              get().addNotification({ title: 'Hoàn thành chuyến đi', message: 'Chuyến đi đã hoàn thành. Cảm ơn bạn đã sử dụng CabGo!', type: 'success' });
              resetBooking();
              clearInterval(interval);
            } else if (ride.status === 'CANCELLED') {
              resetBooking();
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    },

    resetBooking: () => set({ 
      step: 'idle', 
      dropoff: null, 
      currentRide: null,
      assignedDriver: null
    }),

    initRideStore: () => {
      get().fetchPromotions();
    }
  }))
);
