"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ChefHat, Calendar, ShoppingCart, User, Menu } from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Keep the root classes for layout shift just like the original header
  useEffect(() => {
    const root = document.documentElement;
    if (isCollapsed) {
      root.classList.add("sidebar-collapsed");
      root.classList.remove("sidebar-expanded");
    } else {
      root.classList.add("sidebar-expanded");
      root.classList.remove("sidebar-collapsed");
    }
    return () => {
      root.classList.remove("sidebar-expanded");
      root.classList.remove("sidebar-collapsed");
    };
  }, [isCollapsed]);

  const handleTabClick = (tab: string, path: string) => {
    setActiveTab(tab);
    router.push(path);
  };

  const navigationItems = [
    { id: "home", label: "Trang chủ", icon: Home, path: "/", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { id: "menu", label: "Lịch thực đơn", icon: Calendar, path: "/menu", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    { id: "ingredients", label: "Món ăn", icon: ChefHat, path: "/ingredients", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    { id: "storage", label: "Quản lý kho", icon: Package, path: "/storage", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    { id: "shopping", label: "Mua sắm", icon: ShoppingCart, path: "/shopping", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  ];

  return (
    <div className={`hidden lg:flex fixed left-0 top-0 h-full z-20 transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"} ${className}`}>
      <div className="glass-card w-full h-full flex flex-col border-r border-gray-200/20 dark:border-gray-700/20">
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-200/20 dark:border-gray-700/20">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="p-2 gradient-primary rounded-xl shadow-lg">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                  Menu Manager
                </span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            const buttonClasses = isCollapsed
              ? `w-full flex items-center justify-center px-2 py-3 rounded-xl font-medium transition-all duration-300 hover-lift ${
                  isActive ? "text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
                }`
              : `w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-300 hover-lift ${
                  isActive ? "gradient-primary text-white shadow-lg" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
                }`;

            const iconWrapperClasses = isCollapsed
              ? `${isActive ? "gradient-primary" : item.bgColor} w-10 aspect-square rounded-xl flex items-center justify-center shrink-0`
              : `p-2 rounded-lg ${isActive ? "bg-white/20" : item.bgColor}`;

            const iconClasses = isCollapsed
              ? `w-5 h-5 ${isActive ? "text-white" : item.color} shrink-0`
              : `h-4 w-4 ${isActive ? "text-white" : item.color}`;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.path)}
                className={buttonClasses}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={iconWrapperClasses}>
                  <Icon className={iconClasses} />
                </div>
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        
      </div>
    </div>
  );
}


