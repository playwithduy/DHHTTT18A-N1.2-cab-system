'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { useDriverStore } from '@/store/driverStore';
import { apiFetch } from '@/lib/api';

function cn(...classes: (string | false | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

export default function DriverLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useDriverStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.success) {
        login(result.data.access_token, result.data.user);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden">
      <div className="phone-frame">
        <div className="phone-content driver-theme bg-[#0f172a] relative flex flex-col w-full h-full overflow-hidden p-6 pt-16">
          
          {/* Background Decor */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="z-10 mb-10 text-center">
            <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,178,169,0.3)] mb-6 mx-auto border-4 border-white/10 ring-8 ring-brand-500/10">
              <Shield size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 italic tracking-tight italic">TÀI XẾ CABGO</h1>
            <p className="text-slate-400 font-bold text-sm tracking-tight">Đối tác tin cậy, hành trình an toàn.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 z-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-shake">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-[11px] font-black uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.8rem] p-4 focus-within:border-brand-500 focus-within:bg-white/10 transition-all group">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-focus-within:text-brand-500">Email Đối Tác</p>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@cabgo.vn"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.8rem] p-4 focus-within:border-brand-500 focus-within:bg-white/10 transition-all group">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-focus-within:text-brand-500">Mật khẩu</p>
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center border-b-4 border-brand-700 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'ĐĂNG NHẬP NGAY'}
            </button>
          </form>

          <div className="mt-12 text-center z-10">
            <p className="text-slate-500 text-xs font-bold mb-4 uppercase tracking-widest">Hoặc trở thành đối tác</p>
            <Link href="/register" className="inline-flex items-center gap-2 text-brand-500 font-black text-sm hover:underline tracking-tight">
              ĐĂNG KÝ TÀI XẾ MỚI <ChevronLeft size={16} className="rotate-180" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
