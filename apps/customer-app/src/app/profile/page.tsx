'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { 
  ArrowLeft, User, Mail, Phone, 
  Settings, CreditCard, Shield, 
  LogOut, Star, MapPin, Camera,
  ChevronRight, Heart
} from 'lucide-react';
import Link from 'next/link';
import showToast from '@/components/ui/Toast';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const user = {
    name: 'Nguyễn Văn Duy',
    email: 'duy.nv@example.com',
    phone: '+84 987 654 321',
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
    rating: 4.9,
    totalRides: 124,
    memberSince: 'Tháng 10, 2023'
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-6 font-bold flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hồ sơ</h1>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsEditing(!isEditing)}
          className="text-brand-500 font-bold"
        >
          {isEditing ? 'Hủy' : 'Chỉnh sửa'}
        </Button>
      </header>

      <div className="px-6 py-8 space-y-8">
        
        {/* Profile Card */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white shadow-xl rotate-3 transition-transform group-hover:rotate-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-500 text-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white transition-all active:scale-90">
              <Camera size={18} />
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.name}</h2>
            <p className="text-slate-500 font-semibold text-sm">Thành viên từ {user.memberSince}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" size={16} />
              <span className="font-bold text-slate-800">{user.rating}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
              <MapPin className="text-brand-500" size={16} />
              <span className="font-bold text-slate-800">{user.totalRides} chuyến</span>
            </div>
          </div>
        </section>

        {/* Info Fields */}
        <section className="space-y-4">
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Input label="Họ và tên" defaultValue={user.name} leftIcon={<User size={18} />} />
              <Input label="Email" defaultValue={user.email} leftIcon={<Mail size={18} />} />
              <Input label="Số điện thoại" defaultValue={user.phone} leftIcon={<Phone size={18} />} />
              <Button size="xl" onClick={() => {
                setIsEditing(false);
                showToast.success("Cập nhật thông tin thành công!");
              }}>Lưu thay đổi</Button>
            </div>
          ) : (
            <Card padding="none" className="divide-y divide-slate-50">
              <MenuLink icon={<User size={18} />} label="Thông tin cá nhân" value={user.name} />
              <MenuLink icon={<Phone size={18} />} label="Số điện thoại" value={user.phone} />
              <MenuLink icon={<Mail size={18} />} label="Email" value={user.email} />
            </Card>
          )}
        </section>

        {/* Action Menu */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cài đặt & Bảo mật</h3>
          <Card padding="none" className="divide-y divide-slate-50">
            <MenuLink icon={<CreditCard size={18} />} label="Phương thức thanh toán" />
            <MenuLink icon={<Heart size={18} />} label="Địa điểm đã lưu" />
            <MenuLink icon={<Shield size={18} />} label="Bảo mật tài khoản" />
            <MenuLink icon={<Settings size={18} />} label="Cài đặt ứng dụng" />
          </Card>
        </section>

        {/* Logout */}
        <section className="pt-4">
          <Button 
            variant="danger" 
            size="xl" 
            leftIcon={<LogOut size={20} />}
            className="rounded-[32px] bg-red-50 text-red-600 border-2 border-red-50 hover:bg-red-100 shadow-none"
            onClick={() => showToast.info("Đã đăng xuất!")}
          >
            Đăng xuất
          </Button>
        </section>

      </div>
    </div>
  );
}

function MenuLink({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
  return (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 transition-colors group-hover:bg-white group-hover:text-brand-500">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <span className="text-base font-bold text-slate-800">{value || 'Chưa thiết lập'}</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500 translate-x-0 group-hover:translate-x-1 transition-all" />
    </div>
  );
}
