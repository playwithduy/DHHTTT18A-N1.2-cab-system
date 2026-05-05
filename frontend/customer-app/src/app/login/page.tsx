'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/rideStore';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Correctly destructure access_token and user data
        const { access_token, ...userData } = result.data;
        useAuthStore.getState().login(access_token, userData);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-white relative overflow-hidden p-6 pt-16 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 py-4">
        <div className="animate-slide-up">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-6 mx-auto">
            <Car size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">CabGo Login</h1>
          <p className="text-slate-400 mb-6 font-bold text-sm text-center">Đăng nhập để bắt đầu hành trình của bạn.</p>
          
          <form onSubmit={handleLogin} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-xs font-bold">{error}</p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-colors group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Email</p>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-300 group-focus-within:text-primary" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-colors group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Mật khẩu</p>
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
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center uppercase text-[13px] tracking-widest mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs font-bold mt-6">
            Chưa có tài khoản? <Link href="/register" className="text-primary font-black hover:underline">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
