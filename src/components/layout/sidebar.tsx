"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Package,
  ChefHat,
  Calendar,
  ShoppingCart,
  Menu,
  CalendarCheck,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    if (!pathname) {
      setActiveTab("home");
      return;
    }
    if (pathname === "/") {
      setActiveTab("home");
    } else if (pathname.startsWith("/storage")) {
      setActiveTab("storage");
    } else if (pathname.startsWith("/ingredients")) {
      setActiveTab("ingredients");
    } else if (pathname.startsWith("/menu")) {
      setActiveTab("menu");
    } else if (pathname.startsWith("/planner")) {
      setActiveTab("planner");
    } else if (pathname.startsWith("/recipes")) {
      setActiveTab("recipes");
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

  // Auth: check current session and listen for changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsAuthed(!!session);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setIsAuthed(!!newSession);
        }
      );

      cleanup = () => {
        sub.subscription.unsubscribe();
      };
    };

    init();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

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
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      activeColor: "text-white",
    },
    {
      id: "menu",
      label: "Lịch thực đơn",
      icon: Calendar,
      path: "/menu",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      activeColor: "text-white",
    },
    {
      id: "planner",
      label: "AI Planner",
      icon: CalendarCheck,
      path: "/planner",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      activeColor: "text-white",
    },
    {
      id: "recipes",
      label: "Công thức",
      icon: BookOpen,
      path: "/recipes",
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      activeColor: "text-white",
    },
    {
      id: "ingredients",
      label: "Món ăn",
      icon: ChefHat,
      path: "/ingredients",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      activeColor: "text-white",
    },
    {
      id: "storage",
      label: "Quản lý kho",
      icon: Package,
      path: "/storage",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      activeColor: "text-white",
    },
    {
      id: "shopping",
      label: "Mua sắm",
      icon: ShoppingCart,
      path: "/shopping",
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      activeColor: "text-white",
    },
  ];

  return (
    <div
      className={`hidden lg:flex fixed left-0 top-0 h-full z-20 transition-all duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-64"} ${className}`}
    >
      <div className="glass-card w-full h-full flex flex-col border-r border-sage-200/30 dark:border-sage-700/30 overflow-hidden">
        {/* Logo Section */}
        <div className="flex-shrink-0 p-3 lg:p-4 border-b border-sage-200/30 dark:border-sage-700/30">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-2 lg:space-x-3 animate-slide-up min-w-0">
                <div className="p-2 lg:p-2.5 gradient-primary rounded-xl lg:rounded-2xl shadow-soft hover-lift shrink-0">
                  <ChefHat className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base lg:text-lg font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent truncate">
                    Menu Manager
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    Quản lý thực đơn
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-xl hover:bg-sage-100/50 dark:hover:bg-sage-800/50 transition-all duration-300 hover-lift shrink-0"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 pr-2 lg:pr-3 space-y-1 overflow-y-auto min-h-0">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            const buttonClasses = isCollapsed
              ? `w-full flex items-center justify-center px-2 py-2.5 lg:py-3 rounded-xl font-medium transition-all duration-300 group ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              : `w-full flex items-center space-x-2 lg:space-x-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-left font-medium transition-all duration-300 hover-lift group ${
                  isActive
                    ? "gradient-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50"
                }`;

            const iconWrapperClasses = isCollapsed
              ? `${isActive ? "bg-sage-300/80 dark:bg-sage-700" : "hover:bg-sage-100/60 dark:hover:bg-sage-800/60"} w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300`
              : `p-1.5 lg:p-2 rounded-xl transition-all duration-300 shrink-0 ${isActive ? "bg-white/20" : item.bgColor}`;

            const iconClasses = isCollapsed
              ? `w-4 h-4 lg:w-5 lg:h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-muted-foreground"}`
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
                  <span className="text-xs lg:text-sm transition-colors duration-300 animate-slide-up truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
