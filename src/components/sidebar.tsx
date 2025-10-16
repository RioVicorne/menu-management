"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ChefHat, Calendar, ShoppingCart, User, Menu, Settings } from "lucide-react";

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
    { 
      id: "home", 
      label: "Trang chủ", 
      icon: Home, 
      path: "/", 
      color: "text-sage-600", 
      bgColor: "bg-sage-100 dark:bg-sage-900/30",
      activeColor: "text-white"
    },
    { 
      id: "menu", 
      label: "Lịch thực đơn", 
      icon: Calendar, 
      path: "/menu", 
      color: "text-mint-600", 
      bgColor: "bg-mint-100 dark:bg-mint-900/30",
      activeColor: "text-white"
    },
    { 
      id: "ingredients", 
      label: "Món ăn", 
      icon: ChefHat, 
      path: "/ingredients", 
      color: "text-wood-600", 
      bgColor: "bg-wood-100 dark:bg-wood-900/30",
      activeColor: "text-white"
    },
    { 
      id: "storage", 
      label: "Quản lý kho", 
      icon: Package, 
      path: "/storage", 
      color: "text-sage-500", 
      bgColor: "bg-sage-100 dark:bg-sage-900/30",
      activeColor: "text-white"
    },
    { 
      id: "shopping", 
      label: "Mua sắm", 
      icon: ShoppingCart, 
      path: "/shopping", 
      color: "text-cream-700", 
      bgColor: "bg-cream-100 dark:bg-cream-900/30",
      activeColor: "text-white"
    },
  ];

  return (
    <div className={`hidden lg:flex fixed left-0 top-0 h-full z-20 transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "w-16" : "w-64"} ${className}`}>
      <div className="glass-card w-full h-full flex flex-col border-r border-sage-200/30 dark:border-sage-700/30">
        {/* Logo Section */}
        <div className="p-4 border-b border-sage-200/30 dark:border-sage-700/30">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3 animate-slide-up">
                <div className="p-2.5 gradient-primary rounded-2xl shadow-soft hover-lift">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
                    Menu Manager
                  </span>
                  <span className="text-xs text-muted-foreground">Quản lý thực đơn</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-xl hover:bg-sage-100/50 dark:hover:bg-sage-800/50 transition-all duration-300 hover-lift"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            const buttonClasses = isCollapsed
              ? `w-full flex items-center justify-center px-2 py-3 rounded-xl font-medium transition-all duration-300 group ${
                  isActive 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`
              : `w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-300 hover-lift group ${
                  isActive 
                    ? "gradient-primary text-white shadow-soft" 
                    : "text-muted-foreground hover:text-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50"
                }`;

            const iconWrapperClasses = isCollapsed
              ? `${isActive ? "bg-sage-300/80 dark:bg-sage-700" : "hover:bg-sage-100/60 dark:hover:bg-sage-800/60"} w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300`
              : `p-2 rounded-xl transition-all duration-300 ${isActive ? "bg-white/20" : item.bgColor}`;

            const iconClasses = isCollapsed
              ? `w-5 h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-muted-foreground"}`
              : `h-4 w-4 transition-colors duration-300 ${isActive ? "text-white" : item.color}`;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.path)}
                className={buttonClasses}
                title={isCollapsed ? item.label : undefined}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={iconWrapperClasses}>
                  <Icon className={iconClasses} />
                </div>
                {!isCollapsed && (
                  <span className="text-sm transition-colors duration-300 animate-slide-up">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        {!isCollapsed && (
          <div className="p-4 border-t border-sage-200/30 dark:border-sage-700/30">
            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-sage-100/50 dark:hover:bg-sage-800/50 transition-all duration-300 hover-lift cursor-pointer group">
              <div className="w-8 h-8 gradient-secondary rounded-full flex items-center justify-center shadow-soft">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


