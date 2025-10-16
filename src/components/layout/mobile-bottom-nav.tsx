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
      color: "text-sage-600",
      bgColor: "bg-sage-100 dark:bg-sage-900/30"
    },
    { 
      id: "menu", 
      label: "Lịch", 
      icon: Calendar, 
      path: "/menu",
      color: "text-mint-600",
      bgColor: "bg-mint-100 dark:bg-mint-900/30"
    },
    { 
      id: "ingredients", 
      label: "Món ăn", 
      icon: ChefHat, 
      path: "/ingredients",
      color: "text-wood-600",
      bgColor: "bg-wood-100 dark:bg-wood-900/30"
    },
    { 
      id: "storage", 
      label: "Kho", 
      icon: Package, 
      path: "/storage",
      color: "text-sage-500",
      bgColor: "bg-sage-100 dark:bg-sage-900/30"
    },
    { 
      id: "shopping", 
      label: "Mua sắm", 
      icon: ShoppingCart, 
      path: "/shopping",
      color: "text-cream-700",
      bgColor: "bg-cream-100 dark:bg-cream-900/30"
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
                  ? `${item.color} scale-105` 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? `${item.bgColor} shadow-soft` 
                  : "hover:bg-sage-100/50 dark:hover:bg-sage-800/50"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium transition-colors duration-300">{item.label}</span>
            </button>
          );
        })}

        {/* More dropdown for Planner and Recipes */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setIsMoreOpen((v) => !v)}
            className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 hover-lift ${
              activeTab === 'planner' || activeTab === 'recipes' ? 'text-sage-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              activeTab === 'planner' || activeTab === 'recipes' ? 'bg-sage-100 dark:bg-sage-900/30 shadow-soft' : 'hover:bg-sage-100/50 dark:hover:bg-sage-800/50'
            }`}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Thêm</span>
          </button>

          {isMoreOpen && (
            <div className="absolute bottom-14 right-0 glass-card border border-sage-200/30 dark:border-sage-700/30 rounded-2xl shadow-xl p-2 w-44 backdrop-blur-xl">
              <button
                onClick={() => { setIsMoreOpen(false); handleTabClick('planner', '/planner'); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${activeTab === 'planner' ? 'bg-sage-100/60 dark:bg-sage-800/50 text-foreground' : 'text-muted-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50 hover:text-foreground'}`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                </span>
                <span className="text-sm">Lập kế hoạch</span>
              </button>
              <button
                onClick={() => { setIsMoreOpen(false); handleTabClick('recipes', '/recipes'); }}
                className={`mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${activeTab === 'recipes' ? 'bg-sage-100/60 dark:bg-sage-800/50 text-foreground' : 'text-muted-foreground hover:bg-sage-100/50 dark:hover:bg-sage-800/50 hover:text-foreground'}`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <BookOpen className="h-4 w-4 text-amber-600" />
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


