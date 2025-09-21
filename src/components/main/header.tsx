"use client";

import { Link, ChefHat, Calendar, Utensils, Package } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    name: "Trang chủ",
    href: "/",
    icon: Calendar,
    description: "Lịch thực đơn và quản lý kho",
  },
  {
    name: "Quản lý kho",
    href: "/storage",
    icon: Package,
    description: "Quản lý nguyên liệu và tồn kho",
  },
  {
    name: "Quản lý nguyên liệu",
    href: "/ingredients",
    icon: ChefHat,
    description: "Thêm và chỉnh sửa nguyên liệu",
  },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm min-h-[60px] w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 py-3 items-center">
          <div className="text-sm text-gray-500 mr-4">Navigation:</div>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}