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
        body: JSON.stringify({ ...formData, role: 'driver' }),
      });

      if (result.success) {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden">
      <div className="phone-frame">
        <div className="phone-content driver-theme bg-[#0f172a] relative flex flex-col w-full h-full overflow-hidden p-6 pt-12 overflow-y-auto no-scrollbar">
          
          <Link href="/login" className="z-10 absolute top-12 left-6 text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-black text-[10px] tracking-widest uppercase">
             <ChevronLeft size={16} /> TRỞ LẠI
          </Link>

          <div className="z-10 mt-12 mb-8 text-center">
            <h1 className="text-3xl font-black text-white italic tracking-tight italic">ĐĂNG KÝ ĐỐI TÁC</h1>
            <p className="text-slate-400 font-bold text-sm tracking-tight">Gia nhập đội ngũ CabGo chuyên nghiệp.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 z-10 pb-12">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-[10px] font-black uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 focus-within:border-brand-500 transition-all group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Họ và tên</p>
              <div className="flex items-center gap-3">
                <User size={16} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 focus-within:border-brand-500 transition-all group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Email</p>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 focus-within:border-brand-500 transition-all group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Số điện thoại</p>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 focus-within:border-brand-500 transition-all group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Biển số xe</p>
              <div className="flex items-center gap-3">
                <Car size={16} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="text" 
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
                  placeholder="VD: 51A-123.45"
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 focus-within:border-brand-500 transition-all group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Mật khẩu</p>
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center pt-5"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'HOÀN TẤT ĐĂNG KÝ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
