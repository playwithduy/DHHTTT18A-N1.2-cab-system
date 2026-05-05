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
    <div className="flex-1 flex flex-col w-full h-full bg-white relative overflow-hidden p-6 pt-16 no-scrollbar overflow-y-auto animate-fade-in">
      
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 py-6">
        <div className="animate-slide-up">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-6 mx-auto">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">Tạo tài khoản</h1>
          <p className="text-slate-400 mb-8 font-bold text-center text-sm">Gia nhập cộng đồng CabGo ngay hôm nay.</p>
          
          <form onSubmit={handleRegister} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                <p className="text-red-500 text-xs font-bold">{error}</p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-colors group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Họ và tên</p>
              <div className="flex items-center gap-3">
                <User size={18} className="text-slate-300 group-focus-within:text-primary" />
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-colors group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Email</p>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-300 group-focus-within:text-primary" />
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="bg-transparent border-none outline-none text-slate-800 font-bold text-base w-full placeholder:text-slate-200"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:border-primary transition-colors group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-focus-within:text-primary">Số điện thoại</p>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-300 group-focus-within:text-primary" />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0987123456"
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ĐĂNG KÝ NGAY'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs font-bold mt-8 uppercase tracking-widest">
            Đã có tài khoản? <Link href="/login" className="text-primary font-black hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
