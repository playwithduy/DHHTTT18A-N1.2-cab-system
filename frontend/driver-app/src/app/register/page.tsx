'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, User, Phone, Car, Loader2, ChevronLeft, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

function cn(...classes: (string | false | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

export default function DriverRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    licensePlate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...formData, role: 'DRIVER' }),
      });

      if (result.success) {
        // Also create driver profile
        await apiFetch('/drivers/register', {
          method: 'POST',
          body: JSON.stringify({
            driverId: result.user_id,
            vehicleModel: 'Unknown', // The UI doesn't collect this yet, use a default
            vehiclePlate: formData.licensePlate,
            vehicleType: 'car'
          })
        });
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-white relative overflow-hidden p-6 pt-16 no-scrollbar overflow-y-auto animate-fade-in">
      
      <div className="z-10 mt-8 mb-8 text-center">
        <h1 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">ĐĂNG KÝ ĐỐI TÁC</h1>
        <p className="text-slate-400 font-bold text-xs tracking-tight uppercase">Gia nhập đội ngũ CabGo chuyên nghiệp.</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-3 z-10 pb-12">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-red-500 text-[10px] font-black uppercase tracking-tight">{error}</p>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Họ và tên</p>
          <div className="flex items-center gap-3">
            <User size={18} className="text-slate-300 group-focus-within:text-primary" />
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nguyễn Văn A"
              className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
              required
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Email</p>
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-slate-300 group-focus-within:text-primary" />
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="driver@cabgo.vn"
              className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
              required
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Số điện thoại</p>
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-slate-300 group-focus-within:text-primary" />
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="0987123456"
              className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
              required
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Biển số xe</p>
          <div className="flex items-center gap-3">
            <Car size={18} className="text-slate-300 group-focus-within:text-primary" />
            <input 
              type="text" 
              value={formData.licensePlate}
              onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
              placeholder="VD: 51A-123.45"
              className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
              required
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Mật khẩu</p>
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-slate-300 group-focus-within:text-primary" />
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
              className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center uppercase text-[12px] tracking-widest mt-4"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : 'HOÀN TẤT ĐĂNG KÝ'}
        </button>
      </form>
      
      <p className="text-center text-slate-400 text-xs font-bold pb-10 uppercase tracking-widest">
        Đã có tài khoản? <Link href="/login" className="text-primary font-black hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}
