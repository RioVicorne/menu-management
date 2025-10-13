import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import { Inter } from "next/font/google";

import type { Metadata } from "next";
import { Sidebar, MobileBottomNav } from "@/components";

export const metadata: Metadata = {
  title: "Quản lý thực đơn",
  description: "Ứng dụng quản lý thực đơn hàng ngày",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable}`}>
      <body className="min-h-dvh bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-gray-900 antialiased">
        <div className="min-h-dvh">
          <Sidebar />
          {/* Main content area with proper spacing for sidebar */}
          <main className="sidebar-container min-h-screen transition-all duration-300 pt-0 lg:pt-4 mobile-bottom-spacing">
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
