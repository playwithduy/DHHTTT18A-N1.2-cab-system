// store/driverStore.ts — Global driver state with Zustand
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiFetch } from '@/lib/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'success' | 'info' | 'warning';
}

interface DriverStore {
  user: any | null;
  driver: any | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  isLoading: boolean;

  // Actions
  login: (token: string, user: any) => void;
  logout: () => void;
  initialize: () => void;
  setOnline: (online: boolean) => Promise<void>;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  pollActiveRides: (onNewRide: (ride: any) => void) => Promise<() => void>;
  
  // Notifications
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationsAsRead: () => void;
}

export const useDriverStore = create<DriverStore>()(
  devtools((set, get) => ({
    user: null,
    driver: null,
    isAuthenticated: false,
    isOnline: false,
    isLoading: true,
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

    login: (token, user) => {
      localStorage.setItem('cabgo_driver_token', token);
      localStorage.setItem('cabgo_driver_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('cabgo_driver_token');
      localStorage.removeItem('cabgo_driver_user');
      set({ user: null, isAuthenticated: false, isOnline: false });
    },

    initialize: () => {
      if (typeof window === 'undefined') return;
      if (get().isAuthenticated && get().user) return; // Prevent multiple initializations

      const token = localStorage.getItem('cabgo_driver_token');
      const userStr = localStorage.getItem('cabgo_driver_user');
      
      console.log('Initializing driver store...', { hasToken: !!token, hasUser: !!userStr });

      if (token && userStr && userStr !== 'undefined') {
        try {
          const userData = JSON.parse(userStr);
          set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (e) {
          console.error('Failed to parse user data:', e);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    },

    setOnline: async (online: boolean) => {
      const { user, isOnline: previousState } = get();
      const driverId = user?.id || user?._id || 'mock_driver_id';

      // Optimistic Update
      set({ isOnline: online });

      // Get real GPS location when going online, fallback to HCM center
      let location = { lat: 10.7769, lng: 106.7009 };
      if (online && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log('[Driver] Real GPS location:', location);
        } catch {
          console.warn('[Driver] GPS unavailable, using HCM center fallback');
        }
      }

      try {
        const result = await apiFetch('/drivers/status', {
          method: 'POST',
          body: JSON.stringify({
            driverId: driverId, 
            status: online ? 'ONLINE' : 'OFFLINE',
            location
          })
        });

        if (!result.success) {
          set({ isOnline: previousState });
        } else {
          set({ driver: result.data });
        }
      } catch (error: any) {
        // If driver doesn't exist, register them silently so the UI works
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          try {
            await apiFetch('/drivers/register', {
              method: 'POST',
              body: JSON.stringify({ driverId: driverId, vehiclePlate: 'UI-AUTO' })
            });
            const retryResult = await apiFetch('/drivers/status', {
              method: 'POST',
              body: JSON.stringify({
                driverId: driverId, 
                status: online ? 'ONLINE' : 'OFFLINE',
                location
              })
            });
            if (retryResult.success) {
              set({ driver: retryResult.data, isOnline: online });
              return;
            }
          } catch (e) {
            console.error('Auto-register fallback failed:', e);
          }
        }
        
        // Revert on error
        set({ isOnline: previousState });
        
        if (error.status === 401) {
          useDriverStore.getState().logout();
          window.location.href = '/login';
        }
        console.error('Status update failed:', error);
      }
    },

    updateLocation: async (lat: number, lng: number) => {
      const { user, isOnline } = get();
      if (!user || !isOnline) return;

      try {
        await apiFetch('/drivers/status', {
          method: 'POST',
          body: JSON.stringify({
            driverId: user.id || user._id, 
            status: 'ONLINE',
            location: { lat, lng }
          })
        });
      } catch (error: any) {
        if (error.status === 401) {
          useDriverStore.getState().logout();
        }
        console.error('Location sync failed:', error);
      }
    },

    pollActiveRides: async (onNewRide: (ride: any) => void) => {
      const interval = setInterval(async () => {
        const { isOnline, user } = get();
        if (!isOnline || !user) return;

        try {
          // In a real system, we might poll a "driver/tasks" endpoint
          // For now, we poll for any booking where this driver is assigned and status is REQUESTED
          const res = await apiFetch(`/bookings?driverId=${user.id || user._id}`);
          if (res.success && res.data.length > 0) {
            const activeRide = res.data.find((r: any) => r.status === 'REQUESTED');
            if (activeRide) {
              onNewRide(activeRide);
            }
          }
        } catch (err) {
          console.error('Driver polling error:', err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }))
);
