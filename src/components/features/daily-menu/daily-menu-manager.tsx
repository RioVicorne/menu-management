"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Utensils, Plus } from "lucide-react";
import Link from "next/link";
import { MenuProvider, useMenu } from "@/contexts/menu-context";
import TodaysMenuTab from "./todays-menu-tab";
import AddDishTab from "./add-dish-tab";

interface DailyMenuManagerProps {
  selectedDate: string;
}

type TabType = "menu" | "add-dish";

function DailyMenuContent({ selectedDate }: DailyMenuManagerProps) {
  const { } = useMenu();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("menu");

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["menu", "add-dish"].includes(tab)) {
      setActiveTab(
        tab as TabType
      
      );
    }
  }, [searchParams]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const tabs = [
    { id: "menu" as TabType, label: "Thực đơn hôm nay", icon: Utensils },
    { id: "add-dish" as TabType, label: "Thêm", icon: Plus },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Trở ra</span>
            </Link>
            <span className="h-4 w-px bg-border" />
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-foreground">
                {formatDate(selectedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="inline-flex rounded-lg border bg-card p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="w-full">
          <div className="rounded-xl border bg-card p-4 md:p-6">
            {activeTab === "menu" && (
              <TodaysMenuTab
                onAddDish={() => {
                  setActiveTab("add-dish");
                }}
              />
            )}
            {activeTab === "add-dish" && (
              <AddDishTab onDishAdded={() => setActiveTab("menu")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DailyMenuManager({ selectedDate }: DailyMenuManagerProps) {
  return (
    <MenuProvider selectedDate={selectedDate}>
      <DailyMenuContent selectedDate={selectedDate} />
    </MenuProvider>
  );
}
