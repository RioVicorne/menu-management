"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Package, ChefHat, Menu } from "lucide-react";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");

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
    } else {
      setActiveTab("home");
    }
  }, [pathname]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
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
      default:
        router.push("/");
    }
  };

  const tabs = [
    {
      id: "home",
      label: "Trang chủ",
      icon: Home,
      path: "/",
    },
    {
      id: "menu",
      label: "Lịch",
      icon: Menu,
      path: "/menu",
    },
    {
      id: "storage",
      label: "Quản lý kho",
      icon: Package,
      path: "/storage",
    },
    {
      id: "ingredients",
      label: "Quản lý nguyên liệu",
      icon: ChefHat,
      path: "/ingredients",
    },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Clickable to go home */}
          <button 
            onClick={() => router.push("/")}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </button>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
