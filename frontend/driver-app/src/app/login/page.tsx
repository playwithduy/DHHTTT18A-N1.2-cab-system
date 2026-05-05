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
        const { access_token, ...userData } = result.data;
        login(access_token, userData);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-white relative overflow-hidden no-scrollbar overflow-y-auto animate-fade-in">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 p-6">
        {/* Header */}
        <div className="z-10 mb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 italic tracking-tight uppercase">TÀI XẾ CABGO</h1>
          <p className="text-slate-400 font-bold text-xs tracking-tight uppercase">Đối tác tin cậy, hành trình an toàn.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3 z-10">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3 animate-shake">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-red-500 text-[10px] font-black uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-all group">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Email Đối Tác</p>
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-slate-300 group-focus-within:text-primary" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@cabgo.vn"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-4 uppercase text-[12px] tracking-widest"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'ĐĂNG NHẬP NGAY'}
          </button>
        </form>

        <div className="mt-8 text-center z-10 pb-8">
          <Link href="/register" className="inline-flex items-center gap-2 text-primary font-black text-xs hover:underline tracking-widest uppercase">
            ĐĂNG KÝ TÀI XẾ MỚI <ChevronLeft size={14} className="rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
