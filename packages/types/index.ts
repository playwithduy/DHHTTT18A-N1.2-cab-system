// ============================================================
// @cab/types — Shared Types for the Cab Booking System
// ============================================================

// ─── Auth ────────────────────────────────────────────────────
export type UserRole = 'customer' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Location ────────────────────────────────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location extends LatLng {
  address: string;
  placeId?: string;
}

// ─── Driver ─────────────────────────────────────────────────
export type DriverStatus = 'online' | 'offline' | 'on_trip';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  phone: string;
  rating: number;
  totalRides: number;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
  status: DriverStatus;
  location: LatLng;
  eta?: number; // minutes
}

// ─── Vehicle / Ride Types ────────────────────────────────────
export type VehicleType = 'bike' | 'car' | 'premium' | 'xl';

export interface RideOption {
  type: VehicleType;
  label: string;
  description: string;
  icon: string;
  basePrice: number;
  pricePerKm: number;
  eta: number; // minutes
  capacity: number;
}

// ─── Booking / Ride ──────────────────────────────────────────
export type RideStatus =
  | 'pending'
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'payment_failed';

export interface Ride {
  id: string;
  customerId: string;
  driverId?: string;
  driver?: Driver;
  pickup: Location;
  dropoff: Location;
  status: RideStatus;
  vehicleType: VehicleType;
  fare: Fare;
  distance: number; // km
  duration: number; // minutes
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  rating?: number;
  review?: string;
}

export interface Fare {
  base: number;
  distance: number;
  surge: number;
  total: number;
  currency: string;
}

export interface BookingRequest {
  pickup: Location;
  dropoff: Location;
  vehicleType: VehicleType;
}

// ─── Payment ─────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'wallet' | 'cash';

export interface Payment {
  id: string;
  rideId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
}

// ─── WebSocket Events ────────────────────────────────────────
export type SocketEvent =
  | 'ride:created'
  | 'ride:driver_assigned'
  | 'ride:status_changed'
  | 'driver:location_updated'
  | 'payment:success'
  | 'payment:failed'
  | 'notification:new';

export interface SocketMessage<T = unknown> {
  event: SocketEvent;
  data: T;
  timestamp: string;
}

// ─── Notification ────────────────────────────────────────────
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Admin / Analytics ───────────────────────────────────────
export interface DashboardStats {
  totalRides: number;
  activeRides: number;
  totalRevenue: number;
  activeDrivers: number;
  totalUsers: number;
  avgRating: number;
  ridesGrowth: number; // percentage
  revenueGrowth: number;
}

export interface RideFilters {
  status?: RideStatus;
  vehicleType?: VehicleType;
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

// ─── API Responses ───────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}
