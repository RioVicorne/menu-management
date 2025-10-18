// ❗ I want to redesign this page structure completely from scratch.
// Keep all logic, but throw away the current layout and rebuild UI freely.

"use client";

import { useEffect, useState } from "react";
import { } from "next/navigation";
import { 
  Calendar, 
  ChefHat, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3,
  Bell,
  TrendingUp,
  Clock,
  Star,
  Sparkles
} from "lucide-react";
import { TodayMenu } from "@/components";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getMenuItems, getCalendarData, getRecipeForDish, type DishRecipeItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [shoppingCount, setShoppingCount] = useState<number>(0);
  const [todayDishCount, setTodayDishCount] = useState<number>(0);
  const [todayServingCount, setTodayServingCount] = useState<number>(0);
  const [weeklyDishCount, setWeeklyDishCount] = useState<number>(0);
  const [weeklyIngredientUsed, setWeeklyIngredientUsed] = useState<number>(0);
  const [weeklyEstimatedCost, setWeeklyEstimatedCost] = useState<number>(0);

  useEffect(() => {
    const fetchInventoryCount = async () => {
      try {
        if (!supabase) {
          setInventoryCount(0);
          return;
        }
        const { count, error } = await supabase
          .from("nguyen_lieu")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        setInventoryCount(Number(count || 0));
      } catch (err) {
        logger.error("Failed to fetch inventory count", err);
        setInventoryCount(0);
      }
    };
    fetchInventoryCount();
  }, []);

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const todayString = new Date().toISOString().split("T")[0];
        if (!supabase) {
          const cal = await getCalendarData(todayString, todayString);
          const count = cal && cal.length > 0 ? Number((cal[0] as { dishCount?: number })?.dishCount || 0) : 0;
          setTodayDishCount(count);
          setTodayServingCount(count * 2);
          return;
        }

        const items = await getMenuItems(todayString);
        const count = items?.length || 0;
        const servings = items?.reduce((sum, it) => sum + Number(it.boi_so || 0), 0) || 0;
        setTodayDishCount(count);
        setTodayServingCount(servings);
      } catch (err) {
        logger.error("Failed to fetch today's stats", err);
        setTodayDishCount(0);
        setTodayServingCount(0);
      }
    };
    fetchTodayStats();
  }, []);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        const fmt = (d: Date) => d.toISOString().split("T")[0];
        const startDate = fmt(start);
        const endDate = fmt(today);

        if (!supabase) {
          const cal = await getCalendarData(startDate, endDate);
          const dishCount = Array.isArray(cal) ? cal.reduce((sum, item: { dishCount?: number }) => sum + Number(item?.dishCount || 0), 0) : 0;
          setWeeklyDishCount(dishCount);
          setWeeklyIngredientUsed(dishCount * 5); // simple heuristic in mock mode
          setWeeklyEstimatedCost(dishCount * 75000); // mock cost
          return;
        }

        const { data, error } = await supabase
          .from("thuc_don")
          .select("id, ma_mon_an, boi_so, ngay")
          .gte("ngay", startDate)
          .lte("ngay", endDate);
        if (error) throw error;
        const items = data || [];
        setWeeklyDishCount(items.length);

        // Aggregate ingredient usage by recipe lines * servings
        const recipeCache = new Map<string, DishRecipeItem[]>();
        let used = 0;
        const promises = items.map(async (it: { ma_mon_an: string; boi_so?: number }) => {
          const dishId = String(it.ma_mon_an);
          let recipe = recipeCache.get(dishId);
          if (!recipe) {
            recipe = await getRecipeForDish(dishId);
            recipeCache.set(dishId, recipe);
          }
          const lines = Array.isArray(recipe) ? recipe.length : 0;
          used += lines * Number(it.boi_so || 1);
        });
        await Promise.all(promises);
        setWeeklyIngredientUsed(used);

        // If you have pricing per component, compute real cost here. Keep 0 for now.
        setWeeklyEstimatedCost(0);
      } catch (err) {
        logger.error("Failed to fetch weekly stats", err);
        setWeeklyDishCount(0);
        setWeeklyIngredientUsed(0);
        setWeeklyEstimatedCost(0);
      }
    };
    fetchWeeklyStats();
  }, []);

  useEffect(() => {
    const fetchShoppingCount = async () => {
      try {
        if (!supabase) {
          setShoppingCount(0);
          return;
        }
        const { data, error } = await supabase
          .from("nguyen_lieu")
          .select("id, ton_kho_so_luong, ton_kho_khoi_luong");
        if (error) throw error;
        const list = (data || []) as Array<{ id: string; ton_kho_so_luong?: number | null; ton_kho_khoi_luong?: number | null }>; 
        const count = list.filter((ing) => {
          const qty = Number(ing.ton_kho_so_luong || 0);
          const wgt = Number(ing.ton_kho_khoi_luong || 0);
          const value = Math.max(qty, wgt);
          return value === 0 || (value >= 1 && value <= 5);
        }).length;
        setShoppingCount(count);
      } catch (err) {
        logger.error("Failed to fetch shopping count", err);
        setShoppingCount(0);
      }
    };
    fetchShoppingCount();
  }, []);
  

  const stats = [
    { 
      label: "Món ăn hôm nay", 
      value: String(todayDishCount), 
      icon: ChefHat, 
      color: "text-wood-600", 
      bgColor: "bg-wood-100 dark:bg-wood-900/30",
      gradient: "from-wood-500 to-wood-600"
    },
    { 
      label: "Nguyên liệu trong kho", 
      value: String(inventoryCount), 
      icon: Package, 
      color: "text-sage-600", 
      bgColor: "bg-sage-100 dark:bg-sage-900/30",
      gradient: "from-sage-500 to-sage-600"
    },
    { 
      label: "Cần mua sắm", 
      value: String(shoppingCount), 
      icon: ShoppingCart, 
      color: "text-mint-600", 
      bgColor: "bg-mint-100 dark:bg-mint-900/30",
      gradient: "from-mint-500 to-mint-600"
    },
    { 
      label: "Người ăn", 
      value: String(todayServingCount), 
      icon: Users, 
      color: "text-cream-700", 
      bgColor: "bg-cream-100 dark:bg-cream-900/30",
      gradient: "from-cream-500 to-cream-600"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
          Chào mừng trở lại!
        </h1>
        <p className="text-muted-foreground">
          Quản lý thực đơn hàng ngày một cách dễ dàng và hiệu quả
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} variant="culinary" className="hover-lift animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-soft`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Menu - Main Content */}
        <div className="lg:col-span-2">
          <Card variant="modern" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-wood-600" />
                Thực đơn hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TodayMenu />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card variant="modern" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-sage-600" />
                  Thông báo
                </div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-mint-50 to-sage-50 dark:from-mint-900/20 dark:to-sage-900/20 rounded-xl border border-mint-200/50 dark:border-mint-700/50">
                <div className="w-2 h-2 bg-mint-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Cần bổ sung nguyên liệu
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {shoppingCount} nguyên liệu sắp hết
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-wood-50 to-cream-50 dark:from-wood-900/20 dark:to-cream-900/20 rounded-xl border border-wood-200/50 dark:border-wood-700/50">
                <div className="w-2 h-2 bg-wood-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Thực đơn tuần tới
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chưa lập kế hoạch
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Stats */}
          <Card variant="modern" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sage-600" />
                Thống kê tuần
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-sage-50 dark:bg-sage-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sage-600" />
                  <span className="text-sm text-muted-foreground">Món ăn đã nấu</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{weeklyDishCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-mint-50 dark:bg-mint-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-mint-600" />
                  <span className="text-sm text-muted-foreground">Nguyên liệu đã dùng</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{weeklyIngredientUsed}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-wood-50 dark:bg-wood-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-wood-600" />
                  <span className="text-sm text-muted-foreground">Chi phí ước tính</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {weeklyEstimatedCost === 0 ? "—" : weeklyEstimatedCost.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="culinary" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-wood-600" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full p-3 text-left bg-gradient-to-r from-sage-100 to-mint-100 dark:from-sage-800/50 dark:to-mint-800/50 rounded-xl hover:from-sage-200 hover:to-mint-200 dark:hover:from-sage-700/50 dark:hover:to-mint-700/50 transition-all duration-300 hover-lift">
                <div className="flex items-center gap-3">
                  <ChefHat className="h-4 w-4 text-sage-600" />
                  <span className="text-sm font-medium text-foreground">Thêm món ăn mới</span>
                </div>
              </button>
              <button className="w-full p-3 text-left bg-gradient-to-r from-wood-100 to-cream-100 dark:from-wood-800/50 dark:to-cream-800/50 rounded-xl hover:from-wood-200 hover:to-cream-200 dark:hover:from-wood-700/50 dark:hover:to-cream-700/50 transition-all duration-300 hover-lift">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-wood-600" />
                  <span className="text-sm font-medium text-foreground">Lập lịch tuần</span>
                </div>
              </button>
              <button className="w-full p-3 text-left bg-gradient-to-r from-mint-100 to-sage-100 dark:from-mint-800/50 dark:to-sage-800/50 rounded-xl hover:from-mint-200 hover:to-sage-200 dark:hover:from-mint-700/50 dark:hover:to-sage-700/50 transition-all duration-300 hover-lift">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-mint-600" />
                  <span className="text-sm font-medium text-foreground">Danh sách mua sắm</span>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}