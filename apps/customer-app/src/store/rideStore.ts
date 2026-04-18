// store/rideStore.ts — Global ride state with Zustand
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Ride, Location, VehicleType, RideStatus, Driver, LatLng } from '@/types';
import { MOCK_RIDE_OPTIONS } from '@/types/mock-data';
import { apiFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────
type BookingStep =
  | 'idle'           // Map view, no booking
  | 'selecting'      // Choosing pickup/dropoff
  | 'options'        // Vehicle type selection
  | 'confirming'     // Confirm & pay screen
  | 'searching'      // Finding driver
  | 'driver_found'   // Driver assigned, showing info
  | 'arriving'       // Driver on the way to pickup
  | 'in_trip'        // Ride in progress
  | 'completed'      // Trip done, rate screen
  | 'payment';       // Payment screen

interface RideStore {
  // Booking flow
  step: BookingStep;
  pickup: Location | null;
  dropoff: Location | null;
  selectedVehicle: VehicleType;
  currentRide: Ride | null;
  assignedDriver: Driver | null;
  driverLocation: LatLng | null;
  searchTimeout: number; // seconds remaining

  // Map state
  mapCenter: LatLng;
  mapZoom: number;

  // Actions
  setStep: (step: BookingStep) => void;
  setPickup: (location: Location | null) => void;
  setDropoff: (location: Location | null) => void;
  setVehicle: (type: VehicleType) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setAssignedDriver: (driver: Driver | null) => void;
  setDriverLocation: (location: LatLng) => void;
  setMapCenter: (center: LatLng, zoom?: number) => void;
  setSearchTimeout: (seconds: number) => void;
  resetBooking: () => void;

  // API Actions
  createBooking: (userId: string) => Promise<any>;
  fetchFares: () => Promise<Record<string, number>>;  // vehicle_type -> price
  faresMap: Record<string, number>; // cached fares
  isFetchingFares: boolean;

  // Computed
  estimatedFare: () => number | null;
}

const DEFAULT_MAP_CENTER: LatLng = { lat: 10.7769, lng: 106.7009 }; // HCMC

export const useRideStore = create<RideStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      step: 'idle',
      pickup: null,
      dropoff: null,
      selectedVehicle: 'car',
      currentRide: null,
      assignedDriver: null,
      driverLocation: null,
      searchTimeout: 60,
      mapCenter: DEFAULT_MAP_CENTER,
      mapZoom: 13,
      faresMap: {},
      isFetchingFares: false,

      setStep: (step) => set({ step }),
      setPickup: (location) => set({ pickup: location }),
      setDropoff: (location) => set({ dropoff: location }),
      setVehicle: (type) => set({ selectedVehicle: type }),
      setCurrentRide: (ride) => set({ currentRide: ride }),
      setAssignedDriver: (driver) => set({ assignedDriver: driver }),
      setDriverLocation: (location) => set({ driverLocation: location }),
      setSearchTimeout: (seconds) => set({ searchTimeout: seconds }),
      setMapCenter: (center, zoom) =>
        set({ mapCenter: center, ...(zoom ? { mapZoom: zoom } : {}) }),

      resetBooking: () => set({
        step: 'idle',
        pickup: null,
        dropoff: null,
        selectedVehicle: 'car',
        currentRide: null,
        assignedDriver: null,
        driverLocation: null,
        searchTimeout: 60,
        faresMap: {},
        isFetchingFares: false,
      }),

      createBooking: async (userId: string) => {
        const { pickup, dropoff, selectedVehicle } = get();
        if (!pickup || !dropoff) throw new Error('Thiếu điểm đón hoặc điểm đến');

        // Generate a pseudo-random idempotency key for this specific booking attempt
        const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Simple distance estimation
        const dist = Math.sqrt(
          Math.pow(pickup.lat - dropoff.lat, 2) +
          Math.pow(pickup.lng - dropoff.lng, 2)
        ) * 111;

        try {
          const result = await apiFetch('/bookings', {
            method: 'POST',
            headers: {
              'x-idempotency-key': idempotencyKey
            },
            body: JSON.stringify({
              userId,
              pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
              drop: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
              distance_km: parseFloat(dist.toFixed(2)),
              vehicleType: selectedVehicle,
              vehicle_type: selectedVehicle,
              demand_index: 1.0
            })
          });

          // Handle Success
          if (result.success) {
            set({ 
              currentRide: {
                ...result.data,
                // Ensure we use the real Price and ETA from backend
                price: result.data.price,
                estimated_arrival: result.data.eta 
              }, 
              step: 'searching' 
            });
            return result.data;
          } else {
            // Handle logical errors (e.g. No Drivers - Test 13)
            throw new Error(result.message || 'Booking failed');
          }
        } catch (error: any) {
          // Handle HTTP Errors (Level 2)
          if (error.status === 422) {
            console.error('Validation Error (422):', error.data?.errors);
            throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại điểm đón/đến.');
          }
          if (error.status === 401) {
            useAuthStore.getState().logout();
            throw new Error('Phiên làm việc hết hạn. Vui lòng đăng nhập lại.');
          }
          if (error.status === 413) {
            throw new Error('Yêu cầu quá lớn. Vui lòng thử lại sau.');
          }
          
          console.error('Booking failed:', error);
          throw error;
        }
      },

      fetchFares: async () => {
        const { pickup, dropoff } = get();
        if (!pickup || !dropoff) return {};

        const dist = Math.sqrt(
          Math.pow(pickup.lat - dropoff.lat, 2) +
          Math.pow(pickup.lng - dropoff.lng, 2)
        ) * 111;
        const distance_km = parseFloat(dist.toFixed(2));

        set({ isFetchingFares: true });
        const vehicleTypes = ['bike', 'car', 'premium', 'xl'];
        const GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

        const VEHICLE_PRICING: Record<string, { baseFare: number; perKmRate: number }> = {
          bike:    { baseFare: 13000, perKmRate: 4500  },
          car:     { baseFare: 28000, perKmRate: 11000 },
          premium: { baseFare: 35000, perKmRate: 14500 },
          xl:      { baseFare: 32000, perKmRate: 13000 },
        };

        const localFare = (vt: string) => {
          const { baseFare, perKmRate } = VEHICLE_PRICING[vt] ?? VEHICLE_PRICING['car'];
          return Math.round(distance_km <= 2 ? baseFare : baseFare + (distance_km - 2) * perKmRate);
        };

        const results: Record<string, number> = {};
        await Promise.all(
          vehicleTypes.map(async (vt) => {
            try {
              const res = await fetch(`${GATEWAY_URL}/pricing/price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distance_km, vehicle_type: vt, demand_index: 1.0 }),
              });
              const data = await res.json();
              results[vt] = data.success ? data.data.final_price : localFare(vt);
            } catch {
              results[vt] = localFare(vt);
            }
          })
        );

        set({ faresMap: results, isFetchingFares: false });
        return results;
      },

      estimatedFare: () => {
        const { pickup, dropoff, selectedVehicle, currentRide, faresMap } = get();
        // Priority 1: real price from backend booking
        if (currentRide?.price) return currentRide.price;
        // Priority 2: fare loaded from pricing API
        if (faresMap[selectedVehicle]) return faresMap[selectedVehicle];
        
        if (!pickup || !dropoff) return null;
        const dist = Math.sqrt(
          Math.pow(pickup.lat - dropoff.lat, 2) +
          Math.pow(pickup.lng - dropoff.lng, 2)
        ) * 111;
        
        const option = MOCK_RIDE_OPTIONS.find(o => o.type === selectedVehicle);
        if (!option) return null;

        // Local fallback calculation matches backend pricing formula
        if (dist <= 2) {
          return option.basePrice;
        }
        return Math.round(option.basePrice + (dist - 2) * option.pricePerKm);
      },
    }))
  )
);

// Auth store
interface AuthStore {
  user: import('@/types').User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: import('@/types').User | null) => void;
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
    login: (token, user) => {
      localStorage.setItem('cabgo_token', token);
      localStorage.setItem('cabgo_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('cabgo_token');
      localStorage.removeItem('cabgo_user');
      set({ user: null, isAuthenticated: false });
    },
    initialize: () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('cabgo_token');
      const userStr = localStorage.getItem('cabgo_user');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  }))
);
