'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
        localStorage.setItem('cabgo_token', result.data.access_token);
        localStorage.setItem('cabgo_user', JSON.stringify(result.data.user));
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden">
      <div className="phone-frame">
        <div className="phone-content bg-slate-900 relative flex flex-col w-full h-full overflow-hidden p-6 overflow-y-auto no-scrollbar animate-fade-in">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-accent-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10">
        <div className="animate-slide-up">
          <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8 mx-auto">
            <Car size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 text-center">CabGo Login</h1>
          <p className="text-slate-400 mb-8 font-medium text-center">Đăng nhập để bắt đầu hành trình của bạn.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 focus-within:border-brand-500 transition-colors group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-brand-500">Email</p>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400 group-focus-within:text-brand-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none text-white font-bold text-base w-full"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Chưa có tài khoản? <Link href="/register" className="text-brand-500 font-bold hover:underline">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
