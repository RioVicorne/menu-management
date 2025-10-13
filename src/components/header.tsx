"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Home, 
  Package, 
  ChefHat, 
  Calendar, 
  ShoppingCart, 
  X, 
  Menu as MenuIcon,
  Search,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine active tab based on current path
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

  // Sync body classes with sidebar state for layout shift
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

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    switch (tab) {
      case "home":
        router.push("/");
        break;
      case "storage":
        router.push("/storage");
        break;
      case "ingredients":
        router.push("/ingredients");
        break;
      case "menu":
        router.push("/menu");
        break;
      case "shopping":
        router.push("/shopping");
        break;
      default:
        router.push("/");
    }
  };

  const navigationItems = [
    {
      id: "home",
      label: "Trang chủ",
      icon: Home,
      path: "/",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      id: "menu",
      label: "Lịch thực đơn",
      icon: Calendar,
      path: "/menu",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
      id: "ingredients",
      label: "Món ăn",
      icon: ChefHat,
      path: "/ingredients",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30"
    },
    {
      id: "storage",
      label: "Quản lý kho",
      icon: Package,
      path: "/storage",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      id: "shopping",
      label: "Mua sắm",
      icon: ShoppingCart,
      path: "/shopping",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex fixed left-0 top-16 h-[calc(100%-4rem)] z-20 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
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
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                    isActive
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
                  }`
                : `w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-300 hover-lift ${
                    isActive
                      ? "gradient-primary text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
                  }`;

              const iconWrapperClasses = isCollapsed
                ? `${isActive ? 'gradient-primary' : item.bgColor} w-10 aspect-square rounded-xl flex items-center justify-center shrink-0`
                : `p-2 rounded-lg ${isActive ? 'bg-white/20' : item.bgColor}`;

              const iconClasses = isCollapsed
                ? `w-5 h-5 ${isActive ? 'text-white' : item.color} shrink-0`
                : `h-4 w-4 ${isActive ? 'text-white' : item.color}`;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
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
          {!isCollapsed && (
            <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/20">
              <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">admin@example.com</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-80 glass-card border-r border-gray-200/20 dark:border-gray-700/20 shadow-xl transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/20 dark:border-gray-700/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 gradient-primary rounded-xl shadow-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                Menu Manager
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-300 hover-lift ${
                    isActive
                      ? "gradient-primary text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.color}`} />
                  </div>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile User Section */}
          <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/20">
            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">admin@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <header className={`fixed top-0 left-0 right-0 z-30 glass border-b border-gray-200/20 dark:border-gray-700/20 transition-all duration-300 ${className}`}>
        <div className="h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center space-x-2 bg-white/50 dark:bg-white/10 rounded-xl px-4 py-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="bg-transparent border-none outline-none text-sm flex-1 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notifications */}
            <button className="p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 transition-colors relative">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full text-xs"></span>
            </button>

            {/* Settings */}
            <button className="p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 transition-colors">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* User Profile */}
            <button className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 rounded-lg hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">admin@example.com</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-200/20 dark:border-gray-700/20">
        <div className="flex items-center justify-around px-2 py-2">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "text-orange-600"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
