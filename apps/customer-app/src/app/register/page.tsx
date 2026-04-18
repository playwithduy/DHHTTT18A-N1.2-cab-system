'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Mail, Lock, User, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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
        body: JSON.stringify({ ...formData, role: 'CUSTOMER' }),
      });

      if (result.success) {
        toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden">
      <div className="phone-frame">
        <div className="phone-content bg-slate-900 relative flex flex-col w-full h-full overflow-hidden p-6 overflow-y-auto no-scrollbar animate-fade-in">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-accent-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 py-10">
        <div className="animate-slide-up">
          <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center shadow-2xl mb-6 mx-auto">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2 text-center">Tạo tài khoản mới</h1>
          <p className="text-slate-400 mb-8 font-medium text-center text-sm">Gia nhập cộng đồng CabGo ngay hôm nay.</p>
          
          <form onSubmit={handleRegister} className="space-y-3">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 focus-within:border-brand-500 transition-colors group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-brand-500">Họ và tên</p>
              <div className="flex items-center gap-3">
                <User size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 focus-within:border-brand-500 transition-colors group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-brand-500">Email</p>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 focus-within:border-brand-500 transition-colors group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-brand-500">Số điện thoại</p>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0987123456"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 focus-within:border-brand-500 transition-colors group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-brand-500">Mật khẩu</p>
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'ĐĂNG KÝ HÀNH TRÌNH'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Đã có tài khoản? <Link href="/login" className="text-brand-500 font-bold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
