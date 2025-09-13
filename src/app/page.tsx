"use client";

import { useCallback, useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { vi } from "date-fns/locale/vi";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, Plus, ChefHat, Users, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n";
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar";
import { getCalendarData } from "@/lib/api";
import { HydrationBoundary } from "@/components/hydration-boundary";
import MockDataNotice from "@/components/mock-data-notice";

const locales = { "en-US": enUS, vi } as const;
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface Event {
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	count?: number;
}

export default function CalendarDashboardPage() {
	const { t, lang } = useI18n();
	const router = useRouter();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [totalDishes, setTotalDishes] = useState(0);

	const loadRange = useCallback(async (start: Date, end: Date) => {
		setLoading(true);
		try {
			const from = start.toISOString().slice(0, 10);
			const to = end.toISOString().slice(0, 10);
			
			if (!supabase) {
				// Use API function when Supabase is not available
				const data = await getCalendarData(from, to);
				setEvents(data.map(item => ({
					start: new Date(item.date),
					end: new Date(item.date),
					title: `${item.dishCount} dishes`,
					count: item.dishCount,
					allDay: true
				})));
				return;
			}
			
			const { data, error } = await supabase
				.from("thuc_don")
				.select("ngay")
				.gte("ngay", from)
				.lte("ngay", to);
			
			if (error) { 
				console.error(error); 
				setEvents([]); 
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
				const title = lang === 'vi' ? `${count} món` : `${count} dish${count > 1 ? 'es' : ''}`;
				return { 
					title, 
					start: d, 
					end: d, 
					allDay: true,
					count 
				};
			});
			setEvents(evs);
			setTotalDishes(evs.reduce((sum, event) => sum + (event.count || 0), 0));
		} catch (error) {
			console.error("Error loading events:", error);
			setEvents([]);
		} finally {
			setLoading(false);
		}
	}, [lang]);

	type MonthRange = { start: Date; end: Date };
	const onRangeChange = useCallback((range: Date[] | MonthRange) => {
		if (Array.isArray(range)) {
			const start = range[0];
			const end = range[range.length - 1];
			loadRange(start, end);
		} else {
			loadRange(range.start, range.end);
		}
	}, [loadRange]);

	type SlotInfo = { start: Date };
	const onSelectSlot = useCallback((slot: SlotInfo) => {
		const d = slot.start;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		router.push(`/${y}-${m}-${day}`);
	}, [router]);

	const onSelectEvent = useCallback((event: Event) => {
		const d = event.start;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		router.push(`/${y}-${m}-${day}`);
	}, [router]);

	const onNavigate = useCallback((newDate: Date) => {
		setCurrentDate(newDate);
	}, []);

	// Load initial data
	useEffect(() => {
		const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
		loadRange(start, end);
	}, [currentDate, loadRange]);

	const eventStyleGetter = (event: Event) => {
		const count = event.count || 0;
		let backgroundColor = '#3b82f6';
		
		if (count >= 5) {
			backgroundColor = '#10b981'; // Green for many dishes
		} else if (count >= 3) {
			backgroundColor = '#f59e0b'; // Orange for moderate dishes
		} else if (count >= 1) {
			backgroundColor = '#3b82f6'; // Blue for few dishes
		}

		return {
			style: {
				backgroundColor,
				borderRadius: '6px',
				opacity: 0.9,
				color: 'white',
				border: 'none',
				display: 'block',
				fontSize: '0.75rem',
				fontWeight: '500',
			}
		};
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Mock Data Notice */}
				<MockDataNotice />
				
				{/* Header Section */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center space-x-3">
							<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
								<CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
									{t("menuCalendar")}
								</h1>
								<p className="text-gray-600 dark:text-gray-400 mt-1">
									{t("planAndManage")}
								</p>
							</div>
						</div>
						<button
							onClick={() => {
								const today = new Date();
								const y = today.getFullYear();
								const m = String(today.getMonth() + 1).padStart(2, "0");
								const d = String(today.getDate()).padStart(2, "0");
								router.push(`/${y}-${m}-${d}`);
							}}
							className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
						>
							<Plus className="h-4 w-4" />
							<span>{t("addToday")}</span>
						</button>
					</div>

					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
							<div className="flex items-center">
								<div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
									<ChefHat className="h-5 w-5 text-green-600 dark:text-green-400" />
								</div>
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("totalDishes")}</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDishes}</p>
								</div>
							</div>
						</div>
						
						<div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
							<div className="flex items-center">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
									<CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								</div>
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("daysWithMenu")}</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</p>
								</div>
							</div>
						</div>

						<div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
							<div className="flex items-center">
								<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
									<Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
								</div>
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("thisMonth")}</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{format(currentDate, 'MMMM yyyy', { locale: lang === 'vi' ? vi : enUS })}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Calendar Section */}
				<HydrationBoundary fallback={
					<div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
						<div className="flex items-center justify-center h-96">
							<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						</div>
					</div>
				}>
					<MonthlyCalendar 
						menuData={events.map(event => ({
							date: event.start.toISOString().split('T')[0],
							dishCount: event.count || 0,
							totalCalories: (event.count || 0) * 300, // Mock calories
							totalServings: (event.count || 0) * 2 // Mock servings
						}))}
						onDateClick={(date) => {
							const d = new Date(date);
							const y = d.getFullYear();
							const m = String(d.getMonth() + 1).padStart(2, "0");
							const day = String(d.getDate()).padStart(2, "0");
							router.push(`/menu/${y}-${m}-${day}`);
						}}
					/>
				</HydrationBoundary>

				{/* Legend */}
				{events.length > 0 && (
					<div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("legend")}</h3>
						<div className="flex flex-wrap gap-4">
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-blue-500 rounded"></div>
								<span className="text-sm text-gray-600 dark:text-gray-400">{t("legend12")}</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-amber-500 rounded"></div>
								<span className="text-sm text-gray-600 dark:text-gray-400">{t("legend34")}</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-4 h-4 bg-green-500 rounded"></div>
								<span className="text-sm text-gray-600 dark:text-gray-400">{t("legend5plus")}</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}