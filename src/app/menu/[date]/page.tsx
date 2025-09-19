"use client";

import { use } from "react";
import { DailyMenuManager } from "@/components/daily-menu/daily-menu-manager";
import { HydrationBoundary } from "@/components/hydration-boundary";

interface DailyMenuPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default function DailyMenuPage({ params }: DailyMenuPageProps) {
  const { date } = use(params);

  return (
    <HydrationBoundary
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading menu...</p>
          </div>
        </div>
      }
    >
      <DailyMenuManager selectedDate={date} />
    </HydrationBoundary>
  );
}
