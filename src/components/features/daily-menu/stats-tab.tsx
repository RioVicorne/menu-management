"use client";

import React from "react";

type StatsEvent = {
  start: Date;
  count?: number;
};

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(date: Date) {
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const day = (date.getDay() + 6) % 7; // 0..6 Monday..Sunday
  return weekdays[day];
}

function formatMonthLabel(monthIndex: number) {
  return `Th ${monthIndex + 1}`;
}

function buildWeeklyBuckets(events: StatsEvent[], currentDate: Date) {
  const start = getWeekStart(currentDate);
  const buckets = new Array(7).fill(0);
  for (const ev of events) {
    const d = new Date(ev.start);
    if (d >= start && d < new Date(start.getTime() + 7 * 86400000)) {
      const idx = (d.getDay() + 6) % 7;
      buckets[idx] += ev.count || 0;
    }
  }
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    labels.push(formatDayLabel(d));
  }
  return { labels, values: buckets };
}

function buildMonthlyBuckets(events: StatsEvent[], currentDate: Date) {
  const year = currentDate.getFullYear();
  const buckets = new Array(12).fill(0);
  for (const ev of events) {
    const d = new Date(ev.start);
    if (d.getFullYear() === year) {
      buckets[d.getMonth()] += ev.count || 0;
    }
  }
  const labels = new Array(12).fill(0).map((_, i) => formatMonthLabel(i));
  return { labels, values: buckets };
}

function BarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  const width = 520;
  const height = 180;
  const padding = 32;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / values.length - 8;

  return (
    <svg width={width} height={height} role="img" aria-label="chart" className="w-full max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {values.map((v, i) => {
        const h = (v / max) * chartHeight;
        const x = padding + i * (chartWidth / values.length) + 4;
        const y = padding + (chartHeight - h);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={4}
              className="fill-blue-500 dark:fill-blue-400"
            />
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-gray-600 dark:fill-gray-300 text-xs">
              {labels[i]}
            </text>
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200 text-xs">
              {v}
            </text>
          </g>
        );
      })}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-gray-300 dark:stroke-gray-600" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="stroke-gray-300 dark:stroke-gray-600" />
    </svg>
  );
}

export default function StatsTab({ monthEvents, yearEvents, currentDate, topDishes, topIngredients }: { monthEvents: StatsEvent[]; yearEvents: StatsEvent[]; currentDate: Date; topDishes: { name: string; count: number }[]; topIngredients: { name: string; count: number }[] }) {
  const weekly = React.useMemo(() => buildWeeklyBuckets(monthEvents, currentDate), [monthEvents, currentDate]);
  const monthly = React.useMemo(() => buildMonthlyBuckets(yearEvents, currentDate), [yearEvents, currentDate]);

  const weeklyBestIdx = React.useMemo(() => {
    let idx = 0;
    let best = -1;
    weekly.values.forEach((v, i) => {
      if (v > best) {
        best = v;
        idx = i;
      }
    });
    return idx;
  }, [weekly]);

  const monthlyBestIdx = React.useMemo(() => {
    let idx = 0;
    let best = -1;
    monthly.values.forEach((v, i) => {
      if (v > best) {
        best = v;
        idx = i;
      }
    });
    return idx;
  }, [monthly]);

  return (
    <div className="space-y-8">
      <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Thống kê theo tuần</h3>
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Tuần cao nhất: {weekly.labels[weeklyBestIdx]} ({weekly.values[weeklyBestIdx]})
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-4">Số món mỗi ngày trong tuần hiện tại</div>
        <BarChart labels={weekly.labels} values={weekly.values} />
        <div className="mt-3 text-xs text-muted-foreground">Chú thích: Cột xanh là số món trong ngày. Huy hiệu hiển thị ngày cao nhất trong tuần.</div>
      </div>

      <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Thống kê theo tháng</h3>
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            Tháng nhiều nhất: {monthly.labels[monthlyBestIdx]} ({monthly.values[monthlyBestIdx]})
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-4">Tổng số món theo tháng trong năm hiện tại</div>
        <BarChart labels={monthly.labels} values={monthly.values} />
        <div className="mt-3 text-xs text-muted-foreground">Chú thích: Cột xanh là tổng món mỗi tháng. Huy hiệu hiển thị tháng cao nhất.</div>
      </div>

      <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Bảng xếp hạng món trong tháng</h3>
        {topDishes.length === 0 ? (
          <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
        ) : (
          <ol className="space-y-2">
            {topDishes.map((d, i) => (
              <li key={i} className="flex items-center justify-between bg-muted border border-border rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-800' : i === 2 ? 'bg-amber-600 text-white' : 'bg-blue-100 text-blue-700'}`}>{i + 1}</span>
                  <span className="text-sm text-foreground">{d.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{d.count} Lần</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Nguyên liệu dùng nhiều trong tháng</h3>
        {topIngredients.length === 0 ? (
          <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
        ) : (
          <ol className="space-y-2">
            {topIngredients.map((d, i) => (
              <li key={i} className="flex items-center justify-between bg-muted border border-border rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${i === 0 ? 'bg-emerald-400 text-emerald-900' : i === 1 ? 'bg-emerald-200 text-emerald-900' : i === 2 ? 'bg-teal-400 text-teal-900' : 'bg-green-100 text-green-700'}`}>{i + 1}</span>
                  <span className="text-sm text-foreground">{d.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{d.count} Lần</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}


