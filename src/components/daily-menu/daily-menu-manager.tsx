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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Trở ra
                  </span>
                </Link>

                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

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
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
