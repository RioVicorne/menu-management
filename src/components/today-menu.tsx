"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChefHat, Users, Zap, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { getCalendarData, getMenuItems } from "@/lib/api";

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

interface TodayMenuProps {
  className?: string;
}

export default function TodayMenu({ className = "" }: TodayMenuProps) {
  const router = useRouter();
  const [menuData, setMenuData] = useState<TodayMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                description: "Món ăn trong thực đơn hôm nay",
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
              calories: item.calories || 300,
              servings: item.boi_so || 2,
              category: item.danh_muc || "Món chính",
              description: item.ghi_chu || `Món ăn trong thực đơn ngày ${todayString}`,
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
              setMenuData({
                date: todayString,
                totalDishes: todayData.dishCount,
                totalCalories: todayData.dishCount * 300,
                totalServings: todayData.dishCount * 2,
                dishes: Array.from({ length: todayData.dishCount }, (_, i) => ({
                  id: `dish-${i + 1}`,
                  name: `Món ăn ${i + 1}`,
                  calories: 300,
                  servings: 2,
                  category: "Món chính",
                  description: "Món ăn trong thực đơn hôm nay",
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

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Tổng calo
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {menuData.totalCalories}
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

      {/* Dishes List */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Danh sách món ăn
        </h3>
        <div className="space-y-4">
          {menuData.dishes.map((dish, index) => (
            <div
              key={dish.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {dish.name}
                    </h4>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                      {dish.category}
                    </span>
                  </div>
                  {dish.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dish.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Calo</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {dish.calories}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Khẩu phần</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {dish.servings}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <Clock className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
