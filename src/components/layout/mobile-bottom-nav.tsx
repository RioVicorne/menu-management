"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ChefHat, Calendar, ShoppingCart } from "lucide-react";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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
      <div className="flex items-center justify-around px-2 py-2">
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
      </div>
    </div>
  );
}


