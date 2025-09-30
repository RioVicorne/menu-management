"use client";

import { useCallback, useState, useEffect } from "react";
import { format } from "date-fns/format";
import { vi } from "date-fns/locale/vi";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  Calendar as CalendarIcon,
  ChefHat,
  Users,
  Loader2,
} from "lucide-react";
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar";
import { getCalendarData } from "@/lib/api";
import { HydrationBoundary } from "@/components/hydration-boundary";
import StatsTab from "@/components/daily-menu/stats-tab";
import { getDishes, getRecipeForDish } from "@/lib/api";


interface Event {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  count?: number;
  // Keep the original ISO date string to avoid timezone-related off-by-one issues
  dateIso?: string;
}

export default function MenuPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [yearEvents, setYearEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [totalDishes, setTotalDishes] = useState(0);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const [topDishes, setTopDishes] = useState<{ name: string; count: number }[]>([]);
  const [topIngredients, setTopIngredients] = useState<{ name: string; count: number }[]>([]);

  const loadRange = useCallback(
    async (start: Date, end: Date) => {
      try {
        const formatLocal = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        const from = formatLocal(start);
        const to = formatLocal(end);

        if (!supabase) {
          // Use API function when Supabase is not available
          const data = await getCalendarData(from, to);
          setEvents(
            data.map((item) => ({
              start: new Date(item.date as string),
              end: new Date(item.date as string),
              title: `${Number(item.dishCount || 0)} dishes`,
              count: Number(item.dishCount || 0),
              allDay: true,
              dateIso: String(item.date || ""),
            })),
          );
          return;
        }

        const { data, error } = await supabase
          .from("thuc_don")
          .select("ngay")
          .gte("ngay", from)
          .lte("ngay", to);

        if (error) {
          logger.error("Database error:", error);
          // Fallback to API function when database fails
          const data = await getCalendarData(from, to);
          setEvents(
            data.map((item) => ({
              start: new Date(item.date as string),
              end: new Date(item.date as string),
              title: `${Number(item.dishCount || 0)} dishes`,
              count: Number(item.dishCount || 0),
              allDay: true,
              dateIso: String(item.date || ""),
            })),
          );
          return;
        }

        // Count per day and create all-day events
        const map = new Map<string, number>();
        for (const row of data ?? []) {
          const k = String(row.ngay);
          map.set(k, (map.get(k) ?? 0) + 1);
        }

        const evs: Event[] = Array.from(map.entries()).map(([iso, count]) => {
          const d = new Date(iso);
          const title = `${count} món`;
          return {
            title,
            start: d,
            end: d,
            allDay: true,
            count,
            dateIso: iso,
          };
        });
        setEvents(evs);
        setTotalDishes(evs.reduce((sum, event) => sum + (event.count || 0), 0));
      } catch (error) {
        logger.error("Error loading events:", error);
        setEvents([]);
      }
    },
    [],
  );

  const loadYearAndTop = useCallback(
    async (year: number, monthStart: Date, monthEnd: Date) => {
      try {
        // Year events for monthly chart
        if (!supabase) {
          setYearEvents([]);
          setTopDishes([]);
          return;
        }

        const yFrom = `${year}-01-01`;
        const yTo = `${year}-12-31`;
        const { data: yearData, error: yearErr } = await supabase
          .from("thuc_don")
          .select("ngay")
          .gte("ngay", yFrom)
          .lte("ngay", yTo);
        if (yearErr) throw yearErr;

        const yearMap = new Map<string, number>();
        for (const row of yearData ?? []) {
          const k = String(row.ngay);
          yearMap.set(k, (yearMap.get(k) ?? 0) + 1);
        }
        const yEvents: Event[] = Array.from(yearMap.entries()).map(([iso, count]) => ({
          title: `${count} món`,
          start: new Date(iso),
          end: new Date(iso),
          allDay: true,
          count,
        }));
        setYearEvents(yEvents);

        // Top dishes in current month
        const formatLocal = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        const mFrom = formatLocal(monthStart);
        const mTo = formatLocal(monthEnd);
        const { data: monthRows, error: monthErr } = await supabase
          .from("thuc_don")
          .select("ma_mon_an")
          .gte("ngay", mFrom)
          .lte("ngay", mTo);
        if (monthErr) throw monthErr;

        const counts = new Map<string, number>();
        for (const r of monthRows ?? []) {
          const id = String(r.ma_mon_an);
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }

        const dishes = await getDishes();
        const idToName = new Map(dishes.map((d) => [d.id, d.ten_mon_an] as const));
        const ranking = Array.from(counts.entries())
          .map(([id, count]) => ({ name: idToName.get(id) || `Món ${id}`, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopDishes(ranking);

        // Ingredient ranking for the month
        const uniqueDishIds = Array.from(counts.keys());
        const recipes = await Promise.all(
          uniqueDishIds.map(async (dishId) => {
            try {
              const items = await getRecipeForDish(dishId);
              return { dishId, items };
            } catch {
              return { dishId, items: [] } as const;
            }
          }),
        );

        const ingredientCounts = new Map<string, { name: string; count: number }>();
        for (const { dishId, items } of recipes) {
          const times = counts.get(dishId) || 0;
          for (const it of items) {
            const key = String(it.ma_nguyen_lieu);
            const name = it.ten_nguyen_lieu || key;
            const prev = ingredientCounts.get(key)?.count || 0;
            ingredientCounts.set(key, { name, count: prev + times });
          }
        }

        const ingRanking = Array.from(ingredientCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopIngredients(ingRanking);
      } catch (err) {
        logger.error("Error loading yearly stats:", err);
        setYearEvents([]);
        setTopDishes([]);
        setTopIngredients([]);
      }
    },
    [],
  );

  // Handle month change from calendar navigation
  const handleMonthChange = useCallback((year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
  }, []);





  // Load initial data
  useEffect(() => {
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
    loadRange(start, end);
    loadYearAndTop(currentDate.getFullYear(), start, end);
  }, [currentDate, loadRange, loadYearAndTop]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Thực đơn
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Lập kế hoạch thực đơn và quản lý kho
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Lịch thực đơn
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Thống kê
            </button>
          </div>

          {/* Stats Cards - only show on calendar tab */}
          {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tổng món
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalDishes}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ngày có thực đơn
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {events.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tháng này
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {format(currentDate, "MMMM yyyy", {
                      locale: vi,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Content Section */}
        {activeTab === 'calendar' ? (
          <HydrationBoundary
            fallback={
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              </div>
            }
          >
            <MonthlyCalendar
              menuData={events.map((event) => ({
                // Prefer the original ISO date string to avoid timezone drift
                date: (event.dateIso || event.start.toISOString()).split("T")[0],
                dishCount: event.count || 0,
                totalCalories: (event.count || 0) * 300, // Mock calories
                totalServings: (event.count || 0) * 2, // Mock servings
              }))}
              onDateClick={(date) => {
                const d = new Date(date);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                router.push(`/menu/${y}-${m}-${day}`);
              }}
              onMonthChange={handleMonthChange}
            />
          </HydrationBoundary>
        ) : (
          <StatsTab
            monthEvents={events}
            yearEvents={yearEvents}
            currentDate={currentDate}
            topDishes={topDishes}
            topIngredients={topIngredients}
          />
        )}

        {/* Legend - only show on calendar tab */}
        {activeTab === 'calendar' && events.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Chú thích
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  1-2 món
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  3-4 món
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  5+ món
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
