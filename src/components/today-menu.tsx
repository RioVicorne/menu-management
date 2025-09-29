"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChefHat, Users, Zap, Plus } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { getCalendarData, getMenuItems, getAllIngredients, getRecipeForDish } from "@/lib/api";
import { logger } from "@/lib/logger";

interface TodayMenuDish {
  id: string;
  name: string;
  calories: number;
  servings: number;
  category: string;
  description?: string;
}

interface TodayMenuData {
  date: string;
  totalDishes: number;
  totalCalories: number;
  totalServings: number;
  dishes: TodayMenuDish[];
}

interface ShoppingItem {
  id: string;
  name: string;
  needQuantity: number; // đếm
  needWeight: number; // kg
  stockQuantity: number;
  stockWeight: number;
}

interface TodayMenuProps {
  className?: string;
}

export default function TodayMenu({ className = "" }: TodayMenuProps) {
  const router = useRouter();
  const [menuData, setMenuData] = useState<TodayMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const formatNumber = (value: number) => {
    const rounded = Math.round(Number(value || 0) * 100) / 100;
    if (Number.isNaN(rounded)) return "0";
    return Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded.toFixed(2).replace(/0+$/,'').replace(/\.$/,''));
  };
  const shortageList = useMemo(() => {
    return shopping.filter((it) => (it.needQuantity > it.stockQuantity) || (it.needWeight > it.stockWeight));
  }, [shopping]);

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");

  const handleAddDish = () => {
    // Navigate to today's menu page with add dish tab active
    router.push(`/menu/${todayString}?tab=add-dish`);
  };

  useEffect(() => {
    const fetchTodayMenu = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch today's menu data from database
        if (!supabase) {
          // Use API function when Supabase is not available
          const data = await getCalendarData(todayString, todayString);
          if (data && data.length > 0) {
            const todayData = data[0];
            const dishCount = Number(todayData.dishCount || 0);
            setMenuData({
              date: todayString,
              totalDishes: dishCount,
              totalCalories: dishCount * 300, // Mock calories per dish
              totalServings: dishCount * 2, // Mock servings per dish
              dishes: Array.from({ length: dishCount }, (_, i) => ({
                id: `dish-${i + 1}`,
                name: `Món ăn ${i + 1}`,
                calories: 300,
                servings: 2,
                category: "Món chính",
                // No default description
              })),
            });
          } else {
            setMenuData(null);
          }
          return;
        }

        // Get menu items for today using the existing API function
        try {
          const menuItems = await getMenuItems(todayString);
          
          if (menuItems && menuItems.length > 0) {
            // Process real data from database
            const dishes: TodayMenuDish[] = menuItems.map((item, index: number) => ({
              id: item.id || `dish-${index + 1}`,
              name: item.ten_mon_an || `Món ăn ${index + 1}`,
              calories: 300, // Mock calories since MenuItem doesn't have this field
              servings: item.boi_so || 2,
              category: "Món chính", // Mock category since MenuItem doesn't have this field
              description: item.ghi_chu || undefined,
            }));

            const totalDishes = dishes.length;
            const totalCalories = dishes.reduce((sum, dish) => sum + dish.calories, 0);
            const totalServings = dishes.reduce((sum, dish) => sum + dish.servings, 0);

            setMenuData({
              date: todayString,
              totalDishes,
              totalCalories,
              totalServings,
              dishes,
            });
          } else {
            // Try to get basic count from calendar data
            const data = await getCalendarData(todayString, todayString);
            if (data && data.length > 0) {
              const todayData = data[0];
              const dishCount = Number(todayData.dishCount || 0);
              setMenuData({
                date: todayString,
                totalDishes: dishCount,
                totalCalories: dishCount * 300,
                totalServings: dishCount * 2,
                dishes: Array.from({ length: dishCount }, (_, i) => ({
                  id: `dish-${i + 1}`,
                  name: `Món ăn ${i + 1}`,
                  calories: 300,
                  servings: 2,
                  category: "Món chính",
                  // No default description
                })),
              });
            } else {
              setMenuData(null);
            }
          }
        } catch (apiError) {
          logger.error("API error:", apiError);
          setMenuData(null);
        }
      } catch (err) {
        logger.error("Error fetching today menu:", err);
        setError("Không thể tải thực đơn hôm nay");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayMenu();
  }, [todayString]);

  // Build shopping list based on today's menu
  useEffect(() => {
    const buildShopping = async () => {
      try {
        if (!supabase) {
          setShopping([]);
          return;
        }

        setShoppingLoading(true);

        const menuItems = await getMenuItems(todayString);
        if (!menuItems || menuItems.length === 0) {
          setShopping([]);
          return;
        }

        // Simple cache to avoid duplicate API calls for same dish
        const recipeCache = new Map<string, any[]>();

        // Fetch all stock once
        const stockList = await getAllIngredients();
        const stockById = new Map<string, { q: number; w: number; name: string }>();
        stockList.forEach((ing) => {
          stockById.set(String(ing.id), {
            q: Number(ing.ton_kho_so_luong || 0),
            w: Number(ing.ton_kho_khoi_luong || 0),
            name: String(ing.ten_nguyen_lieu || "")
          });
        });

        // Aggregate needs by ingredient id
        const needMap = new Map<string, { name: string; q: number; w: number }>();

        // Fetch all recipes in parallel instead of sequentially
        const recipePromises = menuItems.map(item => {
          const dishId = String(item.ma_mon_an);
          if (recipeCache.has(dishId)) {
            return Promise.resolve({
              item,
              recipe: recipeCache.get(dishId)
            });
          }
          return getRecipeForDish(dishId).then(recipe => {
            recipeCache.set(dishId, recipe);
            return { item, recipe };
          });
        });
        
        const recipeResults = await Promise.all(recipePromises);
        
        for (const { item, recipe } of recipeResults) {
          if (!recipe) continue; // Skip if recipe is undefined
          const multiplier = Number(item.boi_so || 1);
          for (const comp of recipe) {
            const id = String(comp.ma_nguyen_lieu || "");
            if (!id) continue;
            const name = comp.ten_nguyen_lieu || stockById.get(id)?.name || "";
            const addQ = Number(comp.so_luong_nguyen_lieu || 0) * multiplier;
            const addW = Number(comp.khoi_luong_nguyen_lieu || 0) * multiplier;
            const prev = needMap.get(id) || { name, q: 0, w: 0 };
            prev.q += addQ;
            prev.w += addW;
            prev.name = name || prev.name;
            needMap.set(id, prev);
          }
        }

        const list: ShoppingItem[] = Array.from(needMap.entries()).map(([id, v]) => {
          const stock = stockById.get(id);
          return {
            id,
            name: v.name || stock?.name || id,
            needQuantity: Number(v.q || 0),
            needWeight: Number(v.w || 0),
            stockQuantity: Number(stock?.q || 0),
            stockWeight: Number(stock?.w || 0),
          };
        });

        // Sort: need more than stock first
        list.sort((a, b) => {
          const aShort = (a.needQuantity > a.stockQuantity) || (a.needWeight > a.stockWeight);
          const bShort = (b.needQuantity > b.stockQuantity) || (b.needWeight > b.stockWeight);
          if (aShort === bShort) return a.name.localeCompare(b.name);
          return aShort ? -1 : 1;
        });

        setShopping(list);
      } catch (e) {
        logger.error("Build shopping list failed", e);
        setShopping([]);
      } finally {
        setShoppingLoading(false);
      }
    };

    buildShopping();
  }, [todayString]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400">Đang tải thực đơn...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg w-fit mx-auto mb-4">
            <ChefHat className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Không thể tải thực đơn
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!menuData || menuData.dishes.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="text-center">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit mx-auto mb-4">
            <ChefHat className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Chưa có thực đơn hôm nay
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Hãy tạo thực đơn cho ngày hôm nay để bắt đầu
          </p>
          <button 
            onClick={handleAddDish}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo thực đơn hôm nay</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Thực đơn hôm nay
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {format(today, "EEEE, dd MMMM yyyy", { locale: vi })}
              </p>
            </div>
          </div>
          <button 
            onClick={handleAddDish}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm món</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Tổng món
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {menuData.totalDishes}
                </p>
              </div>
            </div>
          </div>


          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Số người ăn
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {menuData.totalServings}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List */}
      <div className="px-6 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hôm nay cần đi chợ gì
        </h3>
        {shoppingLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : shortageList.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Không có nguyên liệu cần mua.</p>
        ) : (
          <div className="space-y-2">
            {shortageList.map((it) => {
              const shortQty = it.needQuantity > it.stockQuantity;
              const shortW = it.needWeight > it.stockWeight;
              const needParts: string[] = [];
              const stockParts: string[] = [];
              if (it.needQuantity > 0) {
                needParts.push(String(it.needQuantity));
                stockParts.push(String(it.stockQuantity));
              }
              if (it.needWeight > 0) {
                needParts.push(`${formatNumber(it.needWeight)} kg`);
                stockParts.push(`${formatNumber(it.stockWeight)} kg`);
              }
              const shortage = shortQty || shortW;
              return (
                <div key={it.id} className={`flex items-center justify-between p-3 rounded-lg border ${shortage ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-700/40"}`}>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{it.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Cần: {needParts.join(" • ")} — Tồn: {stockParts.join(" • ")}
                    </p>
                  </div>
                  {shortage && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-400/30 dark:text-amber-200">Thiếu</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dishes List */}
      <div className="p-6 pb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Danh sách món ăn
        </h3>
        <div className="space-y-4">
          {menuData.dishes.map((dish, index) => (
            <div
              key={dish.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white whitespace-normal break-words leading-snug min-w-0">
                      {dish.name}
                    </h4>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full flex-shrink-0">
                      {dish.category}
                    </span>
                  </div>
                  {dish.description && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md whitespace-pre-wrap break-words">
                        {dish.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Right-side metrics removed per request */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
