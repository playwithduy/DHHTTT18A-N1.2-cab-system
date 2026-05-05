// ============================================================
// Mock Data — Shared across Customer, Driver, Admin apps
// ============================================================
import type {
  User, Driver, Ride, RideOption, DashboardStats, Payment, Notification
} from './index';

// ─── Users ───────────────────────────────────────────────────
export const MOCK_CUSTOMER: User = {
  id: 'usr_001',
  email: 'nguyen.van.a@gmail.com',
  phone: '0901234567',
  name: 'Nguyễn Văn A',
  role: 'customer',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer1',
  createdAt: '2024-01-15T08:00:00Z',
};

export const MOCK_DRIVER: Driver = {
  id: 'drv_001',
  userId: 'usr_101',
  name: 'Trần Minh B',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver1',
  phone: '0912345678',
  rating: 4.8,
  totalRides: 1247,
  vehicleType: 'car',
  vehiclePlate: '51F-123.45',
  vehicleModel: 'Toyota Vios',
  vehicleColor: 'Trắng',
  status: 'online',
  location: { lat: 10.7769, lng: 106.7009 },
  eta: 4,
};

export const MOCK_DRIVERS: Driver[] = [
  MOCK_DRIVER,
  {
    id: 'drv_002',
    userId: 'usr_102',
    name: 'Lê Văn C',
    phone: '0923456789',
    rating: 4.6,
    totalRides: 856,
    vehicleType: 'premium',
    vehiclePlate: '51G-456.78',
    vehicleModel: 'Honda Accord',
    vehicleColor: 'Đen',
    status: 'online',
    location: { lat: 10.7789, lng: 106.7029 },
    eta: 7,
  },
];

// ─── Ride Options ─────────────────────────────────────────────
export const MOCK_RIDE_OPTIONS: RideOption[] = [
  {
    type: 'bike',
    label: 'GrabBike',
    description: 'Xe máy nhanh, tiết kiệm',
    icon: '🏍️',
    basePrice: 13000, 
    pricePerKm: 4500,
    eta: 3,
    capacity: 1,
  },
  {
    type: 'car',
    label: 'GrabCar',
    description: 'Xe 4 chỗ thoải mái',
    icon: '🚗',
    basePrice: 28000, 
    pricePerKm: 11000,
    eta: 5,
    capacity: 4,
  },
  {
    type: 'premium',
    label: 'GrabCar Premium',
    description: 'Xe cao cấp, sang trọng',
    icon: '🚙',
    basePrice: 35000, 
    pricePerKm: 14500,
    eta: 8,
    capacity: 4,
  },
  {
    type: 'xl',
    label: 'GrabCar XL',
    description: 'Xe 7 chỗ gia đình',
    icon: '🚐',
    basePrice: 32000, 
    pricePerKm: 13000,
    eta: 6,
    capacity: 7,
  },
];

// ─── Rides ───────────────────────────────────────────────────
export const MOCK_RIDES: Ride[] = [
  {
    id: 'ride_001',
    customerId: 'usr_001',
    driverId: 'drv_001',
    driver: MOCK_DRIVER,
    pickup: {
      lat: 10.7769, lng: 106.7009,
      address: 'Landmark 81, Bình Thạnh, TP.HCM',
    },
    dropoff: {
      lat: 10.7614, lng: 106.6824,
      address: 'Bến Thành, Quận 1, TP.HCM',
    },
    status: 'completed',
    vehicleType: 'car',
    fare: { base: 15000, distance: 42500, surge: 0, total: 57500, currency: 'VND' },
    distance: 5.2,
    duration: 22,
    createdAt: '2024-03-15T14:30:00Z',
    completedAt: '2024-03-15T14:52:00Z',
    rating: 5,
  },
  {
    id: 'ride_002',
    customerId: 'usr_001',
    driverId: 'drv_002',
    pickup: {
      lat: 10.8231, lng: 106.6297,
      address: 'Sân bay Tân Sơn Nhất, Tân Bình',
    },
    dropoff: {
      lat: 10.7614, lng: 106.6824,
      address: 'Bến Thành, Quận 1, TP.HCM',
    },
    status: 'completed',
    vehicleType: 'premium',
    fare: { base: 25000, distance: 95000, surge: 15000, total: 135000, currency: 'VND' },
    distance: 7.8,
    duration: 35,
    createdAt: '2024-03-10T09:00:00Z',
    completedAt: '2024-03-10T09:35:00Z',
    rating: 4,
  },
];

// ─── Dashboard Stats ─────────────────────────────────────────
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalRides: 48291,
  activeRides: 234,
  totalRevenue: 2847500000,
  activeDrivers: 1847,
  totalUsers: 125430,
  avgRating: 4.72,
  ridesGrowth: 12.4,
  revenueGrowth: 18.7,
};

// ─── Revenue Chart Data ───────────────────────────────────────
export const MOCK_REVENUE_CHART = [
  { month: 'T1', revenue: 185000000, rides: 3200 },
  { month: 'T2', revenue: 210000000, rides: 3800 },
  { month: 'T3', revenue: 195000000, rides: 3500 },
  { month: 'T4', revenue: 280000000, rides: 5100 },
  { month: 'T5', revenue: 320000000, rides: 5800 },
  { month: 'T6', revenue: 298000000, rides: 5400 },
  { month: 'T7', revenue: 350000000, rides: 6200 },
];

// ─── Notifications ────────────────────────────────────────────
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_001',
    type: 'success',
    title: 'Chuyến đi hoàn thành',
    message: 'Cảm ơn bạn đã sử dụng dịch vụ! Đánh giá chuyến đi của bạn.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif_002',
    type: 'info',
    title: 'Khuyến mãi mới',
    message: 'Giảm 20% cho 5 chuyến đi tiếp theo. Áp dụng đến 31/3.',
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

// ─── Simulated GPS Path (HCMC) ────────────────────────────────
export const MOCK_GPS_PATH: Array<{ lat: number; lng: number }> = [
  { lat: 10.7769, lng: 106.7009 },
  { lat: 10.7755, lng: 106.6998 },
  { lat: 10.7740, lng: 106.6985 },
  { lat: 10.7722, lng: 106.6960 },
  { lat: 10.7700, lng: 106.6940 },
  { lat: 10.7680, lng: 106.6910 },
  { lat: 10.7660, lng: 106.6880 },
  { lat: 10.7640, lng: 106.6855 },
  { lat: 10.7620, lng: 106.6840 },
  { lat: 10.7614, lng: 106.6824 },
];
