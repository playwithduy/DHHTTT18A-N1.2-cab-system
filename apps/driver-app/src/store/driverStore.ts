// store/driverStore.ts — Global driver state with Zustand
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiFetch } from '@/lib/api';

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
}

export const useDriverStore = create<DriverStore>()(
  devtools((set, get) => ({
    user: null,
    driver: null,
    isAuthenticated: false,
    isOnline: false,
    isLoading: true,

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
      const token = localStorage.getItem('cabgo_driver_token');
      const userStr = localStorage.getItem('cabgo_driver_user');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    },

    setOnline: async (online: boolean) => {
      const { user } = get();
      if (!user) return;

      try {
        const result = await apiFetch('/drivers/status', {
          method: 'POST',
          body: JSON.stringify({
            driverId: user.id || user._id, // Support MongoDB ID format
            status: online ? 'ONLINE' : 'OFFLINE',
            location: { lat: 10.7769, lng: 106.7009 } // Mock current location
          })
        });

        if (result.success) {
          set({ isOnline: online, driver: result.data });
        }
      } catch (error: any) {
        if (error.status === 401) {
          useDriverStore.getState().logout();
          window.location.href = '/login';
        }
        console.error('Status update failed:', error);
        throw error;
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
    }
  }))
);
