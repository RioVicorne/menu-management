"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ChefHat, Calendar, ShoppingCart, CalendarCheck, BookOpen, MoreHorizontal } from "lucide-react";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isVisible, setIsVisible] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMoreOpen]);

  // Scroll detection for hiding/showing navigation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = (currentScrollY + windowHeight) / documentHeight;

      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Show navigation if at the bottom of the page (within 5% of the end)
      if (scrollPercentage >= 0.95) {
        setIsVisible(true);
        return;
      }

      // Determine scroll direction
      const isScrollingDown = currentScrollY > lastScrollY.current;
      const isScrollingUp = currentScrollY < lastScrollY.current;

      // Only hide/show if there's a significant scroll difference (more than 5px)
      const scrollDifference = Math.abs(currentScrollY - lastScrollY.current);
      
      if (scrollDifference > 5) {
        if (isScrollingDown && currentScrollY > 100) {
          // Hide navigation when scrolling down (but not at the very top)
          setIsVisible(false);
        } else if (isScrollingUp) {
          // Show navigation when scrolling up
          setIsVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;

      // Debounce the scroll event
      scrollTimeout.current = setTimeout(() => {
        // Optional: Show navigation after scroll stops (uncomment if needed)
        // setIsVisible(true);
      }, 150);
    };

    // Throttled scroll handler for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const navigationItems = [
    { 
      id: "home", 
      label: "Trang chủ", 
      icon: Home, 
      path: "/",
      color: "text-blue-600", 
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      activeColor: "text-white"
    },
    { 
      id: "menu", 
      label: "Lịch", 
      icon: Calendar, 
      path: "/menu",
      color: "text-green-600", 
      bgColor: "bg-green-100 dark:bg-green-900/30",
      activeColor: "text-white"
    },
    { 
      id: "ingredients", 
      label: "Món ăn", 
      icon: ChefHat, 
      path: "/ingredients",
      color: "text-orange-600", 
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      activeColor: "text-white"
    },
    { 
      id: "storage", 
      label: "Kho", 
      icon: Package, 
      path: "/storage",
      color: "text-purple-600", 
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      activeColor: "text-white"
    },
    { 
      id: "shopping", 
      label: "Mua sắm", 
      icon: ShoppingCart, 
      path: "/shopping",
      color: "text-pink-600", 
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      activeColor: "text-white"
    },
  ];

  const handleTabClick = (tabId: string, path: string) => {
    setActiveTab(tabId);
    router.push(path);
  };

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-sage-200/30 dark:border-sage-700/30 transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="relative flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id, item.path)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 hover-lift ${
                isActive 
                  ? "scale-105" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? "gradient-primary shadow-soft" 
                  : `${item.bgColor} hover:opacity-80`
              }`}>
                <Icon className={`h-5 w-5 transition-colors duration-300 ${
                  isActive ? "text-white" : item.color
                }`} />
              </div>
              <span className={`text-xs font-medium transition-colors duration-300 ${
                isActive ? "text-foreground font-semibold" : ""
              }`}>{item.label}</span>
            </button>
          );
        })}

        {/* More dropdown for Planner and Recipes */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setIsMoreOpen((v) => !v)}
            className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 hover-lift ${
              activeTab === 'planner' || activeTab === 'recipes' 
                ? "scale-105" 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              activeTab === 'planner' || activeTab === 'recipes' 
                ? 'gradient-primary shadow-soft' 
                : 'bg-sage-100/50 dark:bg-sage-800/50 hover:opacity-80'
            }`}>
              <MoreHorizontal className={`h-5 w-5 transition-colors duration-300 ${
                activeTab === 'planner' || activeTab === 'recipes' ? 'text-white' : 'text-sage-600'
              }`} />
            </div>
            <span className={`text-xs font-medium transition-colors duration-300 ${
              activeTab === 'planner' || activeTab === 'recipes' ? 'text-foreground font-semibold' : ''
            }`}>Thêm</span>
          </button>

          {isMoreOpen && (
            <div className="absolute bottom-14 right-0 glass-card border border-sage-200/30 dark:border-sage-700/30 rounded-2xl shadow-xl p-2 w-44 backdrop-blur-xl">
              <button
                onClick={() => { setIsMoreOpen(false); handleTabClick('planner', '/planner'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-300 ${
                  activeTab === 'planner' 
                    ? 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium' 
                    : 'text-muted-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50 hover:text-foreground'
                }`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                <span className="text-sm">AI Planner</span>
              </button>
              <button
                onClick={() => { setIsMoreOpen(false); handleTabClick('recipes', '/recipes'); }}
                className={`mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-300 ${
                  activeTab === 'recipes' 
                    ? 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium' 
                    : 'text-muted-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50 hover:text-foreground'
                }`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </span>
                <span className="text-sm">Công thức</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


