import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CabGo — Đặt xe nhanh, an toàn',
  description: 'Ứng dụng đặt xe thông minh với AI matching',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="antialiased bg-slate-100">
        <Providers>
          <div className="device-wrapper">
            <div className="iphone-16">
              <div className="action button"></div>
              <div className="volume-up button"></div>
              <div className="volume-down button"></div>
              <div className="power button"></div>
              <div className="screen">
                <div className="dynamic-island"></div>
                <main className="flex-1 relative overflow-hidden flex flex-col bg-white">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
