"use client";

import { use } from "react";
import { DailyMenuManager } from "@/components/daily-menu/daily-menu-manager";
import { HydrationBoundary } from "@/components/hydration-boundary";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DailyMenuPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default function DailyMenuPage({ params }: DailyMenuPageProps) {
  const { date } = use(params);

  return (
    <div className="animate-fade-in">
      <HydrationBoundary
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card variant="modern" className="w-full max-w-md">
              <CardContent className="p-12 text-center">
                <div className="space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-sage-600 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Đang tải thực đơn</h3>
                    <p className="text-muted-foreground">Vui lòng chờ trong giây lát...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <DailyMenuManager selectedDate={date} />
      </HydrationBoundary>
    </div>
  );
}
