import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import { Inter } from "next/font/google";

import { Header } from "@/components";
import type { Metadata } from "next";

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
          <Header/>
          {/* Main content area with proper spacing for sidebar */}
          <main className="sidebar-container pt-16 pb-20 lg:pb-0 min-h-screen transition-all duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
