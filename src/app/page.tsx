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
  Bell
} from "lucide-react";
import TodayMenu from "@/components/today-menu";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getMenuItems, getCalendarData, getRecipeForDish } from "@/lib/api";

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
          const count = cal && cal.length > 0 ? Number((cal[0] as any)?.dishCount || 0) : 0;
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
          const dishCount = Array.isArray(cal) ? cal.reduce((sum, item: any) => sum + Number(item?.dishCount || 0), 0) : 0;
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
        const recipeCache = new Map<string, any[]>();
        let used = 0;
        const promises = items.map(async (it: any) => {
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
    { label: "Món ăn hôm nay", value: String(todayDishCount), icon: ChefHat, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Nguyên liệu trong kho", value: String(inventoryCount), icon: Package, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    { label: "Cần mua sắm", value: String(shoppingCount), icon: ShoppingCart, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    { label: "Người ăn", value: String(todayServingCount), icon: Users, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" }
  ];

  return (
    <div className="space-y-6">
      {/* Today's Menu - moved to top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TodayMenu />
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Summary Stats (moved to right) */}
          <div className="card-modern p-4">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-gray-200/40 dark:border-slate-700/40 hover-lift">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-2.5 rounded-xl`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Notifications */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thông báo
              </h3>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Cần bổ sung nguyên liệu
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {shoppingCount} nguyên liệu sắp hết
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Thực đơn tuần tới
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Chưa lập kế hoạch
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thống kê tuần
              </h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Món ăn đã nấu</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{weeklyDishCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nguyên liệu đã dùng</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{weeklyIngredientUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Chi phí ước tính</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{weeklyEstimatedCost === 0 ? "—" : weeklyEstimatedCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      

      

      
    </div>
  );
}
