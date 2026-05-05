// ============================================================
// backend/microservices/api.ts — Base API client with JWT interceptors
// ============================================================
import type { ApiError } from '@cab/types';

const BASE_URLS: Record<string, string> = {
  auth:         process.env.NEXT_PUBLIC_AUTH_SERVICE_URL    || 'http://localhost:3001',
  booking:      process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:3002',
  ride:         process.env.NEXT_PUBLIC_RIDE_SERVICE_URL    || 'http://localhost:3003',
  driver:       process.env.NEXT_PUBLIC_DRIVER_SERVICE_URL  || 'http://localhost:3004',
  payment:      process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || 'http://localhost:3005',
  pricing:      process.env.NEXT_PUBLIC_PRICING_SERVICE_URL || 'http://localhost:3006',
  notification: process.env.NEXT_PUBLIC_NOTIF_SERVICE_URL   || 'http://localhost:3007',
  gateway:      process.env.NEXT_PUBLIC_API_GATEWAY_URL     || 'http://localhost:8080',
};

// Token management
const TOKEN_KEY  = 'cab_access_token';
const REFRESH_KEY = 'cab_refresh_token';

export const tokenStorage = {
  getAccess:    ()        => localStorage.getItem(TOKEN_KEY),
  getRefresh:   ()        => localStorage.getItem(REFRESH_KEY),
  setTokens:    (a: string, r: string) => {
    localStorage.setItem(TOKEN_KEY, a);
    localStorage.setItem(REFRESH_KEY, r);
  },
  clear:        ()        => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Refresh flag to prevent concurrent refresh loops
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
}

// Core fetch wrapper
async function request<T>(
  service: keyof typeof BASE_URLS,
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = tokenStorage.getAccess();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const url = `${BASE_URLS[service]}${path}`;
  const res = await fetch(url, { ...options, headers });

  // Handle 401 — try refresh
  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            headers['Authorization'] = `Bearer ${token}`;
            resolve(request<T>(service, path, { ...options, headers }, false));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const refreshToken = tokenStorage.getRefresh();

    try {
      const refreshRes = await fetch(`${BASE_URLS.auth}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) throw new Error('Refresh failed');

      const { data } = await refreshRes.json();
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      processQueue(null, data.accessToken);

      // Retry original request
      return request<T>(service, path, options, false);
    } catch (err) {
      processQueue(err);
      tokenStorage.clear();
      window.location.href = '/login';
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    let error: ApiError;
    try { error = await res.json(); }
    catch { error = { message: 'Network error', code: 'NETWORK_ERROR', statusCode: res.status }; }
    throw error;
  }

  return res.json() as Promise<T>;
}

// HTTP methods
export const api = {
  get:    <T>(service: keyof typeof BASE_URLS, path: string) =>
    request<T>(service, path, { method: 'GET' }),

  post:   <T>(service: keyof typeof BASE_URLS, path: string, body: unknown) =>
    request<T>(service, path, { method: 'POST', body: JSON.stringify(body) }),

  put:    <T>(service: keyof typeof BASE_URLS, path: string, body: unknown) =>
    request<T>(service, path, { method: 'PUT', body: JSON.stringify(body) }),

  patch:  <T>(service: keyof typeof BASE_URLS, path: string, body: unknown) =>
    request<T>(service, path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(service: keyof typeof BASE_URLS, path: string) =>
    request<T>(service, path, { method: 'DELETE' }),
};
