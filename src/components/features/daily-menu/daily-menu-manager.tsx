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
      setActiveTab(tab as TabType);
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
    { id: "add-dish" as TabType, label: "Thêm món", icon: Plus },
  ];

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-10 bg-background min-h-dvh">
      <div className="min-h-dvh px-4 sm:px-6 lg:px-8 flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-border">
          <div className="w-full">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/menu"
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Trở ra
                  </span>
                </Link>

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h1 className="text-xl font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                    {formatDate(selectedDate)}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-background border-b border-border">
          <div className="w-full">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full py-8 flex-1">
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
  );
}

export function DailyMenuManager({ selectedDate }: DailyMenuManagerProps) {
  return (
    <MenuProvider selectedDate={selectedDate}>
      <DailyMenuContent selectedDate={selectedDate} />
    </MenuProvider>
  );
}
