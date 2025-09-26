import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";

import { Header } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý thực đơn",
  description: "Ứng dụng quản lý thực đơn hàng ngày",
};

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-white text-gray-900 antialiased">
        <div className="min-h-dvh bg-white text-gray-900">
          <Header />
          <main className="flex-1 pt-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
