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
    <html lang="vi" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-dvh bg-gradient-to-br from-cream-50 via-background to-sage-50 dark:from-sage-950 dark:via-background dark:to-wood-950 text-foreground antialiased font-sans">
        {/* Pre-hydration theme script to avoid FOUC and honor system/manual preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var shouldDark = stored === 'dark' || (stored !== 'light' && systemPrefersDark);
      if (shouldDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Keep in sync when system preference changes and user hasn't forced a choice
      if (stored !== 'light' && stored !== 'dark') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
          if (e.matches) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        });
      }
      // Expose a small API for toggles
      window.__setTheme = function(mode) {
        if (mode === 'system') {
          localStorage.removeItem('theme');
          var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', sys);
          return;
        }
        localStorage.setItem('theme', mode);
        document.documentElement.classList.toggle('dark', mode === 'dark');
      };
    } catch (_) {}
  })();
            `,
          }}
        />
        <div className="min-h-dvh relative">
          {/* Background pattern */}
          <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, var(--sage-600) 2px, transparent 0)`,
              backgroundSize: '50px 50px'
            }} />
          </div>
          {/* Soft gradient blobs for depth */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl opacity-30 dark:opacity-20" style={{
              background:
                'radial-gradient(closest-side, var(--mint-400), transparent)'
            }} />
            <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full blur-3xl opacity-30 dark:opacity-20" style={{
              background:
                'radial-gradient(closest-side, var(--wood-400), transparent)'
            }} />
          </div>
          
          <Sidebar />
          
          {/* Main content area with proper spacing for sidebar */}
          <main className="sidebar-container min-h-screen transition-all duration-300 pt-0 lg:pt-4 mobile-bottom-spacing relative z-10">
            <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 lg:py-6 h-full">
              {children}
            </div>
          </main>
          
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
