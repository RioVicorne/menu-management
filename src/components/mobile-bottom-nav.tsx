"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ChefHat, Calendar, ShoppingCart } from "lucide-react";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");

  useEffect(() => {
    if (pathname === "/") {
      setActiveTab("home");
    } else if (pathname.startsWith("/storage")) {
      setActiveTab("storage");
    } else if (pathname.startsWith("/ingredients")) {
      setActiveTab("ingredients");
    } else if (pathname.startsWith("/menu")) {
      setActiveTab("menu");
    } else if (pathname.startsWith("/shopping")) {
      setActiveTab("shopping");
    } else {
      setActiveTab("home");
    }
  }, [pathname]);

  const navigationItems = [
    { id: "home", label: "Trang chủ", icon: Home, path: "/" },
    { id: "menu", label: "Lịch", icon: Calendar, path: "/menu" },
    { id: "ingredients", label: "Món ăn", icon: ChefHat, path: "/ingredients" },
    { id: "storage", label: "Kho", icon: Package, path: "/storage" },
    { id: "shopping", label: "Mua sắm", icon: ShoppingCart, path: "/shopping" },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    setActiveTab(tabId);
    router.push(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-200/20 dark:border-gray-700/20">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id, item.path)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 ${
                isActive ? "text-orange-600" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? "bg-orange-100 dark:bg-orange-900/30" : ""}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


