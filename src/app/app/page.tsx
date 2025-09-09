"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS } as const;
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type Event = { title: string; start: Date; end: Date; allDay?: boolean };

export default function CalendarDashboardPage() {
	const router = useRouter();
	const [events, setEvents] = useState<Event[]>([]);

	const loadRange = useCallback(async (start: Date, end: Date) => {
		const from = start.toISOString().slice(0, 10);
		const to = end.toISOString().slice(0, 10);
		const { data, error } = await supabase
			.from("thuc_don")
			.select("ngay")
			.gte("ngay", from)
			.lte("ngay", to);
		if (error) { console.error(error); setEvents([]); return; }
		// Count per day and create all-day events
		const map = new Map<string, number>();
		for (const row of data ?? []) {
			const k = String(row.ngay);
			map.set(k, (map.get(k) ?? 0) + 1);
		}
		const evs: Event[] = Array.from(map.entries()).map(([iso, count]) => {
			const d = new Date(iso);
			return { title: `${count} dishes`, start: d, end: d, allDay: true };
		});
		setEvents(evs);
	}, []);

	const onRangeChange = useCallback((range: any, view?: View) => {
		if (Array.isArray(range)) {
			const start = range[0];
			const end = range[range.length - 1];
			loadRange(start, end);
			return;
		}
		if (range?.start && range?.end) {
			loadRange(range.start, range.end);
		}
	}, [loadRange]);

	const onSelectSlot = useCallback((slot: any) => {
		const d = slot.start as Date;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		router.push(`/app/${y}-${m}-${day}`);
	}, [router]);

	return (
		<div className="py-6">
			<h1 className="text-2xl font-semibold mb-4">Monthly Menu</h1>
			<Calendar
				localizer={localizer}
				views={[Views.MONTH]}
				defaultView={Views.MONTH}
				selectable
				events={events}
				startAccessor="start"
				endAccessor="end"
				style={{ height: 700 }}
				onRangeChange={onRangeChange}
				onSelectSlot={onSelectSlot}
			/>
		</div>
	);
}


