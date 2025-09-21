"use client";

import TodayMenu from "@/components/today-menu";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TodayMenu />
      </div>
    </div>
  );
}
