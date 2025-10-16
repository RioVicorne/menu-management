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
  TrendingUp,
  Sparkles,
  BarChart3,
  Clock
} from "lucide-react";
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar";
import { getCalendarData } from "@/lib/api";
import { HydrationBoundary } from "@/components/hydration-boundary";
import StatsTab from "@/components/daily-menu/stats-tab";
import { getDishes, getRecipeForDish } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


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
    <div className="space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 gradient-primary rounded-3xl shadow-soft">
              <CalendarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
                Lịch thực đơn
              </h1>
              <p className="text-muted-foreground">
                Lập kế hoạch và quản lý thực đơn hàng ngày
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="flex space-x-2 glass-card p-2 rounded-2xl">
            <Button
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('calendar')}
              className="px-6 py-3"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Lịch thực đơn
            </Button>
            <Button
              variant={activeTab === 'stats' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('stats')}
              className="px-6 py-3"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Thống kê
            </Button>
          </div>
        </div>

        {/* Stats Cards - only show on calendar tab */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="culinary" className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tổng món</p>
                    <p className="text-2xl font-bold text-foreground">{totalDishes}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-wood-500 to-wood-600 shadow-soft">
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="culinary" className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Ngày có thực đơn</p>
                    <p className="text-2xl font-bold text-foreground">{events.length}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-soft">
                    <CalendarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="culinary" className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tháng này</p>
                    <p className="text-sm font-semibold text-foreground">
                      {format(currentDate, "MMMM yyyy", { locale: vi })}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 shadow-soft">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Section */}
        {activeTab === 'calendar' ? (
          <Card variant="modern" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sage-600" />
                Lịch thực đơn hàng tháng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HydrationBoundary
                fallback={
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-sage-600 mx-auto" />
                      <p className="text-muted-foreground">Đang tải lịch thực đơn...</p>
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
            </CardContent>
          </Card>
        ) : (
          <Card variant="modern" className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sage-600" />
                Thống kê và phân tích
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatsTab
                monthEvents={events}
                yearEvents={yearEvents}
                currentDate={currentDate}
                topDishes={topDishes}
                topIngredients={topIngredients}
              />
            </CardContent>
          </Card>
        )}
    </div>
  );
}
