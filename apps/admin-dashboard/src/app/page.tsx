'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, Car, MapPin, DollarSign, Settings,
  TrendingUp, TrendingDown, Activity, Bell, Search, ChevronRight,
  Eye, Edit, Trash2, MoreVertical, CheckCircle, XCircle, Clock,
  ArrowUpRight, ArrowDownRight, Shield
} from 'lucide-react';
import { MOCK_DASHBOARD_STATS, MOCK_RIDES, MOCK_DRIVERS, MOCK_REVENUE_CHART } from '@/types/mock-data';

function cn(...c: (string|false|undefined)[]) { return c.filter(Boolean).join(' '); }
function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n) + 'đ';
}

type ActiveTab = 'dashboard' | 'users' | 'drivers' | 'rides' | 'pricing' | 'intelligence' | 'security';

// ─── Sidebar ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'users',     icon: Users,           label: 'Người dùng' },
  { id: 'drivers',   icon: Car,             label: 'Tài xế' },
  { id: 'rides',     icon: MapPin,          label: 'Chuyến đi' },
  { id: 'pricing',   icon: DollarSign,      label: 'Giá cước' },
  { id: 'intelligence', icon: Activity,      label: 'AI & Integrity' },
  { id: 'security',  icon: Shield,          label: 'Bảo mật' },
] as const;

function Sidebar({ active, onChange }: { active: ActiveTab; onChange: (t: ActiveTab) => void }) {
  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm">CabGo Admin</p>
            <p className="text-xs text-slate-400">Management Console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id as ActiveTab)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              active === item.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div>
            <p className="text-white text-xs font-medium">Admin User</p>
            <p className="text-slate-500 text-xs">admin@cabgo.vn</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({ label, value, sub, growth, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  growth?: number; icon: React.ElementType; color: string;
}) {
  const isPositive = (growth ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={20} className="text-white" />
        </div>
        {growth !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
      <p className="text-slate-500 text-sm">{label}</p>
      {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────
function MiniBarChart() {
  const max = Math.max(...MOCK_REVENUE_CHART.map(d => d.revenue));
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">Doanh thu 7 tháng</h3>
          <p className="text-sm text-slate-500">Tổng: {formatCurrency(MOCK_REVENUE_CHART.reduce((s,d)=>s+d.revenue,0))}</p>
        </div>
        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1 rounded-lg">+18.7%</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {MOCK_REVENUE_CHART.map((d, i) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-full rounded-t-lg transition-all',
                i === MOCK_REVENUE_CHART.length - 1 ? 'bg-brand-500' : 'bg-brand-200'
              )}
              style={{ height: `${(d.revenue / max) * 100}%`, minHeight: '8px' }}
            />
            <span className="text-xs text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Rides Table ─────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  completed:       'bg-green-50 text-green-700 border-green-200',
  in_progress:     'bg-blue-50 text-blue-700 border-blue-200',
  driver_assigned: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled:       'bg-red-50 text-red-700 border-red-200',
  pending:         'bg-slate-50 text-slate-600 border-slate-200',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành', in_progress: 'Đang đi', driver_assigned: 'Đã phân công',
  cancelled: 'Đã huỷ', pending: 'Chờ',
};

function RidesTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Chuyến đi gần đây</h3>
        <button className="text-brand-500 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
          Xem tất cả <ChevronRight size={16} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-slate-50">
              {['ID', 'Khách hàng', 'Tài xế', 'Điểm đi → Đến', 'Fare', 'Trạng thái', ''].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_RIDES.map((ride, i) => (
              <tr key={ride.id} className={cn('border-t border-slate-50 hover:bg-slate-50/50 transition-colors', i % 2 === 0 ? '' : 'bg-slate-50/30')}>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{ride.id.slice(-6)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600">K</div>
                    <span className="text-sm font-medium text-slate-700">Khách #{ride.customerId.slice(-3)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {ride.driver
                    ? <span className="text-sm text-slate-700">{ride.driver.name}</span>
                    : <span className="text-xs text-slate-400">Chưa phân công</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-500 max-w-40 truncate">{ride.pickup.address}</div>
                  <div className="text-xs text-slate-700 font-medium max-w-40 truncate">{ride.dropoff.address}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">
                    {new Intl.NumberFormat('vi-VN').format(ride.fare.total)}đ
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-lg border', STATUS_STYLE[ride.status])}>
                    {STATUS_LABEL[ride.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreVertical size={16} className="text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────
function DashboardView() {
  const s = MOCK_DASHBOARD_STATS;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Tổng chuyến đi" value={s.totalRides.toLocaleString('vi-VN')} growth={s.ridesGrowth} icon={MapPin} color="bg-brand-500" />
        <KPICard label="Doanh thu" value={formatCurrency(s.totalRevenue)} growth={s.revenueGrowth} icon={DollarSign} color="bg-purple-500" />
        <KPICard label="Tài xế hoạt động" value={s.activeDrivers.toLocaleString('vi-VN')} icon={Car} color="bg-blue-500" />
        <KPICard label="Chuyến đang chạy" value={s.activeRides.toString()} sub="Real-time" icon={Activity} color="bg-amber-500" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><MiniBarChart /></div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Tài xế hàng đầu</h3>
          <div className="space-y-3">
            {MOCK_DRIVERS.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-300 w-5">{i+1}</span>
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600">
                  {d.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.totalRides} chuyến</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-amber-500">★ {d.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RidesTable />
    </div>
  );
}

// ─── Placeholder Views ────────────────────────────────────────
function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white">
      <p className="text-4xl mb-3">🚧</p>
      <p className="font-bold text-slate-700 text-lg">{title}</p>
      <p className="text-slate-500 text-sm mt-1">{description}</p>
    </div>
  );
}

// ─── Intelligence & Integrity View ────────────────────────────
function IntelligenceView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">AI Model Version</h3>
          <p className="text-2xl font-bold text-brand-600">v1.2.0-Agentic</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-green-600 font-medium">
            <CheckCircle size={12} /> Status: Online
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">P95 Latency</h3>
          <p className="text-2xl font-bold text-slate-800">12ms</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-brand-600 font-medium font-mono">
            Limit: 200ms
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Drift Status</h3>
          <p className="text-2xl font-bold text-green-600">Healthy</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            Acceptance Rate: 82%
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Transactional Integrity Log (Outbox)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status of atomic event publishing</p>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">ride_requested event PROCESSED</p>
                    <p className="text-xs font-mono text-slate-400">ID: b8f3...a78e | Saga Stage: 4</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Atomic Commit</p>
                  <p className="text-[10px] text-slate-400">2 mins ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const pageTitle: Record<ActiveTab, string> = {
    dashboard: 'Dashboard Tổng Quan',
    users:     'Quản lý Người Dùng',
    drivers:   'Quản lý Tài Xế',
    rides:     'Quản lý Chuyến Đi',
    pricing:   'Quản lý Giá Cước',
    intelligence: 'AI & Transactional Integrity',
    security:  'Bảo mật & Logs',
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar active={activeTab} onChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-slate-800 text-xl">{pageTitle[activeTab]}</h1>
            <p className="text-slate-400 text-xs mt-0.5">CabGo Management • TP.HCM</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Tìm kiếm..."
                className="pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-xl border border-transparent focus:border-brand-300 focus:bg-white outline-none transition-all w-48"
              />
            </div>
            <button className="relative w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
              <Bell size={16} className="text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'users' && (
            <PlaceholderView title="Quản lý Người Dùng" description="Bảng quản lý khách hàng và phân quyền" />
          )}
          {activeTab === 'drivers' && (
            <PlaceholderView title="Quản lý Tài Xế" description="KYC, trạng thái, hiệu suất tài xế" />
          )}
          {activeTab === 'rides' && <RidesTable />}
          {activeTab === 'pricing' && (
            <PlaceholderView title="Giá Cước & Surge Pricing" description="AI surge pricing, cài đặt theo khu vực" />
          )}
          {activeTab === 'intelligence' && <IntelligenceView />}
          {activeTab === 'security' && (
            <PlaceholderView title="Zero Trust Security" description="Audit logs, mTLS, JWT management" />
          )}
        </div>
      </main>
    </div>
  );
}
