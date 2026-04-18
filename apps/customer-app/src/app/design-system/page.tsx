'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { CustomToaster, showToast } from '@/components/ui/Toast';
import { 
  ArrowLeft, Search, Mail, Lock, User, 
  MapPin, Bell, Star, Terminal 
} from 'lucide-react';
import Link from 'next/link';

export default function DesignSystemPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-20">
      <CustomToaster />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-6 font-bold flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Terminal size={24} className="text-brand-500" />
            Design System
          </h1>
        </div>
        <Badge variant="brand">PHASE 2 DONE</Badge>
      </header>

      <div className="px-6 space-y-12 mt-10">
        
        {/* Buttons Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Loading</Button>
            <Button size="icon"><Star size={20} /></Button>
          </div>
          <div className="mt-4">
            <Button size="xl" rightIcon={<ArrowLeft size={20} className="rotate-180" />}>
              Full Width Large Button
            </Button>
          </div>
        </section>

        {/* Inputs Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Inputs</h2>
          <div className="space-y-4">
            <Input 
              label="Standard Input" 
              placeholder="Nhập họ tên của bạn..." 
              leftIcon={<User size={18} />}
            />
            <Input 
              label="Email Address" 
              placeholder="email@example.com" 
              leftIcon={<Mail size={18} />}
              helperText="Chúng tôi không bao giờ chia sẻ email của bạn."
            />
            <Input 
              label="Password" 
              type="password"
              placeholder="********" 
              leftIcon={<Lock size={18} />}
              error="Mật khẩu không khớp"
            />
          </div>
        </section>

        {/* Badges Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="neutral">Pending</Badge>
            <Badge variant="brand">Selected</Badge>
            <Badge variant="success">Completed</Badge>
            <Badge variant="warning">On Trip</Badge>
            <Badge variant="danger">Cancelled</Badge>
            <Badge variant="info">Note</Badge>
          </div>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card isHoverable>
              <h3 className="font-bold text-slate-800">Hoverable Card</h3>
              <p className="text-sm text-slate-500 mt-2">Dùng cho các mục có thể tương tác.</p>
            </Card>
            <Card variant="elevated">
              <h3 className="font-bold text-slate-800">Elevated Card</h3>
              <p className="text-sm text-slate-500 mt-2">Dùng để tạo điểm nhấn mạnh.</p>
            </Card>
          </div>
        </section>

        {/* Modals & Toasts Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Modals & Toasts</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>Open Modal</Button>
            <Button variant="secondary" onClick={() => showToast.success("Thành công!")}>Trigger Success Toast</Button>
            <Button variant="secondary" onClick={() => showToast.error("Có lỗi xảy ra!")}>Trigger Error Toast</Button>
          </div>
        </section>

        {/* Spinners Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Spinners</h2>
          <div className="flex items-center gap-8">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Spinner size="xl" />
          </div>
        </section>

      </div>

      {/* Modal Example */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Xác nhận chuyến đi"
      >
        <div className="space-y-4">
          <p>Bạn có chắc chắn muốn đặt chuyến đi này không? Hệ thống sẽ tìm tài xế ngay lập tức.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button className="flex-1" onClick={() => {
              setIsModalOpen(false);
              showToast.success("Chuyến đi đang được tìm kiếm!");
            }}>Đồng ý</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
