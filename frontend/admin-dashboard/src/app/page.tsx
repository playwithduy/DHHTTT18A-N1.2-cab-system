'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Car, MapPin, DollarSign, Settings,
  TrendingUp, TrendingDown, Activity, Bell, Search, ChevronRight,
  Eye, Edit, Trash2, MoreVertical, CheckCircle, XCircle, Clock,
  ArrowUpRight, ArrowDownRight, Shield, Globe, Box, Zap, AlertTriangle,
  LogOut, Filter, Download, Plus, Menu
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { MOCK_DASHBOARD_STATS, MOCK_RIDES, MOCK_DRIVERS, MOCK_REVENUE_CHART } from '@/types/mock-data';

// Dynamically import OSMMap
const OSMMap = dynamic<any>(() => import('@/components/map/OSMMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">Loading Fleet Map...</div>,
});

function cn(...c: (string|false|undefined)[]) { return c.filter(Boolean).join(' '); }
function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n).replace('₫', 'đ');
}

type ActiveTab = 'dashboard' | 'fleet' | 'users' | 'revenue' | 'ai' | 'security' | 'settings';

// ─── KPI Component ─────────────────────────────────────────────

function StatCard({ label, value, trend, icon: Icon, color }: any) {
  const isPositive = trend >= 0;
  return (
    <div className="glass rounded-[2rem] p-6 card-shadow border-white/40 flex-1 min-w-[240px] animate-fade-in-up">
       <div className="flex items-start justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
             <Icon size={24} />
          </div>
          <div className={cn("flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full", isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
             {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
             {Math.abs(trend)}%
          </div>
       </div>
       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
       <h3 className="text-slate-800 font-black text-3xl tracking-tight">{value}</h3>
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────

function Sidebar({ active, setActive }: any) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'fleet', icon: Car, label: 'Đội xe & Tài xế' },
    { id: 'users', icon: Users, label: 'Khách hàng' },
    { id: 'revenue', icon: DollarSign, label: 'Doanh thu' },
    { id: 'ai', icon: Zap, label: 'Hệ thống AI' },
    { id: 'security', icon: Shield, label: 'Bảo mật' },
    { id: 'settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <aside className="w-72 sidebar-gradient flex flex-col h-screen p-6">
       <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
             <Box size={24} />
          </div>
          <div>
             <h1 className="text-white font-black text-xl tracking-tight">CabGo</h1>
             <p className="text-sky-400/60 text-[10px] font-black uppercase tracking-widest leading-none">Console v2.0</p>
          </div>
       </div>

       <nav className="flex-1 space-y-2">
          {items.map(item => (
             <button 
                key={item.id}
                onClick={() => setActive(item.id)}
                className={cn(
                   "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[13px] transition-all",
                   active === item.id ? "bg-white/10 text-white shadow-inner" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
             >
                <item.icon size={20} className={active === item.id ? "text-sky-400" : ""} />
                {item.label}
             </button>
          ))}
       </nav>

       <div className="pt-6 border-t border-white/5">
          <div className="bg-white/5 rounded-3xl p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-sm">AD</div>
             <div className="flex-1 overflow-hidden">
                <p className="text-white font-black text-sm truncate">Admin User</p>
                <p className="text-slate-500 text-xs truncate">root@cabgo.vn</p>
             </div>
             <LogOut size={18} className="text-slate-500 cursor-pointer hover:text-rose-400 transition-colors" />
          </div>
       </div>
    </aside>
  );
}

// ─── Dashboard View ────────────────────────────────────────────

function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('cabgo_token');
        const res = await fetch('http://localhost:8080/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !stats) return <div className="h-96 flex items-center justify-center font-black text-slate-400 animate-pulse">Đang tải dữ liệu thực tế...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="flex flex-wrap gap-6">
          <StatCard label="Tổng chuyến đi" value={stats.totalRides.toLocaleString()} trend={stats.ridesGrowth} icon={MapPin} color="bg-sky-500" />
          <StatCard label="Doanh thu (VND)" value={formatCurrency(stats.totalRevenue)} trend={stats.revenueGrowth} icon={DollarSign} color="bg-emerald-500" />
          <StatCard label="Chuyến đang chạy" value={stats.activeRides} trend={5.2} icon={Activity} color="bg-amber-500" />
          <StatCard label="Tài xế Online" value={stats.activeDrivers} trend={0} icon={Zap} color="bg-indigo-500" />
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Real-time Tracking Map */}
          <div className="xl:col-span-2 glass rounded-[2.5rem] overflow-hidden card-shadow border-white/40 h-[450px] relative">
             <div className="absolute top-6 left-6 z-10 glass px-4 py-2 rounded-2xl flex items-center gap-3">
                <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-slate-800 font-black text-xs uppercase tracking-widest">Giám sát đội xe trực tiếp</span>
             </div>
             <OSMMap />
          </div>

          <div className="glass rounded-[2.5rem] p-8 card-shadow border-white/40 flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-slate-800 font-black text-lg">Top Tài xế</h3>
                <Filter size={18} className="text-slate-400" />
             </div>
             <div className="flex-1 space-y-6">
                {MOCK_DRIVERS.slice(0, 5).map((d, i) => (
                   <div key={d.id} className="flex items-center gap-4 group">
                      <div className="relative">
                         <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden font-black border border-slate-200">
                            {d.name[0]}
                         </div>
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white" />
                      </div>
                      <div className="flex-1">
                         <p className="text-slate-800 font-black text-sm">{d.name}</p>
                         <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{d.totalRides} chuyến</p>
                      </div>
                      <div className="text-right">
                         <div className="flex items-center gap-1 justify-end text-amber-500">
                            <Star size={14} className="fill-amber-500" />
                            <span className="font-black text-xs">{d.rating}</span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
             <button className="w-full mt-8 py-4 bg-slate-50 text-slate-800 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Xem tất cả</button>
          </div>
       </div>

       {/* Recent Rides Table */}
       <div className="glass rounded-[2.5rem] overflow-hidden card-shadow border-white/40">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
             <div>
                <h3 className="text-slate-800 font-black text-lg">Lịch sử Chuyến đi</h3>
                <p className="text-slate-400 text-xs font-medium">Dữ liệu từ 60 testcase certification</p>
             </div>
             <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-slate-50 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-100 flex items-center gap-2 transition-all">
                   <Download size={16} /> Xuất báo cáo
                </button>
                <button className="px-5 py-2.5 bg-sky-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 flex items-center gap-2 transition-all">
                   <Plus size={16} /> Tạo mới
                </button>
             </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/50">
                      <th className="px-8 py-4">Mã số</th>
                      <th className="px-8 py-4">Khách hàng</th>
                      <th className="px-8 py-4">Tài xế</th>
                      <th className="px-8 py-4">Hành trình</th>
                      <th className="px-8 py-4">Giá cước</th>
                      <th className="px-8 py-4">Trạng thái</th>
                      <th className="px-8 py-4">Thao tác</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {MOCK_RIDES.map(ride => (
                      <tr key={ride.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-8 py-5 text-xs font-black text-slate-400">{ride.id.slice(-6)}</td>
                         <td className="px-8 py-5">
                            <p className="text-slate-800 font-black text-sm">Khách #{ride.customerId.slice(-3)}</p>
                            <p className="text-slate-400 text-[10px] font-bold">Standard Account</p>
                         </td>
                         <td className="px-8 py-5 text-sm font-black text-slate-600">
                            {ride.driver?.name || '---'}
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-slate-800 font-bold text-xs truncate max-w-[200px]">{ride.pickup.address}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <ArrowRight size={12} className="text-slate-300" />
                               <p className="text-slate-400 font-bold text-xs truncate max-w-[200px]">{ride.dropoff.address}</p>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <span className="font-black text-slate-800">{formatCurrency(ride.fare.total)}</span>
                         </td>
                         <td className="px-8 py-5">
                            <span className={cn(
                               "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                               ride.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"
                            )}>
                               {ride.status === 'completed' ? 'Hoàn tất' : 'Đang xử lý'}
                            </span>
                         </td>
                         <td className="px-8 py-5">
                            <button className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-sky-500 transition-colors">
                               <MoreVertical size={18} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}

// ─── Root Layout ───────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [active, setActive] = useState<ActiveTab>('dashboard');

  return (
    <div className="flex h-screen w-screen overflow-hidden gradient-bg">
       <Sidebar active={active} setActive={setActive} />
       
       <main className="flex-1 flex flex-col min-w-0">
          <header className="px-10 py-6 flex items-center justify-between">
             <div>
                <h2 className="text-slate-800 font-black text-2xl tracking-tight">Hệ thống Quản lý CabGo</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Hôm nay, {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
             
             <div className="flex items-center gap-6">
                <div className="relative group">
                   <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                   <input 
                      placeholder="Tìm kiếm tài xế, chuyến đi..." 
                      className="w-72 bg-white/50 border border-slate-200 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all outline-none"
                   />
                </div>
                <div className="flex items-center gap-3">
                   <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-400 relative">
                      <Bell size={22} />
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-4 border-white" />
                   </button>
                   <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-400">
                      <Globe size={22} />
                   </button>
                </div>
             </div>
          </header>

          <section className="flex-1 overflow-y-auto px-10 pb-12 no-scrollbar">
             {active === 'dashboard' && <DashboardHome />}
             {active !== 'dashboard' && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                   <div className="w-24 h-24 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-300 mb-6">
                      <Zap size={48} />
                   </div>
                   <h3 className="text-slate-800 font-black text-2xl mb-2">Module "{active.toUpperCase()}" đang cập nhật</h3>
                   <p className="text-slate-400 font-medium max-w-sm">Hệ thống đang đồng bộ dữ liệu AI từ các microservices. Vui lòng quay lại sau.</p>
                </div>
             )}
          </section>
       </main>
    </div>
  );
}
