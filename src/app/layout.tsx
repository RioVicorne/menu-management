import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import { Inter } from "next/font/google";

import type { Metadata } from "next";
import { Sidebar, MobileBottomNav } from "@/components";

export const metadata: Metadata = {
  title: "Menu Manager - Quản lý thực đơn",
  description: "Ứng dụng quản lý thực đơn hàng ngày hiện đại với giao diện thân thiện",
};

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-dvh bg-gradient-to-br from-cream-50 via-background to-sage-50 dark:from-sage-950 dark:via-background dark:to-wood-950 text-foreground antialiased font-sans">
        <div className="min-h-dvh relative">
          {/* Background pattern */}
          <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, var(--sage-600) 2px, transparent 0)`,
              backgroundSize: '50px 50px'
            }} />
          </div>
          
          <Sidebar />
          
          {/* Main content area with proper spacing for sidebar */}
          <main className="sidebar-container min-h-screen transition-all duration-300 pt-0 lg:pt-4 mobile-bottom-spacing relative z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
          
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
