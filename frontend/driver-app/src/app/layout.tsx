import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CABGO DRIVER 3.0 - NEW",
  description: "Hệ thống quản lý chuyến đi dành cho tài xế",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="device-wrapper">
          <div className="iphone-16">
            <div className="action button"></div>
            <div className="volume-up button"></div>
            <div className="volume-down button"></div>
            <div className="power button"></div>
            <div className="screen">
              <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-100">
                {children}
              </main>
            </div>
          </div>
        </div>
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: '14px', borderRadius: '12px' } }} />
      </body>
    </html>
  );
}
